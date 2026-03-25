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
      auditLogs,
    ] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin
        .from("users")
        .select(
          "id, email, nickname, name, user_type, school_id, department, grade, verified, adult_verified, student_verification_status, school_email, trust_score, report_count, warning_count, is_restricted, created_at",
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
