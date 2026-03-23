"use client";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import {
  clearSupabaseSessionStorage,
  createClient,
  getCurrentSupabaseAuthUser,
  resetSupabaseAuthUserCache,
} from "@/lib/supabase/client";
import { isMasterAdminEmail } from "@/lib/admin/master-admin-shared";
import { deriveModerationSnapshot } from "@/lib/runtime-mutations";
import { getMockRuntimeSnapshot, guestUser } from "@/lib/runtime-state";
import {
  hasPublicSupabaseEnv,
  isGoogleAuthEnabled,
  resolveAppUrl,
} from "@/lib/env";
import { getSupabaseSetupIssue } from "@/lib/supabase/setup-issue";
import {
  generateAutoNickname,
  getDefaultVisibilityLevel,
  getStandardVisibilityLevel,
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
  ReportReason,
  ReportTargetType,
  ReportStatus,
  School,
  StudentVerificationStatus,
  TradePost,
  User,
  UserType,
  VisibilityLevel,
} from "@/types";

const toUserType = (value?: string | null): UserType => {
  if (value === "freshman") return "freshman";
  if (value === "applicant" || value === "high_school" || value === "highschool") {
    return "applicant";
  }
  return "student";
};

const fromUserType = (value: UserType) => {
  if (value === "freshman") return "freshman";
  if (value === "applicant") return "applicant";
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

export type RuntimeSnapshotScope =
  | "full"
  | "home"
  | "search"
  | "chrome"
  | "community"
  | "school"
  | "lectures"
  | "trade"
  | "notifications"
  | "profile"
  | "messages"
  | "dating"
  | "admission"
  | "admin";

type SnapshotIncludeConfig = {
  posts: boolean;
  comments: boolean;
  lectures: boolean;
  lectureReviews: boolean;
  tradePosts: boolean;
  notifications: boolean;
  reports: boolean;
  blocks: boolean;
  datingProfiles: boolean;
  mediaAssets: boolean;
  currentUserProfile: boolean;
};

function getSnapshotIncludeConfig(scope: RuntimeSnapshotScope): SnapshotIncludeConfig {
  switch (scope) {
    case "home":
      return {
        posts: true,
        comments: false,
        lectures: true,
        lectureReviews: false,
        tradePosts: true,
        notifications: false,
        reports: false,
        blocks: false,
        datingProfiles: false,
        mediaAssets: false,
        currentUserProfile: true,
      };
    case "search":
      return {
        posts: true,
        comments: false,
        lectures: true,
        lectureReviews: false,
        tradePosts: false,
        notifications: true,
        reports: false,
        blocks: false,
        datingProfiles: false,
        mediaAssets: false,
        currentUserProfile: true,
      };
    case "chrome":
      return {
        posts: false,
        comments: false,
        lectures: false,
        lectureReviews: false,
        tradePosts: false,
        notifications: true,
        reports: false,
        blocks: false,
        datingProfiles: false,
        mediaAssets: false,
        currentUserProfile: true,
      };
    case "community":
    case "admission":
      return {
        posts: true,
        comments: true,
        lectures: false,
        lectureReviews: false,
        tradePosts: false,
        notifications: false,
        reports: true,
        blocks: true,
        datingProfiles: false,
        mediaAssets: false,
        currentUserProfile: true,
      };
    case "school":
      return {
        posts: true,
        comments: true,
        lectures: true,
        lectureReviews: false,
        tradePosts: true,
        notifications: false,
        reports: true,
        blocks: true,
        datingProfiles: false,
        mediaAssets: false,
        currentUserProfile: true,
      };
    case "lectures":
      return {
        posts: false,
        comments: false,
        lectures: true,
        lectureReviews: true,
        tradePosts: true,
        notifications: false,
        reports: false,
        blocks: false,
        datingProfiles: false,
        mediaAssets: false,
        currentUserProfile: true,
      };
    case "trade":
      return {
        posts: false,
        comments: false,
        lectures: true,
        lectureReviews: false,
        tradePosts: true,
        notifications: true,
        reports: true,
        blocks: true,
        datingProfiles: false,
        mediaAssets: false,
        currentUserProfile: true,
      };
    case "notifications":
      return {
        posts: true,
        comments: false,
        lectures: true,
        lectureReviews: false,
        tradePosts: true,
        notifications: true,
        reports: false,
        blocks: false,
        datingProfiles: false,
        mediaAssets: false,
        currentUserProfile: true,
      };
    case "profile":
      return {
        posts: true,
        comments: true,
        lectures: false,
        lectureReviews: true,
        tradePosts: true,
        notifications: true,
        reports: false,
        blocks: true,
        datingProfiles: true,
        mediaAssets: true,
        currentUserProfile: true,
      };
    case "messages":
      return {
        posts: false,
        comments: false,
        lectures: false,
        lectureReviews: false,
        tradePosts: true,
        notifications: true,
        reports: false,
        blocks: false,
        datingProfiles: false,
        mediaAssets: false,
        currentUserProfile: true,
      };
    case "dating":
      return {
        posts: true,
        comments: true,
        lectures: false,
        lectureReviews: false,
        tradePosts: false,
        notifications: false,
        reports: true,
        blocks: true,
        datingProfiles: true,
        mediaAssets: false,
        currentUserProfile: true,
      };
    case "admin":
    case "full":
    default:
      return {
        posts: true,
        comments: true,
        lectures: true,
        lectureReviews: true,
        tradePosts: true,
        notifications: true,
        reports: true,
        blocks: true,
        datingProfiles: true,
        mediaAssets: true,
        currentUserProfile: true,
      };
  }
}

function shouldRequirePrimaryContent(scope: RuntimeSnapshotScope) {
  return !["chrome", "notifications", "profile", "messages"].includes(scope);
}

type RuntimeQueryContext = {
  scope: RuntimeSnapshotScope;
  schoolId?: string;
  userId?: string;
  adultVerified?: boolean;
};

const EMPTY_RESULT = Promise.resolve({ data: [], error: null });
const HOME_POST_SUBCATEGORIES = [
  "free",
  "advice",
  "ask",
  "school",
  "freshman",
  "club",
  "food",
] as const;
const COMMUNITY_POST_SUBCATEGORIES = [
  "free",
  "advice",
  "ask",
  "anonymous",
  "hot",
];
const DATING_POST_SUBCATEGORIES = ["dating", "meeting"] as const;

function buildPostQuery(supabase: ReturnType<typeof createClient>, context: RuntimeQueryContext) {
  const base = supabase.from("posts").select("*").order("created_at", { ascending: false });

  switch (context.scope) {
    case "home":
      return base.eq("category", "community").in("subcategory", [...HOME_POST_SUBCATEGORIES]).limit(80);
    case "search":
      return base.in("category", ["community", "admission"]).limit(180);
    case "community":
      return base.eq("category", "community").in("subcategory", COMMUNITY_POST_SUBCATEGORIES).limit(140);
    case "admission":
      return context.schoolId
        ? base.eq("category", "admission").eq("school_id", context.schoolId).limit(100)
        : base.eq("category", "admission").limit(100);
    case "school":
      return context.schoolId
        ? base.eq("school_id", context.schoolId).in("category", ["community", "admission"]).limit(120)
        : EMPTY_RESULT;
    case "dating":
      return base.eq("category", "community").in("subcategory", [...DATING_POST_SUBCATEGORIES]).limit(80);
    case "profile":
      return context.userId ? base.eq("author_id", context.userId).limit(80) : EMPTY_RESULT;
    case "notifications":
      return base.in("category", ["community", "admission"]).limit(80);
    case "admin":
    case "full":
    default:
      return base.limit(220);
  }
}

function buildCommentQuery(
  supabase: ReturnType<typeof createClient>,
  context: RuntimeQueryContext,
  postIds: string[],
) {
  const base = supabase.from("comments").select("*").order("created_at", { ascending: false });

  if (context.scope === "profile") {
    return context.userId ? base.eq("author_id", context.userId).limit(120) : EMPTY_RESULT;
  }

  if (postIds.length === 0) {
    return EMPTY_RESULT;
  }

  return base.in("post_id", postIds).limit(240);
}

function buildLectureQuery(
  supabase: ReturnType<typeof createClient>,
  context: RuntimeQueryContext,
) {
  const base = supabase.from("lectures").select("*").order("name", { ascending: true });

  switch (context.scope) {
    case "home":
    case "search":
    case "school":
    case "lectures":
    case "trade":
      return context.schoolId ? base.eq("school_id", context.schoolId).limit(80) : base.limit(80);
    case "notifications":
      return context.schoolId ? base.eq("school_id", context.schoolId).limit(40) : base.limit(40);
    case "admin":
    case "full":
    default:
      return base.limit(140);
  }
}

function buildLectureReviewQuery(
  supabase: ReturnType<typeof createClient>,
  context: RuntimeQueryContext,
  lectureIds: string[],
) {
  const base = supabase.from("lecture_reviews").select("*").order("created_at", { ascending: false });

  if (context.scope === "profile") {
    return context.userId ? base.eq("author_id", context.userId).limit(80) : EMPTY_RESULT;
  }

  if (lectureIds.length === 0) {
    return EMPTY_RESULT;
  }

  return base.in("lecture_id", lectureIds).limit(160);
}

function buildTradePostsQuery(
  supabase: ReturnType<typeof createClient>,
  context: RuntimeQueryContext,
) {
  const base = supabase.from("trade_posts").select("*").order("created_at", { ascending: false });

  switch (context.scope) {
    case "home":
    case "school":
    case "lectures":
    case "trade":
    case "notifications":
      return context.schoolId ? base.eq("school_id", context.schoolId).limit(80) : base.limit(80);
    case "profile":
      return context.userId ? base.eq("author_id", context.userId).limit(40) : EMPTY_RESULT;
    case "messages":
      return context.userId ? base.eq("author_id", context.userId).limit(40) : EMPTY_RESULT;
    case "admin":
    case "full":
    default:
      return base.limit(120);
  }
}

function buildNotificationsQuery(supabase: ReturnType<typeof createClient>, context: RuntimeQueryContext) {
  return context.userId
    ? supabase
        .from("notifications")
        .select("*")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(80)
    : EMPTY_RESULT;
}

function buildReportsQuery(supabase: ReturnType<typeof createClient>, context: RuntimeQueryContext) {
  const base = supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (context.scope === "admin" || context.scope === "full") {
    return base.limit(120);
  }
  return context.userId ? base.eq("reporter_id", context.userId).limit(80) : EMPTY_RESULT;
}

function buildBlocksQuery(supabase: ReturnType<typeof createClient>, context: RuntimeQueryContext) {
  const base = supabase.from("blocks").select("*").order("created_at", { ascending: false });
  if (context.scope === "admin" || context.scope === "full") {
    return base.limit(120);
  }
  return context.userId ? base.eq("blocker_id", context.userId).limit(80) : EMPTY_RESULT;
}

function buildDatingProfilesQuery(
  supabase: ReturnType<typeof createClient>,
  context: RuntimeQueryContext,
) {
  const base = supabase.from("dating_profiles").select("*").order("created_at", { ascending: false });

  if (context.scope === "profile") {
    return context.userId ? base.eq("user_id", context.userId).limit(8) : EMPTY_RESULT;
  }

  return base.limit(80);
}

function buildMediaAssetsQuery(supabase: ReturnType<typeof createClient>, context: RuntimeQueryContext) {
  const base = supabase.from("media_assets").select("*").order("created_at", { ascending: false });
  if (context.scope === "admin" || context.scope === "full") {
    return base.limit(80);
  }
  return context.userId ? base.eq("owner_id", context.userId).limit(40) : EMPTY_RESULT;
}

function createSupabaseFallbackSnapshot(issue?: string): AppRuntimeSnapshot {
  const snapshot = getMockRuntimeSnapshot();
  return {
    ...snapshot,
    setupStatus: issue ? "supabase-error" : "demo",
    setupIssue: issue,
  };
}

function mapSchoolRow(row: Record<string, unknown>): School {
  return {
    id: String(row.id),
    name: String(row.name),
    domain: String(row.domain),
    city: String(row.city ?? "서울"),
  };
}

function mapUserRow(row: Record<string, unknown>, schools: School[]): User {
  const school = schools.find(
    (item) => item.id === String(row.school_id ?? ""),
  );
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
            email: String(row.email),
            school: school ?? null,
          }),
    userType: toUserType(row.user_type as string | null | undefined),
    schoolId: row.school_id ? String(row.school_id) : undefined,
    department: row.department ? String(row.department) : undefined,
    grade: typeof row.grade === "number" ? row.grade : undefined,
    verified: studentVerificationStatus === "verified" || Boolean(row.verified),
    adultVerified: Boolean(row.adult_verified),
    adultVerifiedAt: row.adult_verified_at ? String(row.adult_verified_at) : undefined,
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
      (() => {
        const fallback = getDefaultVisibilityLevel({
          userType: toUserType(row.user_type as string | null | undefined),
          schoolId: row.school_id ? String(row.school_id) : undefined,
        });
        const current = toVisibilityLevel(
          row.default_visibility_level as string | null | undefined,
        );
        return current && current !== "anonymous" ? current : fallback;
      })(),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    bio: row.bio ? String(row.bio) : undefined,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
  };
}

function normalizeCommunityVisibilityLevel(
  category: Post["category"],
  subcategory: Post["subcategory"] | undefined,
  visibilityLevel: Post["visibilityLevel"],
) {
  if (category === "community" && subcategory !== "anonymous" && visibilityLevel === "anonymous") {
    return "school" as const;
  }

  return visibilityLevel;
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
    visibilityLevel: normalizeCommunityVisibilityLevel(
      row.category as Post["category"],
      (row.subcategory as Post["subcategory"]) ?? undefined,
      toVisibilityLevel(row.visibility_level as string | null | undefined),
    ),
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
    adminHidden: Boolean(row.admin_hidden),
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
    adminHidden: Boolean(row.admin_hidden),
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
    adminHidden: Boolean(row.admin_hidden),
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
    reason: (row.reason as ReportReason | null | undefined) ?? "other",
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
    adminHidden: Boolean(row.admin_hidden),
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
    adultVerified: false,
    adultVerifiedAt: undefined,
    studentVerificationStatus: "unverified",
    trustScore: 0,
    reportCount: 0,
    warningCount: 0,
    isRestricted: false,
    defaultVisibilityLevel: "school",
    createdAt: new Date().toISOString(),
    bio: undefined,
  };
}

async function ensureClientProfileRow(
  supabase: ReturnType<typeof createClient>,
  authUser: SupabaseAuthUser,
) {
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

export function isSupabaseEnabled() {
  return hasPublicSupabaseEnv();
}

export function hasCompletedOnboarding(
  user?: { schoolId?: User["schoolId"]; email?: User["email"] } | null,
) {
  return Boolean(user?.schoolId) || isMasterAdminEmail(user?.email);
}

export function getAuthFlowHref({
  isAuthenticated,
  user,
  nextPath = "/home",
}: {
  isAuthenticated: boolean;
  user?: { schoolId?: User["schoolId"]; email?: User["email"] } | null;
  nextPath?: string;
}) {
  const encodedNextPath = encodeURIComponent(nextPath);

  if (!isAuthenticated) {
    return `/login?next=${encodedNextPath}`;
  }

  if (isMasterAdminEmail(user?.email)) {
    return nextPath;
  }

  if (!hasCompletedOnboarding(user)) {
    return `/onboarding?next=${encodedNextPath}`;
  }

  return nextPath;
}

const clientRuntimeSnapshotPromises = new Map<RuntimeSnapshotScope, Promise<AppRuntimeSnapshot>>();
const lastClientRuntimeSnapshots = new Map<
  RuntimeSnapshotScope,
  { snapshot: AppRuntimeSnapshot; at: number }
>();
const CLIENT_RUNTIME_SNAPSHOT_TTL_MS = 1500;

export function invalidateClientRuntimeSnapshots(scopes?: RuntimeSnapshotScope[]) {
  if (!scopes || scopes.length === 0) {
    clientRuntimeSnapshotPromises.clear();
    lastClientRuntimeSnapshots.clear();
    resetSupabaseAuthUserCache();
    return;
  }

  for (const scope of scopes) {
    clientRuntimeSnapshotPromises.delete(scope);
    lastClientRuntimeSnapshots.delete(scope);
  }

  resetSupabaseAuthUserCache();
}

export function resetClientAuthRuntime() {
  invalidateClientRuntimeSnapshots();
}

async function fetchClientRuntimeSnapshot(scope: RuntimeSnapshotScope = "full"): Promise<AppRuntimeSnapshot> {
  if (!isSupabaseEnabled()) {
    return createSupabaseFallbackSnapshot();
  }

  try {
    const supabase = createClient();
    const include = getSnapshotIncludeConfig(scope);
    const authUser = await getCurrentSupabaseAuthUser();

    let currentUserProfileResult = authUser
      ? await supabase.from("users").select("*").eq("id", authUser.id).single()
      : null;
    const queryContext: RuntimeQueryContext = {
      scope,
      schoolId:
        currentUserProfileResult?.error || !currentUserProfileResult?.data?.school_id
          ? undefined
          : String(currentUserProfileResult.data.school_id),
      userId: authUser?.id,
      adultVerified: Boolean(currentUserProfileResult?.data?.adult_verified),
    };

    const [
      schoolsResult,
      initialUsersResult,
      postsResult,
      lecturesResult,
    ] = await Promise.all([
      supabase.from("schools").select("*").order("name", { ascending: true }),
      supabase.rpc("list_user_public_profiles"),
      include.posts
        ? buildPostQuery(supabase, queryContext)
        : EMPTY_RESULT,
      include.lectures
        ? buildLectureQuery(supabase, queryContext)
        : EMPTY_RESULT,
    ]);
    let usersResult = initialUsersResult;

    if (
      schoolsResult.error ||
      usersResult.error ||
      postsResult?.error ||
      lecturesResult?.error
    ) {
      return createSupabaseFallbackSnapshot(
        getSupabaseSetupIssue(
          schoolsResult.error,
          usersResult.error,
          postsResult?.error ?? undefined,
          lecturesResult?.error ?? undefined,
        ),
      );
    }

    if (
      authUser &&
      !(usersResult.data ?? []).some(
        (row: { id: string }) => row.id === authUser.id,
      )
    ) {
      await ensureClientProfileRow(supabase, authUser);
      usersResult = await supabase.rpc("list_user_public_profiles");
      currentUserProfileResult = await supabase.from("users").select("*").eq("id", authUser.id).single();
      if (usersResult.error) {
        return createSupabaseFallbackSnapshot(getSupabaseSetupIssue(usersResult.error));
      }
    }

    const postRows = (postsResult?.data ?? []) as Record<string, unknown>[];
    const lectureRows = (lecturesResult?.data ?? []) as Record<string, unknown>[];
    const postIds = postRows.map((row) => String(row.id));
    const lectureIds = lectureRows.map((row) => String(row.id));

    const [
      commentsResult,
      lectureReviewsResult,
      tradePostsResult,
      notificationsResult,
      reportsResult,
      blocksResult,
      datingProfilesResult,
      mediaAssetsResult,
    ] = await Promise.all([
      include.comments
        ? buildCommentQuery(supabase, queryContext, postIds)
        : EMPTY_RESULT,
      include.lectureReviews
        ? buildLectureReviewQuery(supabase, queryContext, lectureIds)
        : EMPTY_RESULT,
      authUser && include.tradePosts
        ? buildTradePostsQuery(supabase, queryContext)
        : EMPTY_RESULT,
      authUser && include.notifications
        ? buildNotificationsQuery(supabase, queryContext)
        : EMPTY_RESULT,
      authUser && include.reports
        ? buildReportsQuery(supabase, queryContext)
        : EMPTY_RESULT,
      authUser && include.blocks
        ? buildBlocksQuery(supabase, queryContext)
        : EMPTY_RESULT,
      authUser && include.datingProfiles
        ? buildDatingProfilesQuery(supabase, queryContext)
        : EMPTY_RESULT,
      authUser && include.mediaAssets
        ? buildMediaAssetsQuery(supabase, queryContext)
        : EMPTY_RESULT,
    ]);

    if (commentsResult.error || lectureReviewsResult.error) {
      return createSupabaseFallbackSnapshot(
        getSupabaseSetupIssue(
          commentsResult.error ?? undefined,
          lectureReviewsResult.error ?? undefined,
        ),
      );
    }

    const schools = (schoolsResult.data ?? []).map(mapSchoolRow);
    const users = (usersResult.data ?? []).map((row: Record<string, unknown>) =>
      mapUserRow(row, schools),
    );

    const snapshot: AppRuntimeSnapshot = {
      schools,
      users,
      posts: postRows.map(mapPostRow),
      comments: ((commentsResult?.data ?? []) as Record<string, unknown>[]).map(mapCommentRow),
      lectures: lectureRows.map(mapLectureRow),
      lectureReviews: ((lectureReviewsResult?.data ?? []) as Record<string, unknown>[]).map(mapLectureReviewRow),
      tradePosts: ((tradePostsResult?.data ?? []) as Record<string, unknown>[]).map(mapTradePostRow),
      notifications: notificationsResult?.error
        ? []
        : ((notificationsResult?.data ?? []) as Record<string, unknown>[]).map(mapNotificationRow),
      reports: reportsResult?.error
        ? []
        : ((reportsResult?.data ?? []) as Record<string, unknown>[]).map(mapReportRow),
      blocks: blocksResult?.error
        ? []
        : ((blocksResult?.data ?? []) as Record<string, unknown>[]).map((row) => ({
            id: String(row.id),
            blockerId: String(row.blocker_id),
            blockedUserId: String(row.blocked_user_id),
            createdAt: String(row.created_at ?? new Date().toISOString()),
          })),
      datingProfiles: datingProfilesResult?.error
        ? []
        : ((datingProfilesResult?.data ?? []) as Record<string, unknown>[]).map(mapDatingProfileRow),
      mediaAssets: mediaAssetsResult?.error
        ? []
        : ((mediaAssetsResult?.data ?? []) as Record<string, unknown>[]).map(mapMediaAssetRow),
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

          const matchedUser = snapshot.users.find((user) => user.id === authUser.id);
          if (!matchedUser) {
            return createFallbackUser(authUser);
          }

          return {
            ...matchedUser,
            email: authUser.email ?? matchedUser.email,
          };
        })()
      : guestUser;

    const requiresPrimaryContent =
      shouldRequirePrimaryContent(scope) && (include.posts || include.lectures);
    if (
      snapshot.schools.length === 0 ||
      (requiresPrimaryContent && snapshot.posts.length === 0 && snapshot.lectures.length === 0)
    ) {
      return createSupabaseFallbackSnapshot(getSupabaseSetupIssue());
    }

    return deriveModerationSnapshot(snapshot);
  } catch (error) {
    return createSupabaseFallbackSnapshot(
      getSupabaseSetupIssue(error instanceof Error ? error : undefined),
    );
  }
}

export async function loadClientRuntimeSnapshot(options?: {
  force?: boolean;
  scope?: RuntimeSnapshotScope;
}): Promise<AppRuntimeSnapshot> {
  const force = options?.force ?? false;
  const scope = options?.scope ?? "full";
  const now = Date.now();
  const cachedSnapshot = lastClientRuntimeSnapshots.get(scope);
  const inFlightSnapshot = clientRuntimeSnapshotPromises.get(scope);

  if (
    !force &&
    cachedSnapshot &&
    now - cachedSnapshot.at < CLIENT_RUNTIME_SNAPSHOT_TTL_MS
  ) {
    return cachedSnapshot.snapshot;
  }

  if (!force && inFlightSnapshot) {
    return inFlightSnapshot;
  }

  const nextSnapshotPromise = fetchClientRuntimeSnapshot(scope)
    .then((snapshot) => {
      lastClientRuntimeSnapshots.set(scope, {
        snapshot,
        at: Date.now(),
      });
      return snapshot;
    })
    .finally(() => {
      clientRuntimeSnapshotPromises.delete(scope);
    });
  clientRuntimeSnapshotPromises.set(scope, nextSnapshotPromise);

  return nextSnapshotPromise;
}

export async function signInWithSupabase(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle(nextPath = "/home") {
  const supabase = createClient();
  const redirectTo =
    typeof window === "undefined"
      ? undefined
      : `${resolveAppUrl(window.location.origin)}/login?next=${encodeURIComponent(nextPath)}`;

  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });
}

export function isGoogleSignInEnabled() {
  return isGoogleAuthEnabled();
}

export async function signUpWithSupabase({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const supabase = createClient();
  const signUpResult = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: email.split("@")[0],
        full_name: email.split("@")[0],
      },
    },
  });

  if (signUpResult.error || !signUpResult.data.user) {
    return signUpResult;
  }

  if (!signUpResult.data.session) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  return signUpResult;
}

export async function signOutFromSupabase() {
  const supabase = createClient();
  const result = await supabase.auth.signOut();
  if (!result.error) {
    resetSupabaseAuthUserCache();
    clearSupabaseSessionStorage();
    invalidateClientRuntimeSnapshots();
  }
  return result;
}

export async function requestStudentVerificationEmail(input: {
  schoolId: string;
  schoolEmail: string;
  nextPath?: string;
}) {
  const response = await fetch("/api/auth/student-verification/request", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; ok?: boolean; alreadyVerified?: boolean }
    | null;

  if (!response.ok) {
    return {
      data: null,
      error: new Error(payload?.error ?? "학교 메일 인증 요청에 실패했습니다."),
    };
  }

  return {
    data: payload ?? { ok: true },
    error: null,
  };
}

export async function upsertUserProfile(user: User) {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const resolvedEmail = authUser?.email ?? user.email;
  const result = await supabase.from("users").upsert(
    {
      id: user.id,
      email: resolvedEmail,
      name: user.name,
      nickname: user.nickname ?? null,
      user_type: fromUserType(user.userType),
      school_id: user.schoolId ?? null,
      department: user.department ?? null,
      grade: user.grade ?? null,
      verified: user.verified,
      adult_verified: user.adultVerified ?? false,
      adult_verified_at: user.adultVerifiedAt ?? null,
      student_verification_status:
        user.studentVerificationStatus ??
        (user.userType === "student" ? "unverified" : "none"),
      school_email: user.schoolEmail ?? null,
      school_email_verified_at: user.schoolEmailVerifiedAt ?? null,
      trust_score: user.trustScore,
      report_count: user.reportCount ?? 0,
      warning_count: user.warningCount ?? 0,
      is_restricted: user.isRestricted ?? false,
      default_visibility_level:
        getStandardVisibilityLevel(
          user.defaultVisibilityLevel ?? getDefaultVisibilityLevel(user),
          user,
        ),
      bio: user.bio ?? null,
      avatar_url: user.avatarUrl ?? null,
    },
    { onConflict: "id" },
  );

  if (!result.error) {
    invalidateClientRuntimeSnapshots();
  }

  return result;
}

export async function createPostRecord(input: {
  authorId: string;
  schoolId?: string;
  category: Post["category"];
  subcategory?: Post["subcategory"];
  visibilityLevel?: VisibilityLevel;
  title: string;
  content: string;
  tags?: string[];
  imageUrl?: string;
  meta?: AdmissionQuestionMeta;
}) {
  const supabase = createClient();
  const scope =
    input.category === "dating" ||
    input.subcategory === "hot" ||
    input.subcategory === "free" ||
    input.subcategory === "advice" ||
    input.subcategory === "ask" ||
    input.subcategory === "anonymous"
      ? "global"
      : "school";
  return supabase
    .from("posts")
    .insert({
      author_id: input.authorId,
      school_id: input.schoolId ?? null,
      category: input.category,
      subcategory: input.subcategory ?? null,
      scope,
      visibility_level:
        input.subcategory === "anonymous"
          ? "anonymous"
          : (input.visibilityLevel ?? "school"),
      title: input.title,
      content: input.content,
      like_count: 0,
      comment_count: 0,
      image_url: input.imageUrl ?? null,
      metadata: {
        ...(input.meta ? input.meta : {}),
        tags: input.tags ?? [],
      },
    })
    .select("*")
    .single();
}

export async function createCommentRecord(input: {
  postId: string;
  authorId: string;
  visibilityLevel?: VisibilityLevel;
  content: string;
}) {
  const supabase = createClient();
  return supabase
    .from("comments")
    .insert({
      post_id: input.postId,
      author_id: input.authorId,
      visibility_level: input.visibilityLevel ?? "school",
      content: input.content,
      accepted: false,
    })
    .select("*")
    .single();
}

export async function acceptCommentRecord(postId: string, commentId: string) {
  const supabase = createClient();
  const resetResult = await supabase.from("comments").update({ accepted: false }).eq("post_id", postId);
  if (resetResult.error) {
    return resetResult;
  }

  return supabase.from("comments").update({ accepted: true }).eq("id", commentId);
}

export async function createLectureReviewRecord(
  input: Omit<LectureReview, "id" | "createdAt"> | LectureReview,
) {
  const supabase = createClient();
  return supabase
    .from("lecture_reviews")
    .insert({
      lecture_id: input.lectureId,
      author_id: input.reviewerId,
      visibility_level: input.visibilityLevel ?? "school",
      difficulty: input.difficulty,
      workload: input.workload,
      attendance: input.attendance,
      exam_style: input.examStyle,
      team_project: input.teamProject,
      presentation: input.presentation,
      grading_style: input.gradingStyle,
      honey_score: input.honeyScore,
      helpful_count: input.helpfulCount,
      short_comment: input.shortComment,
      long_comment: input.longComment,
      semester: input.semester,
    })
    .select("*")
    .single();
}

export async function createTradePostRecord(
  input: Omit<TradePost, "id" | "createdAt"> | TradePost,
) {
  const supabase = createClient();
  return supabase
    .from("trade_posts")
    .insert({
      school_id: input.schoolId,
      semester: input.semester,
      author_id: input.userId,
      visibility_level: input.visibilityLevel ?? "school",
      have_lecture_id: input.haveLectureId,
      want_lecture_id: input.wantLectureId,
      professor: input.professor ?? null,
      section: input.section ?? null,
      time_range: input.timeRange,
      note: input.note,
      status: input.status === "matching" ? "matched" : input.status,
    })
    .select("*")
    .single();
}

export async function upsertDatingProfileRecord(
  input: Omit<DatingProfile, "id"> & { id?: string },
) {
  const supabase = createClient();
  return supabase
    .from("dating_profiles")
    .upsert(
      {
        id: input.id ?? undefined,
        user_id: input.userId,
        school_id: input.schoolId,
        department: input.department ?? null,
        grade: input.grade,
        intro: input.intro,
        vibe_tag: input.vibeTag,
        photo_url: input.photoUrl ?? null,
        is_visible: input.isVisible,
        visibility_level: input.visibilityLevel ?? "profile",
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();
}

export async function createReportRecord(input: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason?: ReportReason;
  memo?: string;
}) {
  const supabase = createClient();
  return supabase
    .from("reports")
    .insert({
      reporter_id: input.reporterId,
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason ?? "other",
      memo: input.memo ?? null,
      status: "pending",
    })
    .select("*")
    .single();
}

export async function createBlockRecord(input: {
  blockerId: string;
  blockedUserId: string;
}) {
  const supabase = createClient();
  return supabase
    .from("blocks")
    .insert({
      blocker_id: input.blockerId,
      blocked_user_id: input.blockedUserId,
    })
    .select("*")
    .single();
}

export async function updateReportStatusRecord(reportId: string, status: ReportStatus) {
  const supabase = createClient();
  return supabase.from("reports").update({ status }).eq("id", reportId);
}
