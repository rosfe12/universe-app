import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  insertAdminAuditLog,
  listAdminAuditLogs,
  requireAdminUser,
} from "@/app/api/admin/_utils";
import { hasAppSmtpConfig, publicEnv, resolveAuthSiteUrl } from "@/lib/env";
import { sendStudentVerificationEmail } from "@/lib/email/server-mailer";
import { insertNotificationsAsSystem } from "@/lib/notifications/server-notifications";
import { logServerEvent } from "@/lib/ops";
import type { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const VERIFICATION_DOCUMENTS_BUCKET = "verification-documents";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    requestId: z.string().uuid(),
    action: z.literal("approve"),
    autoDeleteDocuments: z.boolean().optional(),
  }),
  z.object({
    requestId: z.string().uuid(),
    action: z.literal("reject"),
    reason: z.string().trim().max(500).optional(),
    autoDeleteDocuments: z.boolean().optional(),
  }),
  z.object({
    requestId: z.string().uuid(),
    action: z.literal("resend"),
  }),
]);

function buildVerificationUrl(origin: string, requestId: string, tokenHash: string, type: string) {
  const callbackUrl = new URL("/auth/school-email/callback", origin);
  callbackUrl.searchParams.set("request_id", requestId);
  callbackUrl.searchParams.set("token_hash", tokenHash);
  callbackUrl.searchParams.set("type", type);
  return callbackUrl.toString();
}

function isRateLimitError(message?: string | null) {
  return (message ?? "").toLowerCase().includes("rate limit");
}

async function updateDeliveryState(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  requestId: string,
  input: {
    deliveryMethod: "pending" | "app_smtp" | "supabase_auth";
    deliveryStatus: "pending" | "sent" | "failed" | "rate_limited";
    deliveryError?: string | null;
    deliveredAt?: string | null;
    verificationUserId?: string | null;
  },
) {
  await admin
    .from("student_verification_requests")
    .update({
      delivery_method: input.deliveryMethod,
      delivery_status: input.deliveryStatus,
      delivery_error: input.deliveryError ?? null,
      delivered_at: input.deliveredAt ?? null,
      verification_user_id: input.verificationUserId ?? undefined,
    })
    .eq("id", requestId);
}

async function deleteVerificationDocuments(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  verificationId: string,
  deletedBy: string,
) {
  const { data: documents } = await admin
    .from("verification_documents")
    .select("id, file_path, status")
    .eq("verification_id", verificationId)
    .neq("status", "deleted");

  if (!documents?.length) {
    return;
  }

  const paths = documents.map((item) => String(item.file_path));
  await admin.storage.from(VERIFICATION_DOCUMENTS_BUCKET).remove(paths).catch(() => null);
  await admin
    .from("verification_documents")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
    })
    .in("id", documents.map((item) => String(item.id)));
}

async function listVerificationRequests(admin: ReturnType<typeof createAdminSupabaseClient>) {
  const { data, error } = await admin
    .from("student_verification_requests")
    .select(`
      id,
      user_id,
      school_id,
      school_email,
      verification_user_id,
      status,
      delivery_method,
      delivery_status,
      delivery_error,
      delivered_at,
      next_path,
      requested_at,
      verified_at,
      expires_at,
      schools:school_id (
        name
      ),
      users:user_id (
        nickname,
        department,
        grade,
        trust_score,
        report_count,
        warning_count,
        student_verification_status,
        verification_state,
        verification_score,
        verification_rejection_reason,
        student_number,
        admission_year
      )
    `)
    .order("requested_at", { ascending: false })
    .limit(24);

  if (error) {
    throw error;
  }

  const requestIds = (data ?? []).map((row) => String(row.id));
  const { data: verificationRows, error: verificationError } =
    requestIds.length > 0
      ? await admin
          .from("student_verifications")
          .select("*")
          .in("request_id", requestIds)
      : { data: [], error: null };

  if (verificationError) {
    throw verificationError;
  }

  const verificationIds = (verificationRows ?? []).map((row) => String(row.id));
  const { data: documentRows, error: documentsError } =
    verificationIds.length > 0
      ? await admin
          .from("verification_documents")
          .select("*")
          .in("verification_id", verificationIds)
          .order("uploaded_at", { ascending: false })
      : { data: [], error: null };

  if (documentsError) {
    throw documentsError;
  }

  const documentsByVerificationId = new Map<string, Array<Record<string, unknown>>>();
  for (const row of documentRows ?? []) {
    const key = String(row.verification_id);
    documentsByVerificationId.set(key, [...(documentsByVerificationId.get(key) ?? []), row]);
  }

  const verificationByRequestId = new Map(
    (verificationRows ?? []).map((row) => [String(row.request_id), row]),
  );

  return Promise.all((data ?? []).map(async (row) => {
    const school = Array.isArray(row.schools) ? row.schools[0] : row.schools;
    const userProfile = Array.isArray(row.users) ? row.users[0] : row.users;
    const verification = verificationByRequestId.get(String(row.id));
    const documents = verification
      ? await Promise.all(
          (documentsByVerificationId.get(String(verification.id)) ?? []).map(async (documentRow) => {
            let fileUrl: string | undefined;
            if (documentRow.status !== "deleted") {
              const signed = await admin.storage
                .from(VERIFICATION_DOCUMENTS_BUCKET)
                .createSignedUrl(String(documentRow.file_path), 60 * 60);
              fileUrl = signed.data?.signedUrl;
            }

            return {
              id: String(documentRow.id),
              verificationId: String(documentRow.verification_id),
              userId: String(documentRow.user_id),
              documentType: String(documentRow.document_type ?? "student_proof"),
              fileName: documentRow.file_name ? String(documentRow.file_name) : undefined,
              filePath: String(documentRow.file_path),
              fileUrl,
              mimeType: documentRow.mime_type ? String(documentRow.mime_type) : undefined,
              sizeBytes:
                typeof documentRow.size_bytes === "number" ? documentRow.size_bytes : undefined,
              status:
                documentRow.status === "reviewed" || documentRow.status === "deleted"
                  ? documentRow.status
                  : "uploaded",
              notes: documentRow.notes ? String(documentRow.notes) : undefined,
              uploadedAt: String(documentRow.uploaded_at),
              reviewedAt: documentRow.reviewed_at ? String(documentRow.reviewed_at) : undefined,
              deletedAt: documentRow.deleted_at ? String(documentRow.deleted_at) : undefined,
            };
          }),
        )
      : [];

    return {
      id: String(row.id),
      userId: String(row.user_id),
      schoolId: String(row.school_id),
      schoolEmail: String(row.school_email),
      verificationUserId: row.verification_user_id
        ? String(row.verification_user_id)
        : undefined,
      status: row.status,
      deliveryMethod:
        row.delivery_method === "app_smtp" || row.delivery_method === "supabase_auth"
          ? row.delivery_method
          : "pending",
      deliveryStatus:
        row.delivery_status === "sent" ||
        row.delivery_status === "failed" ||
        row.delivery_status === "rate_limited"
          ? row.delivery_status
          : "pending",
      deliveryError: row.delivery_error ? String(row.delivery_error) : undefined,
      deliveredAt: row.delivered_at ? String(row.delivered_at) : undefined,
      nextPath: String(row.next_path ?? "/home"),
      requestedAt: String(row.requested_at),
      verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
      expiresAt: String(row.expires_at),
      schoolName: String(school?.name ?? "학교 미지정"),
      userNickname: String(userProfile?.nickname ?? "익명"),
      userDepartment: userProfile?.department
        ? String(userProfile.department)
        : undefined,
      userGrade:
        typeof userProfile?.grade === "number" ? userProfile.grade : undefined,
      trustScore:
        typeof userProfile?.trust_score === "number" ? userProfile.trust_score : 0,
      reportCount:
        typeof userProfile?.report_count === "number" ? userProfile.report_count : 0,
      warningCount:
        typeof userProfile?.warning_count === "number" ? userProfile.warning_count : 0,
      studentVerificationStatus: userProfile?.student_verification_status ?? "unverified",
      verificationState:
        verification?.verification_state ??
        userProfile?.verification_state ??
        "guest",
      verificationScore:
        typeof verification?.score === "number"
          ? verification.score
          : typeof userProfile?.verification_score === "number"
            ? userProfile.verification_score
            : 0,
      studentNumber:
        verification?.student_number
          ? String(verification.student_number)
          : userProfile?.student_number
            ? String(userProfile.student_number)
            : undefined,
      admissionYear:
        typeof verification?.admission_year === "number"
          ? verification.admission_year
          : typeof userProfile?.admission_year === "number"
            ? userProfile.admission_year
            : undefined,
      decisionReason: verification?.decision_reason ? String(verification.decision_reason) : undefined,
      rejectionReason:
        verification?.rejection_reason
          ? String(verification.rejection_reason)
          : userProfile?.verification_rejection_reason
            ? String(userProfile.verification_rejection_reason)
            : undefined,
      autoChecks: Array.isArray(verification?.auto_checks)
        ? verification.auto_checks.map((item: unknown) => ({
            code: String((item as Record<string, unknown>).code ?? ""),
            label: String((item as Record<string, unknown>).label ?? ""),
            passed: Boolean((item as Record<string, unknown>).passed),
            weight:
              typeof (item as Record<string, unknown>).weight === "number"
                ? Number((item as Record<string, unknown>).weight)
                : 0,
            detail:
              typeof (item as Record<string, unknown>).detail === "string"
                ? String((item as Record<string, unknown>).detail)
                : undefined,
          }))
        : [],
      documents,
    };
  }));
}

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdminUser(request);
    const requests = await listVerificationRequests(admin);
    return NextResponse.json({ requests });
  } catch (error) {
    logServerEvent("error", "admin_verification_request_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "관리자 요청을 처리할 수 없습니다." },
      { status: 403 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { admin, user } = await requireAdminUser(request);
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const { requestId, action } = parsed.data;
    const { data: target, error: targetError } = await admin
      .from("student_verification_requests")
      .select("id, user_id, school_id, school_email, verification_user_id, next_path")
      .eq("id", requestId)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: "인증 요청을 찾을 수 없습니다." }, { status: 404 });
    }

    const { data: verification, error: verificationError } = await admin
      .from("student_verifications")
      .select("id, verification_state, decision_reason, rejection_reason")
      .eq("request_id", target.id)
      .maybeSingle();

    if (verificationError) {
      return NextResponse.json({ error: "학생 인증 상세를 찾을 수 없습니다." }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === "resend") {
      const requestedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await admin
        .from("student_verification_requests")
        .update({
          status: "pending",
          requested_at: requestedAt,
          expires_at: expiresAt,
          delivery_method: "pending",
          delivery_status: "pending",
          delivery_error: null,
          delivered_at: null,
        })
        .eq("id", target.id);

      if (verification?.id) {
        await admin
          .from("student_verifications")
          .update({
            verification_state: "guest",
            score: 0,
            requires_document_upload: false,
            auto_checks: [],
            decision_reason: "학교 메일 재확인 대기",
            rejection_reason: null,
            requested_at: requestedAt,
            email_verified_at: null,
            reviewed_at: null,
            reviewed_by: null,
          })
          .eq("id", verification.id);
      }

      const origin = resolveAuthSiteUrl(new URL(request.url).origin);

      if (hasAppSmtpConfig()) {
        if (target.verification_user_id && target.verification_user_id !== target.user_id) {
          await admin.auth.admin.deleteUser(target.verification_user_id).catch(() => null);
        }

        const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
          type: "signup",
          email: target.school_email,
          password: `${randomUUID()}${randomUUID()}`,
          options: {
            data: {
              univers_student_verification: true,
              verification_request_id: target.id,
            },
          },
        });

        if (linkError || !linkData?.properties?.hashed_token || !linkData.user?.id) {
          await updateDeliveryState(admin, target.id, {
            deliveryMethod: "app_smtp",
            deliveryStatus: "failed",
            deliveryError: linkError?.message ?? "학교 메일 인증 링크를 생성할 수 없습니다.",
          });
          return NextResponse.json(
            { error: linkError?.message ?? "재발송 링크를 생성할 수 없습니다." },
            { status: 500 },
          );
        }

        const verificationUrl = buildVerificationUrl(
          origin,
          target.id,
          linkData.properties.hashed_token,
          linkData.properties.verification_type,
        );

        try {
          await sendStudentVerificationEmail({
            toEmail: target.school_email,
            verificationUrl,
          });
        } catch (error) {
          await admin.auth.admin.deleteUser(linkData.user.id).catch(() => null);
          await updateDeliveryState(admin, target.id, {
            deliveryMethod: "app_smtp",
            deliveryStatus: "failed",
            deliveryError: error instanceof Error ? error.message : "학교 메일 발송에 실패했습니다.",
          });

          return NextResponse.json(
            { error: error instanceof Error ? error.message : "학교 메일 발송에 실패했습니다." },
            { status: 500 },
          );
        }

        await updateDeliveryState(admin, target.id, {
          deliveryMethod: "app_smtp",
          deliveryStatus: "sent",
          deliveryError: null,
          deliveredAt: new Date().toISOString(),
          verificationUserId: linkData.user.id,
        });
      } else {
        if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          return NextResponse.json({ error: "Supabase 설정이 필요합니다." }, { status: 500 });
        }

        const callbackUrl = new URL("/auth/school-email/callback", origin);
        callbackUrl.searchParams.set("request_id", target.id);

        const authClient = createClient(
          publicEnv.NEXT_PUBLIC_SUPABASE_URL,
          publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
              detectSessionInUrl: false,
            },
          },
        );

        const { error: otpError } = await authClient.auth.signInWithOtp({
          email: target.school_email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: callbackUrl.toString(),
          },
        });

        if (otpError) {
          await updateDeliveryState(admin, target.id, {
            deliveryMethod: "supabase_auth",
            deliveryStatus: isRateLimitError(otpError.message) ? "rate_limited" : "failed",
            deliveryError: otpError.message,
          });

          return NextResponse.json(
            { error: otpError.message ?? "학교 메일 재발송에 실패했습니다." },
            { status: isRateLimitError(otpError.message) ? 429 : 500 },
          );
        }

        await updateDeliveryState(admin, target.id, {
          deliveryMethod: "supabase_auth",
          deliveryStatus: "sent",
          deliveryError: null,
          deliveredAt: new Date().toISOString(),
        });
      }

      await insertAdminAuditLog(admin, {
        adminUserId: user.id,
        action: "verification_resent",
        targetType: "verification_request",
        targetId: target.id,
        summary: `${target.school_email} 인증 메일을 다시 발송했습니다.`,
        metadata: {
          requestId: target.id,
          userId: target.user_id,
          schoolId: target.school_id,
        },
      }).catch(() => null);
    } else if (action === "approve") {
      const autoDeleteDocuments = parsed.data.autoDeleteDocuments ?? true;
      const [{ error: userError }, { error: requestError }, verificationUpdate] = await Promise.all([
        admin
          .from("users")
          .update({
            school_id: target.school_id,
            school_email: target.school_email,
            verification_state: "student_verified",
            verification_reviewed_at: now,
            verification_rejection_reason: null,
            verification_score: 100,
            student_verification_status: "verified",
            school_email_verified_at: now,
            verified: true,
          })
          .eq("id", target.user_id),
        admin
          .from("student_verification_requests")
          .update({
            status: "verified",
            verified_at: now,
          })
          .eq("id", target.id),
        verification?.id
          ? admin
              .from("student_verifications")
              .update({
                verification_state: "student_verified",
                requires_document_upload: false,
                reviewed_at: now,
                reviewed_by: user.id,
                rejection_reason: null,
                decision_reason:
                  verification.decision_reason ??
                  "관리자 검수로 학생 인증이 승인되었습니다.",
              })
              .eq("id", verification.id)
          : Promise.resolve({ error: null }),
      ]);

      if (userError || requestError || verificationUpdate.error) {
        return NextResponse.json(
          {
            error:
              userError?.message ??
              requestError?.message ??
              verificationUpdate.error?.message ??
              "인증 승인에 실패했습니다.",
          },
          { status: 500 },
        );
      }

      if (verification?.id && autoDeleteDocuments) {
        await deleteVerificationDocuments(admin, verification.id, user.id);
      }

      await insertNotificationsAsSystem(
        [
          {
            user_id: target.user_id,
            type: "verification_approved",
            title: "대학생 인증이 승인되었어요",
            body: "학생 인증이 완료되어 글쓰기, 댓글, 쪽지와 채팅까지 사용할 수 있습니다.",
            href: "/profile",
            target_type: "verification",
            target_id: target.id,
            source_kind: "system",
            delivery_mode: "instant",
            metadata: {
              requestId: target.id,
              schoolId: target.school_id,
            },
          },
        ],
        { admin },
      ).catch((notificationError) => {
        console.error("[admin] failed to create verification notification", notificationError);
      });

      await insertAdminAuditLog(admin, {
        adminUserId: user.id,
        action: "verification_approved",
        targetType: "verification_request",
        targetId: target.id,
        summary: `${target.school_email} 인증 요청을 승인했습니다.`,
        metadata: {
          requestId: target.id,
          userId: target.user_id,
          schoolId: target.school_id,
        },
      }).catch(() => null);
    } else {
      const rejectionReason = parsed.data.reason?.trim() || "학생 확인 자료가 부족하거나 학교 규칙과 일치하지 않았습니다.";
      const autoDeleteDocuments = parsed.data.autoDeleteDocuments ?? false;
      const [{ error: userError }, { error: requestError }, verificationUpdate] = await Promise.all([
        admin
          .from("users")
          .update({
            verification_state: "rejected",
            verification_reviewed_at: now,
            verification_rejection_reason: rejectionReason,
            student_verification_status: "rejected",
            school_email_verified_at: now,
            verified: false,
          })
          .eq("id", target.user_id),
        admin
          .from("student_verification_requests")
          .update({
            status: "cancelled",
            verified_at: null,
          })
          .eq("id", target.id),
        verification?.id
          ? admin
              .from("student_verifications")
              .update({
                verification_state: "rejected",
                reviewed_at: now,
                reviewed_by: user.id,
                rejection_reason: rejectionReason,
                decision_reason: verification?.decision_reason ?? rejectionReason,
              })
              .eq("id", verification.id)
          : Promise.resolve({ error: null }),
      ]);

      if (target.verification_user_id && target.verification_user_id !== target.user_id) {
        await admin.auth.admin.deleteUser(target.verification_user_id).catch(() => null);
      }

      if (userError || requestError || verificationUpdate.error) {
        return NextResponse.json(
          {
            error:
              userError?.message ??
              requestError?.message ??
              verificationUpdate.error?.message ??
              "인증 반려에 실패했습니다.",
          },
          { status: 500 },
        );
      }

      if (verification?.id && autoDeleteDocuments) {
        await deleteVerificationDocuments(admin, verification.id, user.id);
      }

      await insertAdminAuditLog(admin, {
        adminUserId: user.id,
        action: "verification_rejected",
        targetType: "verification_request",
        targetId: target.id,
        summary: `${target.school_email} 인증 요청을 반려했습니다.`,
        metadata: {
          requestId: target.id,
          userId: target.user_id,
          schoolId: target.school_id,
          rejectionReason,
        },
      }).catch(() => null);
    }

    const requests = await listVerificationRequests(admin);
    const auditLogs = await listAdminAuditLogs(admin).catch(() => []);
    return NextResponse.json({ ok: true, requests, auditLogs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "관리자 요청을 처리할 수 없습니다." },
      { status: 403 },
    );
  }
}
