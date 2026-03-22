import { unstable_noStore as noStore } from "next/cache";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import { deriveModerationSnapshot } from "@/lib/runtime-mutations";
import { getMockRuntimeSnapshot, guestUser } from "@/lib/runtime-state";
import { getSupabaseSetupIssue } from "@/lib/supabase/setup-issue";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  generateAutoNickname,
  getDefaultVisibilityLevel,
} from "@/lib/user-identity";
import { getPostViewCount } from "@/lib/utils";
import type {
  AdmissionQuestionMeta,
  AppRuntimeSnapshot,
  Comment,
  DatingProfile,
  Lecture,
  LectureReview,
  MediaAsset,
  Notification,
  Post,
  Report,
  School,
  StudentVerificationStatus,
  TradePost,
  User,
  UserType,
  VisibilityLevel,
} from "@/types";

const hasSupabaseEnv = Boolean(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function createSupabaseFallbackSnapshot(issue?: string): AppRuntimeSnapshot {
  const snapshot = getMockRuntimeSnapshot();
  return {
    ...snapshot,
    setupStatus: issue ? "supabase-error" : "demo",
    setupIssue: issue,
  };
}

const toUserType = (value?: string | null): UserType => {
  if (value === "freshman") return "freshman";
  if (value === "high_school" || value === "highschool") return "applicant";
  return "student";
};

const toStudentVerificationStatus = (
  value?: string | null,
  verified = false,
): StudentVerificationStatus => {
  if (
    value === "none" ||
    value === "unverified" ||
    value === "pending" ||
    value === "verified" ||
    value === "rejected"
  ) {
    return value;
  }

  return verified ? "verified" : "unverified";
};

const toVisibilityLevel = (
  value?: string | null,
): VisibilityLevel | undefined => {
  if (
    value === "anonymous" ||
    value === "school" ||
    value === "schoolDepartment" ||
    value === "profile"
  ) {
    return value;
  }

  return undefined;
};

function mapSchoolRow(row: Record<string, unknown>): School {
  return {
    id: String(row.id),
    name: String(row.name),
    domain: String(row.domain),
    city: String(row.city ?? "서울"),
  };
}

function mapUserRow(row: Record<string, unknown>, schools: School[]): User {
  const school = schools.find((item) => item.id === String(row.school_id ?? ""));
  const studentVerificationStatus = toStudentVerificationStatus(
    row.student_verification_status as string | null | undefined,
    Boolean(row.verified),
  );

  return {
    id: String(row.id),
    email: row.email ? String(row.email) : "",
    name: String(row.name ?? "이름 미지정"),
    nickname:
      row.nickname && String(row.nickname).length > 0
        ? String(row.nickname)
        : generateAutoNickname({
            id: String(row.id),
            email: row.email ? String(row.email) : undefined,
            school: school ?? null,
          }),
    userType: toUserType(row.user_type as string | null | undefined),
    schoolId: row.school_id ? String(row.school_id) : undefined,
    department: row.department ? String(row.department) : undefined,
    grade: typeof row.grade === "number" ? row.grade : undefined,
    verified: studentVerificationStatus === "verified" || Boolean(row.verified),
    studentVerificationStatus,
    schoolEmail: row.school_email ? String(row.school_email) : undefined,
    schoolEmailVerifiedAt: row.school_email_verified_at
      ? String(row.school_email_verified_at)
      : undefined,
    trustScore: typeof row.trust_score === "number" ? row.trust_score : 0,
    reportCount: typeof row.report_count === "number" ? row.report_count : 0,
    warningCount: typeof row.warning_count === "number" ? row.warning_count : 0,
    isRestricted: Boolean(row.is_restricted),
    defaultVisibilityLevel:
      toVisibilityLevel(row.default_visibility_level as string | null | undefined) ??
      getDefaultVisibilityLevel({
        userType: toUserType(row.user_type as string | null | undefined),
        schoolId: row.school_id ? String(row.school_id) : undefined,
      }),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    bio: row.bio ? String(row.bio) : undefined,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
  };
}

function mapPostRow(row: Record<string, unknown>): Post {
  const likes =
    typeof row.like_count === "number"
      ? row.like_count
      : typeof row.likes_count === "number"
        ? row.likes_count
        : 0;
  const commentCount = typeof row.comment_count === "number" ? row.comment_count : 0;
  const metadata = row.metadata as Record<string, unknown> | null | undefined;

  return {
    id: String(row.id),
    category: row.category as Post["category"],
    subcategory: (row.subcategory as Post["subcategory"]) ?? undefined,
    schoolId: row.school_id ? String(row.school_id) : undefined,
    authorId: String(row.author_id),
    visibilityLevel: toVisibilityLevel(row.visibility_level as string | null | undefined),
    title: String(row.title),
    content: String(row.content),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    likes,
    commentCount,
    viewCount: getPostViewCount({
      viewCount: typeof metadata?.viewCount === "number" ? metadata.viewCount : undefined,
      likes,
      commentCount,
    }),
    reportCount: typeof row.report_count === "number" ? row.report_count : 0,
    autoHidden: Boolean(row.auto_hidden),
    imageUrl: row.image_url ? String(row.image_url) : undefined,
    tags: Array.isArray((metadata as { tags?: string[] } | null)?.tags)
      ? ((metadata as { tags?: string[] }).tags ?? [])
      : undefined,
    meta:
      row.category === "admission"
        ? ((metadata ?? undefined) as AdmissionQuestionMeta | undefined)
        : undefined,
  };
}

function mapCommentRow(row: Record<string, unknown>): Comment {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    authorId: String(row.author_id),
    visibilityLevel: toVisibilityLevel(row.visibility_level as string | null | undefined),
    content: String(row.content),
    accepted: Boolean(row.accepted),
    reportCount: typeof row.report_count === "number" ? row.report_count : 0,
    autoHidden: Boolean(row.auto_hidden),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapLectureRow(row: Record<string, unknown>): Lecture {
  return {
    id: String(row.id),
    schoolId: String(row.school_id),
    semester: String(row.semester),
    courseName: String(row.name ?? row.course_name),
    professor: String(row.professor),
    section: String(row.section),
    dayTime: String(row.day_time ?? ""),
    credits: typeof row.credits === "number" ? row.credits : 3,
    department: String(row.department ?? "전공"),
  };
}

function mapLectureReviewRow(row: Record<string, unknown>): LectureReview {
  return {
    id: String(row.id),
    lectureId: String(row.lecture_id),
    reviewerId: String(row.author_id ?? row.reviewer_id),
    visibilityLevel: toVisibilityLevel(row.visibility_level as string | null | undefined),
    difficulty: row.difficulty as LectureReview["difficulty"],
    workload: row.workload as LectureReview["workload"],
    attendance: row.attendance as LectureReview["attendance"],
    examStyle: row.exam_style as LectureReview["examStyle"],
    teamProject: Boolean(row.team_project),
    presentation: Boolean(row.presentation),
    gradingStyle: row.grading_style as LectureReview["gradingStyle"],
    honeyScore: typeof row.honey_score === "number" ? row.honey_score : 0,
    helpfulCount: typeof row.helpful_count === "number" ? row.helpful_count : 0,
    reportCount: typeof row.report_count === "number" ? row.report_count : 0,
    autoHidden: Boolean(row.auto_hidden),
    shortComment: String(row.short_comment),
    longComment: String(row.long_comment),
    semester: String(row.semester),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapTradePostRow(row: Record<string, unknown>): TradePost {
  return {
    id: String(row.id),
    schoolId: String(row.school_id),
    semester: String(row.semester ?? ""),
    userId: String(row.author_id ?? row.user_id),
    visibilityLevel: toVisibilityLevel(row.visibility_level as string | null | undefined),
    haveLectureId: String(row.have_lecture_id),
    wantLectureId: String(row.want_lecture_id),
    professor: row.professor ? String(row.professor) : undefined,
    section: row.section ? String(row.section) : undefined,
    timeRange: String(row.time_range ?? ""),
    note: String(row.note ?? ""),
    status:
      row.status === "matched"
        ? "matching"
        : (row.status as TradePost["status"]),
    reportCount: typeof row.report_count === "number" ? row.report_count : 0,
    autoHidden: Boolean(row.auto_hidden),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function toNotificationType(
  value?: string | null,
): Notification["type"] {
  if (value === "reply") return "reply";
  if (value === "trending_post") return "trendingPost";
  if (value === "lecture_reaction") return "lectureReaction";
  if (value === "trade_match" || value === "trade") return "tradeMatch";
  if (value === "admission_answer" || value === "answer") return "admissionAnswer";
  if (value === "school_recommendation") return "schoolRecommendation";
  if (value === "freshman_trending") return "freshmanTrending";
  if (value === "admission_unanswered") return "admissionUnanswered";
  if (value === "verification_approved") return "verificationApproved";
  if (value === "report_update" || value === "report") return "reportUpdate";
  if (value === "announcement") return "announcement";
  return "comment";
}

function toNotificationCategory(
  type: Notification["type"],
): Notification["category"] {
  if (
    type === "schoolRecommendation" ||
    type === "freshmanTrending" ||
    type === "admissionUnanswered" ||
    type === "verificationApproved" ||
    type === "reportUpdate" ||
    type === "announcement"
  ) {
    return "notice";
  }

  return "activity";
}

function mapNotificationRow(row: Record<string, unknown>): Notification {
  const type = toNotificationType(row.type as string | null | undefined);
  const sourceKind =
    row.source_kind === "recommendation" || row.source_kind === "system"
      ? row.source_kind
      : "activity";
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type,
    category: toNotificationCategory(type),
    sourceKind,
    deliveryMode: row.delivery_mode === "daily" ? "daily" : "instant",
    title: String(row.title),
    body: String(row.body),
    isRead: Boolean(row.is_read),
    readAt: row.read_at ? String(row.read_at) : undefined,
    href: row.href ? String(row.href) : undefined,
    targetType: row.target_type ? String(row.target_type) as Notification["targetType"] : undefined,
    targetId: row.target_id ? String(row.target_id) : undefined,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : undefined,
    recommended:
      sourceKind === "recommendation" ||
      Boolean((row.metadata as { recommended?: boolean } | null)?.recommended),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapReportRow(row: Record<string, unknown>): Report {
  return {
    id: String(row.id),
    reporterId: String(row.reporter_id),
    targetType: row.target_type as Report["targetType"],
    targetId: String(row.target_id),
    reason: row.reason as Report["reason"],
    memo: row.memo ? String(row.memo) : undefined,
    status: row.status as Report["status"],
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapDatingProfileRow(row: Record<string, unknown>): DatingProfile {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    intro: String(row.intro),
    vibeTag: String(row.vibe_tag),
    photoUrl: row.photo_url ? String(row.photo_url) : undefined,
    isVisible: Boolean(row.is_visible),
    visibilityLevel: toVisibilityLevel(row.visibility_level as string | null | undefined),
    schoolId: String(row.school_id),
    department: row.department ? String(row.department) : undefined,
    grade: typeof row.grade === "number" ? row.grade : 1,
    reportCount: typeof row.report_count === "number" ? row.report_count : 0,
    autoHidden: Boolean(row.auto_hidden),
  };
}

function mapMediaAssetRow(row: Record<string, unknown>): MediaAsset {
  return {
    id: String(row.id),
    ownerType: row.owner_type as MediaAsset["ownerType"],
    ownerId: String(row.owner_id),
    mediaType: row.media_type as MediaAsset["mediaType"],
    fileUrl: String(row.file_url),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function createFallbackUser(authUser: SupabaseAuthUser): User {
  return {
    id: authUser.id,
    email: authUser.email ?? "user@example.com",
    name:
      authUser.user_metadata.full_name ??
      authUser.user_metadata.name ??
      authUser.email?.split("@")[0] ??
      "새 사용자",
    userType: "student",
    nickname: generateAutoNickname({
      id: authUser.id,
      email: authUser.email ?? undefined,
      school: null,
    }),
    schoolId: undefined,
    department: undefined,
    grade: undefined,
    verified: false,
    studentVerificationStatus: "unverified",
    trustScore: 0,
    reportCount: 0,
    warningCount: 0,
    isRestricted: false,
    defaultVisibilityLevel: "anonymous",
    createdAt: new Date().toISOString(),
    bio: undefined,
  };
}

async function ensureProfileRow(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, authUser: SupabaseAuthUser) {
  await supabase.from("users").upsert(
    {
      id: authUser.id,
      email: authUser.email ?? "user@example.com",
      name:
        authUser.user_metadata.full_name ??
        authUser.user_metadata.name ??
        authUser.email?.split("@")[0] ??
        "새 사용자",
      nickname: generateAutoNickname({
        id: authUser.id,
        email: authUser.email ?? undefined,
        school: null,
      }),
    },
    { onConflict: "id" },
  );
}

export async function loadServerRuntimeSnapshot(): Promise<AppRuntimeSnapshot> {
  noStore();

  if (!hasSupabaseEnv) {
    return createSupabaseFallbackSnapshot();
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const schoolsResult = await supabase.from("schools").select("*").order("name", { ascending: true });
    if (schoolsResult.error) {
      return createSupabaseFallbackSnapshot(getSupabaseSetupIssue(schoolsResult.error));
    }

    let usersResult = await supabase.rpc("list_user_public_profiles");
    const postsResult = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    const commentsResult = await supabase.from("comments").select("*").order("created_at", { ascending: false });
    const lecturesResult = await supabase.from("lectures").select("*").order("name", { ascending: true });
    const lectureReviewsResult = await supabase
      .from("lecture_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (
      usersResult.error ||
      postsResult.error ||
      commentsResult.error ||
      lecturesResult.error ||
      lectureReviewsResult.error
    ) {
      return createSupabaseFallbackSnapshot(
        getSupabaseSetupIssue(
          usersResult.error,
          postsResult.error,
          commentsResult.error,
          lecturesResult.error,
          lectureReviewsResult.error,
        ),
      );
    }

    if (
      authUser &&
      !(usersResult.data ?? []).some(
        (row: { id: string }) => row.id === authUser.id,
      )
    ) {
      await ensureProfileRow(supabase, authUser);
      usersResult = await supabase.rpc("list_user_public_profiles");
      if (usersResult.error) {
        return createSupabaseFallbackSnapshot(getSupabaseSetupIssue(usersResult.error));
      }
    }

    const schools = (schoolsResult.data ?? []).map(mapSchoolRow);
    const users = (usersResult.data ?? []).map((row: Record<string, unknown>) =>
      mapUserRow(row as unknown as Record<string, unknown>, schools),
    );

    const authOnly = authUser
      ? await Promise.all([
          supabase.from("trade_posts").select("*").order("created_at", { ascending: false }),
          supabase.from("notifications").select("*").order("created_at", { ascending: false }),
          supabase.from("reports").select("*").order("created_at", { ascending: false }),
          supabase.from("blocks").select("*").order("created_at", { ascending: false }),
          supabase.from("dating_profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("media_assets").select("*").order("created_at", { ascending: false }),
          supabase.from("users").select("*").eq("id", authUser.id).single(),
        ])
      : [null, null, null, null, null, null, null];

    const [
      tradePostsResult,
      notificationsResult,
      reportsResult,
      blocksResult,
      datingProfilesResult,
      mediaAssetsResult,
      currentUserProfileResult,
    ] = authOnly;

    const snapshot: AppRuntimeSnapshot = {
      schools,
      users,
      posts: (postsResult.data ?? []).map((row) => mapPostRow(row as unknown as Record<string, unknown>)),
      comments: (commentsResult.data ?? []).map((row) => mapCommentRow(row as unknown as Record<string, unknown>)),
      lectures: (lecturesResult.data ?? []).map((row) => mapLectureRow(row as unknown as Record<string, unknown>)),
      lectureReviews: (lectureReviewsResult.data ?? []).map((row) =>
        mapLectureReviewRow(row as unknown as Record<string, unknown>),
      ),
      tradePosts: tradePostsResult?.error
        ? []
        : (tradePostsResult?.data ?? []).map((row) => mapTradePostRow(row as unknown as Record<string, unknown>)),
      notifications: notificationsResult?.error
        ? []
        : (notificationsResult?.data ?? []).map((row) =>
            mapNotificationRow(row as unknown as Record<string, unknown>),
          ),
      reports: reportsResult?.error
        ? []
        : (reportsResult?.data ?? []).map((row) => mapReportRow(row as unknown as Record<string, unknown>)),
      blocks: blocksResult?.error
        ? []
        : (blocksResult?.data ?? []).map((row) => ({
            id: String((row as Record<string, unknown>).id),
            blockerId: String((row as Record<string, unknown>).blocker_id),
            blockedUserId: String((row as Record<string, unknown>).blocked_user_id),
            createdAt: String((row as Record<string, unknown>).created_at ?? new Date().toISOString()),
          })),
      datingProfiles: datingProfilesResult?.error
        ? []
        : (datingProfilesResult?.data ?? []).map((row) =>
            mapDatingProfileRow(row as unknown as Record<string, unknown>),
          ),
      mediaAssets: mediaAssetsResult?.error
        ? []
        : (mediaAssetsResult?.data ?? []).map((row) =>
            mapMediaAssetRow(row as unknown as Record<string, unknown>),
          ),
      currentUser: guestUser,
      source: "supabase",
      isAuthenticated: Boolean(authUser),
      setupStatus: "ready",
      setupIssue: undefined,
    };

    snapshot.currentUser = authUser
      ? (() => {
          const privateProfileRow = currentUserProfileResult?.error
            ? null
            : (currentUserProfileResult?.data as Record<string, unknown> | null);

          if (privateProfileRow) {
            return {
              ...mapUserRow(privateProfileRow, schools),
              email: authUser.email ?? String(privateProfileRow.email ?? ""),
            };
          }

          return users.find((user: User) => user.id === authUser.id) ?? createFallbackUser(authUser);
        })()
      : guestUser;

    if (snapshot.schools.length === 0 || (snapshot.posts.length === 0 && snapshot.lectures.length === 0)) {
      return createSupabaseFallbackSnapshot(getSupabaseSetupIssue());
    }

    return deriveModerationSnapshot(snapshot);
  } catch (error) {
    return createSupabaseFallbackSnapshot(
      getSupabaseSetupIssue(error instanceof Error ? error : undefined),
    );
  }
}
