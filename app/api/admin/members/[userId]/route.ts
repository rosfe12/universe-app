import { NextResponse } from "next/server";

import { listAdminAuditLogs, requireAdminUser } from "@/app/api/admin/_utils";
import { logServerEvent } from "@/lib/ops";
import type { AdminMemberDetail } from "@/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { admin } = await requireAdminUser(request);
    const { userId } = await params;

    const [
      authUserResult,
      profileResult,
      roleResult,
      postsResult,
      commentsResult,
      reportsResult,
      studentVerificationsResult,
      auditLogs,
    ] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin
        .from("users")
        .select(
          "id, email, nickname, name, user_type, school_id, department, grade, verified, adult_verified, student_verification_status, verification_state, verification_score, verification_rejection_reason, student_number, admission_year, school_email, trust_score, report_count, warning_count, is_restricted, created_at",
        )
        .eq("id", userId)
        .maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      admin
        .from("posts")
        .select(
          "id, title, category, subcategory, created_at, comment_count, like_count, view_count, admin_hidden, auto_hidden",
        )
        .eq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      admin
        .from("comments")
        .select("id, post_id, content, created_at, admin_hidden, auto_hidden")
        .eq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      admin
        .from("reports")
        .select("id, reason, status, target_type, target_id, created_at, memo")
        .eq("target_id", userId)
        .eq("target_type", "user")
        .order("created_at", { ascending: false })
        .limit(8),
      admin
        .from("student_verifications")
        .select("*")
        .eq("user_id", userId)
        .order("requested_at", { ascending: false })
        .limit(5),
      listAdminAuditLogs(admin),
    ]);

    if (authUserResult.error) {
      throw authUserResult.error;
    }
    if (profileResult.error) {
      throw profileResult.error;
    }
    if (roleResult.error) {
      throw roleResult.error;
    }
    if (postsResult.error) {
      throw postsResult.error;
    }
    if (commentsResult.error) {
      throw commentsResult.error;
    }
    if (reportsResult.error) {
      throw reportsResult.error;
    }
    if (studentVerificationsResult.error) {
      throw studentVerificationsResult.error;
    }

    if (!profileResult.data) {
      return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
    }

    const schoolId = profileResult.data.school_id ? String(profileResult.data.school_id) : undefined;
    const postIds = Array.from(
      new Set((commentsResult.data ?? []).map((item) => String(item.post_id))),
    );
    const { data: schoolRow, error: schoolError } = schoolId
      ? await admin.from("schools").select("name").eq("id", schoolId).maybeSingle()
      : { data: null, error: null };
    const { data: commentPostRows, error: commentPostError } =
      postIds.length > 0
        ? await admin.from("posts").select("id, title").in("id", postIds)
        : { data: [], error: null };

    if (schoolError) {
      throw schoolError;
    }
    if (commentPostError) {
      throw commentPostError;
    }

    const postTitleById = new Map(
      (commentPostRows ?? []).map((item) => [String(item.id), String(item.title)]),
    );

    const detail: AdminMemberDetail = {
      member: {
        id: String(profileResult.data.id),
        email: authUserResult.data.user.email ?? String(profileResult.data.email ?? ""),
        nickname: String(profileResult.data.nickname ?? "익명"),
        name: profileResult.data.name ? String(profileResult.data.name) : undefined,
        userType:
          profileResult.data.user_type === "student" ||
          profileResult.data.user_type === "applicant" ||
          profileResult.data.user_type === "freshman"
            ? profileResult.data.user_type
            : "student",
        schoolId,
        schoolName: schoolRow?.name ? String(schoolRow.name) : undefined,
        department: profileResult.data.department
          ? String(profileResult.data.department)
          : undefined,
        grade:
          typeof profileResult.data.grade === "number" ? profileResult.data.grade : undefined,
        verified: Boolean(profileResult.data.verified),
        adultVerified: Boolean(profileResult.data.adult_verified),
        studentVerificationStatus:
          profileResult.data.student_verification_status === "none" ||
          profileResult.data.student_verification_status === "unverified" ||
          profileResult.data.student_verification_status === "pending" ||
          profileResult.data.student_verification_status === "verified" ||
          profileResult.data.student_verification_status === "rejected"
            ? profileResult.data.student_verification_status
            : "unverified",
        verificationState:
          profileResult.data.verification_state === "guest" ||
          profileResult.data.verification_state === "email_verified" ||
          profileResult.data.verification_state === "student_verified" ||
          profileResult.data.verification_state === "manual_review" ||
          profileResult.data.verification_state === "rejected"
            ? profileResult.data.verification_state
            : undefined,
        verificationScore:
          typeof profileResult.data.verification_score === "number"
            ? profileResult.data.verification_score
            : undefined,
        studentNumber: profileResult.data.student_number
          ? String(profileResult.data.student_number)
          : undefined,
        admissionYear:
          typeof profileResult.data.admission_year === "number"
            ? profileResult.data.admission_year
            : undefined,
        verificationRejectionReason: profileResult.data.verification_rejection_reason
          ? String(profileResult.data.verification_rejection_reason)
          : undefined,
        schoolEmail: profileResult.data.school_email
          ? String(profileResult.data.school_email)
          : undefined,
        trustScore:
          typeof profileResult.data.trust_score === "number"
            ? profileResult.data.trust_score
            : 0,
        reportCount:
          typeof profileResult.data.report_count === "number"
            ? profileResult.data.report_count
            : 0,
        warningCount:
          typeof profileResult.data.warning_count === "number"
            ? profileResult.data.warning_count
            : 0,
        isRestricted: Boolean(profileResult.data.is_restricted),
        role:
          roleResult.data?.role === "admin" || roleResult.data?.role === "moderator"
            ? roleResult.data.role
            : undefined,
        createdAt:
          authUserResult.data.user.created_at ?? String(profileResult.data.created_at),
        lastSignInAt: authUserResult.data.user.last_sign_in_at ?? undefined,
      },
      recentPosts: (postsResult.data ?? []).map((item) => ({
        id: String(item.id),
        title: String(item.title),
        category: item.category,
        subcategory: item.subcategory ?? undefined,
        createdAt: String(item.created_at),
        commentCount: typeof item.comment_count === "number" ? item.comment_count : 0,
        likeCount: typeof item.like_count === "number" ? item.like_count : 0,
        viewCount: typeof item.view_count === "number" ? item.view_count : 0,
        hidden: Boolean(item.admin_hidden) || Boolean(item.auto_hidden),
      })),
      recentComments: (commentsResult.data ?? []).map((item) => ({
        id: String(item.id),
        postId: String(item.post_id),
        postTitle: postTitleById.get(String(item.post_id)),
        content: String(item.content),
        createdAt: String(item.created_at),
        hidden: Boolean(item.admin_hidden) || Boolean(item.auto_hidden),
      })),
      receivedReports: (reportsResult.data ?? []).map((item) => ({
        id: String(item.id),
        reason: item.reason,
        status: item.status,
        targetType: item.target_type,
        targetId: String(item.target_id),
        createdAt: String(item.created_at),
        memo: item.memo ? String(item.memo) : undefined,
      })),
      auditLogs: auditLogs.filter(
        (item) => item.targetType === "user" && item.targetId === userId,
      ),
      studentVerifications: (studentVerificationsResult.data ?? []).map((item) => ({
        id: String(item.id),
        userId: String(item.user_id),
        schoolId: String(item.school_id),
        requestId: item.request_id ? String(item.request_id) : undefined,
        schoolEmail: String(item.school_email),
        studentNumber: item.student_number ? String(item.student_number) : undefined,
        departmentName: item.department_name ? String(item.department_name) : undefined,
        admissionYear: typeof item.admission_year === "number" ? item.admission_year : undefined,
        verificationState:
          item.verification_state === "guest" ||
          item.verification_state === "email_verified" ||
          item.verification_state === "student_verified" ||
          item.verification_state === "manual_review" ||
          item.verification_state === "rejected"
            ? item.verification_state
            : "guest",
        score: typeof item.score === "number" ? item.score : 0,
        requiresDocumentUpload: Boolean(item.requires_document_upload),
        autoChecks: Array.isArray(item.auto_checks)
          ? item.auto_checks.map((check: unknown) => ({
              code: String((check as Record<string, unknown>).code ?? ""),
              label: String((check as Record<string, unknown>).label ?? ""),
              passed: Boolean((check as Record<string, unknown>).passed),
              weight:
                typeof (check as Record<string, unknown>).weight === "number"
                  ? Number((check as Record<string, unknown>).weight)
                  : 0,
              detail:
                typeof (check as Record<string, unknown>).detail === "string"
                  ? String((check as Record<string, unknown>).detail)
                  : undefined,
            }))
          : [],
        decisionReason: item.decision_reason ? String(item.decision_reason) : undefined,
        rejectionReason: item.rejection_reason ? String(item.rejection_reason) : undefined,
        requestedAt: String(item.requested_at),
        emailVerifiedAt: item.email_verified_at ? String(item.email_verified_at) : undefined,
        reviewedAt: item.reviewed_at ? String(item.reviewed_at) : undefined,
        reviewedBy: item.reviewed_by ? String(item.reviewed_by) : undefined,
      })),
    };

    return NextResponse.json(detail);
  } catch (error) {
    logServerEvent("error", "admin_member_detail_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "회원 상세를 불러올 수 없습니다." },
      { status: 403 },
    );
  }
}
