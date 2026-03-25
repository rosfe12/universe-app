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
import { logServerEvent } from "@/lib/ops";
import type { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    requestId: z.string().uuid(),
    action: z.literal("approve"),
  }),
  z.object({
    requestId: z.string().uuid(),
    action: z.literal("reject"),
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
        student_verification_status
      )
    `)
    .order("requested_at", { ascending: false })
    .limit(24);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const school = Array.isArray(row.schools) ? row.schools[0] : row.schools;
    const userProfile = Array.isArray(row.users) ? row.users[0] : row.users;

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
    };
  });
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
      const [{ error: userError }, { error: requestError }] = await Promise.all([
        admin
          .from("users")
          .update({
            school_id: target.school_id,
            school_email: target.school_email,
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
      ]);

      if (userError || requestError) {
        return NextResponse.json(
          { error: userError?.message ?? requestError?.message ?? "인증 승인에 실패했습니다." },
          { status: 500 },
        );
      }

      const { error: notificationError } = await admin
        .from("notifications")
        .insert({
          user_id: target.user_id,
          type: "verification_approved",
          title: "학교 메일 인증이 승인되었어요",
          body: "대학생 전용 기능이 열렸습니다. 강의평, 수강신청 교환, 미팅 기능을 바로 이용할 수 있어요.",
          href: "/profile",
          target_type: "verification",
          target_id: target.id,
          source_kind: "system",
          delivery_mode: "instant",
          metadata: {
            requestId: target.id,
            schoolId: target.school_id,
          },
        });

      if (notificationError) {
        console.error("[admin] failed to create verification notification", notificationError);
      }

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
      const [{ error: userError }, { error: requestError }] = await Promise.all([
        admin
          .from("users")
          .update({
            student_verification_status: "rejected",
            school_email_verified_at: null,
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
      ]);

      if (target.verification_user_id && target.verification_user_id !== target.user_id) {
        await admin.auth.admin.deleteUser(target.verification_user_id).catch(() => null);
      }

      if (userError || requestError) {
        return NextResponse.json(
          { error: userError?.message ?? requestError?.message ?? "인증 반려에 실패했습니다." },
          { status: 500 },
        );
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
