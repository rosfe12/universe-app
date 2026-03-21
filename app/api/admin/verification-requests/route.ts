import { NextResponse } from "next/server";
import { z } from "zod";

import {
  insertAdminAuditLog,
  listAdminAuditLogs,
  requireAdminUser,
} from "@/app/api/admin/_utils";
import { logServerEvent } from "@/lib/ops";
import type { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const patchSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

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
      .select("id, user_id, school_id, school_email, verification_user_id")
      .eq("id", requestId)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: "인증 요청을 찾을 수 없습니다." }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === "approve") {
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
