import { unstable_noStore as noStore } from "next/cache";
import type {
  PostgrestError,
  User as SupabaseAuthUser,
} from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import { PROFILE_IMAGE_BUCKET } from "@/lib/community-profile";
import { measureServerOperation } from "@/lib/ops";
import { deriveModerationSnapshot } from "@/lib/runtime-mutations";
import { getMockRuntimeSnapshot, guestUser } from "@/lib/runtime-state";
import {
  BLOCK_SELECT,
  collectRuntimeUserIds,
  COMMENT_SELECT,
  CURRENT_USER_PROFILE_SELECT,
  DATING_PROFILE_SELECT,
  getServerRuntimeSnapshotTtlMs,
  isServerSnapshotCacheable,
  LECTURE_REVIEW_SELECT,
  LECTURE_SELECT,
  MEDIA_ASSET_SELECT,
  NOTIFICATION_SELECT,
  POLL_OPTION_SELECT,
  POLL_SELECT,
  POLL_VOTE_SELECT,
  POST_SELECT,
  PRIMARY_PROFILE_IMAGE_SELECT,
  PROFILE_PREVIEW_SELECT,
  REPORT_SELECT,
  SCHOOL_SELECT,
  TRADE_POST_SELECT,
} from "@/lib/supabase/runtime-query";
import { getSupabaseSetupIssue } from "@/lib/supabase/setup-issue";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  generateAutoNickname,
  getDefaultVisibilityLevel,
} from "@/lib/user-identity";
import {
  deriveVerificationState,
  toVerificationState,
} from "@/lib/student-verification";
import { buildInviteCode, normalizeReferralCode } from "@/lib/referral-code";
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
  Poll,
  Post,
  Report,
  School,
  StudentVerificationStatus,
  TradePost,
  User,
  UserType,
  VerificationState,
  VisibilityLevel,
} from "@/types";

const hasSupabaseEnv = Boolean(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export type RuntimeSnapshotScope =
  | "full"
  | "home"
  | "search"
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
        notifications: false,
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
  return !["notifications", "profile", "messages"].includes(scope);
}

type RuntimeQueryContext = {
  scope: RuntimeSnapshotScope;
  schoolId?: string;
  userId?: string;
  adultVerified?: boolean;
};

const EMPTY_RESULT = Promise.resolve({ data: [], error: null });
const HOME_POST_LIMIT = 18;
const SEARCH_POST_LIMIT = 48;
const COMMUNITY_POST_LIMIT = 40;
const ADMISSION_POST_LIMIT = 36;
const SCHOOL_POST_LIMIT = 32;
const DATING_POST_LIMIT = 24;
const PROFILE_POST_LIMIT = 32;
const NOTIFICATION_POST_LIMIT = 16;
const FULL_POST_LIMIT = 120;
const COMMENT_LIMIT = 64;
const PROFILE_COMMENT_LIMIT = 48;
const SCHOOL_LECTURE_LIMIT = 16;
const NOTIFICATION_LECTURE_LIMIT = 8;
const FULL_LECTURE_LIMIT = 64;
const LECTURE_REVIEW_LIMIT = 48;
const PROFILE_LECTURE_REVIEW_LIMIT = 48;
const SCHOOL_TRADE_LIMIT = 12;
const PROFILE_TRADE_LIMIT = 16;
const FULL_TRADE_LIMIT = 48;
const NOTIFICATION_LIMIT = 16;
const REPORT_LIMIT = 60;
const BLOCK_LIMIT = 60;
const DATING_PROFILE_LIMIT = 20;
const MEDIA_ASSET_LIMIT = 12;
const SCHOOL_CACHE_TTL_MS = 5 * 60 * 1000;

function asRecordRows(value: unknown) {
  return (value ?? []) as unknown as Record<string, unknown>[];
}

const HOME_POST_SUBCATEGORIES = [
  "free",
  "ask",
  "school",
  "careerInfo",
  "jobPosting",
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
  "careerInfo",
  "jobPosting",
];
const DATING_POST_SUBCATEGORIES = ["dating", "meeting"] as const;
const serverRuntimeSnapshotCache = new Map<string, { snapshot: AppRuntimeSnapshot; at: number }>();
let cachedSchoolRows: { data: Record<string, unknown>[]; at: number } | null = null;
let schoolRowsInFlight:
  | Promise<{ data: Record<string, unknown>[] | null; error: PostgrestError | null }>
  | null = null;

async function loadCachedSchoolRows(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
) {
  if (cachedSchoolRows && Date.now() - cachedSchoolRows.at < SCHOOL_CACHE_TTL_MS) {
    return { data: cachedSchoolRows.data, error: null };
  }

  if (schoolRowsInFlight) {
    return schoolRowsInFlight;
  }

  schoolRowsInFlight = measureServerOperation(
    "runtime.schools",
    async () => {
      const result = await supabase
        .from("schools")
        .select(SCHOOL_SELECT)
        .order("name", { ascending: true });

      if (!result.error && result.data) {
        cachedSchoolRows = {
          data: asRecordRows(result.data),
          at: Date.now(),
        };
      }

      return {
        data: result.error ? null : asRecordRows(result.data),
        error: result.error ?? null,
      };
    },
  ).finally(() => {
    schoolRowsInFlight = null;
  });

  return schoolRowsInFlight;
}

function buildPostQuery(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, context: RuntimeQueryContext) {
  const base = supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false });

  switch (context.scope) {
    case "home":
      return base
        .eq("category", "community")
        .in("subcategory", [...HOME_POST_SUBCATEGORIES])
        .limit(HOME_POST_LIMIT);
    case "search":
      return base.in("category", ["community", "admission"]).limit(SEARCH_POST_LIMIT);
    case "community":
      return base
        .eq("category", "community")
        .in("subcategory", COMMUNITY_POST_SUBCATEGORIES)
        .limit(COMMUNITY_POST_LIMIT);
    case "admission":
      return context.schoolId
        ? base.eq("category", "admission").eq("school_id", context.schoolId).limit(ADMISSION_POST_LIMIT)
        : base.eq("category", "admission").limit(ADMISSION_POST_LIMIT);
    case "school":
      return context.schoolId
        ? base.eq("school_id", context.schoolId).in("category", ["community", "admission"]).limit(SCHOOL_POST_LIMIT)
        : EMPTY_RESULT;
    case "dating":
      return base.eq("category", "community").in("subcategory", [...DATING_POST_SUBCATEGORIES]).limit(DATING_POST_LIMIT);
    case "profile":
      return context.userId ? base.eq("author_id", context.userId).limit(PROFILE_POST_LIMIT) : EMPTY_RESULT;
    case "notifications":
      return base.in("category", ["community", "admission"]).limit(NOTIFICATION_POST_LIMIT);
    case "admin":
    case "full":
    default:
      return base.limit(FULL_POST_LIMIT);
  }
}

function buildCommentQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  context: RuntimeQueryContext,
  postIds: string[],
) {
  const base = supabase.from("comments").select(COMMENT_SELECT).order("created_at", { ascending: false });

  if (context.scope === "profile") {
    return context.userId ? base.eq("author_id", context.userId).limit(PROFILE_COMMENT_LIMIT) : EMPTY_RESULT;
  }

  if (postIds.length === 0) {
    return EMPTY_RESULT;
  }

  return base.in("post_id", postIds).limit(COMMENT_LIMIT);
}

function buildLectureQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  context: RuntimeQueryContext,
) {
  const base = supabase.from("lectures").select(LECTURE_SELECT).order("name", { ascending: true });

  switch (context.scope) {
    case "home":
    case "search":
    case "school":
    case "lectures":
    case "trade":
      return context.schoolId ? base.eq("school_id", context.schoolId).limit(SCHOOL_LECTURE_LIMIT) : base.limit(SCHOOL_LECTURE_LIMIT);
    case "notifications":
      return context.schoolId ? base.eq("school_id", context.schoolId).limit(NOTIFICATION_LECTURE_LIMIT) : base.limit(NOTIFICATION_LECTURE_LIMIT);
    case "admin":
    case "full":
    default:
      return base.limit(FULL_LECTURE_LIMIT);
  }
}

function buildLectureReviewQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  context: RuntimeQueryContext,
  lectureIds: string[],
) {
  const base = supabase.from("lecture_reviews").select(LECTURE_REVIEW_SELECT).order("created_at", { ascending: false });

  if (context.scope === "profile") {
    return context.userId ? base.eq("author_id", context.userId).limit(PROFILE_LECTURE_REVIEW_LIMIT) : EMPTY_RESULT;
  }

  if (lectureIds.length === 0) {
    return EMPTY_RESULT;
  }

  return base.in("lecture_id", lectureIds).limit(LECTURE_REVIEW_LIMIT);
}

function buildTradePostsQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  context: RuntimeQueryContext,
) {
  const base = supabase.from("trade_posts").select(TRADE_POST_SELECT).order("created_at", { ascending: false });

  switch (context.scope) {
    case "home":
    case "school":
    case "lectures":
    case "trade":
    case "notifications":
      return context.schoolId ? base.eq("school_id", context.schoolId).limit(SCHOOL_TRADE_LIMIT) : base.limit(SCHOOL_TRADE_LIMIT);
    case "profile":
      return context.userId ? base.eq("author_id", context.userId).limit(PROFILE_TRADE_LIMIT) : EMPTY_RESULT;
    case "messages":
      return context.userId ? base.eq("author_id", context.userId).limit(PROFILE_TRADE_LIMIT) : EMPTY_RESULT;
    case "admin":
    case "full":
    default:
      return base.limit(FULL_TRADE_LIMIT);
  }
}

function buildNotificationsQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  context: RuntimeQueryContext,
) {
  return context.userId
    ? supabase
        .from("notifications")
        .select(NOTIFICATION_SELECT)
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(NOTIFICATION_LIMIT)
    : EMPTY_RESULT;
}

function buildReportsQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  context: RuntimeQueryContext,
) {
  const base = supabase.from("reports").select(REPORT_SELECT).order("created_at", { ascending: false });
  if (context.scope === "admin" || context.scope === "full") {
    return base.limit(REPORT_LIMIT);
  }
  return context.userId ? base.eq("reporter_id", context.userId).limit(REPORT_LIMIT) : EMPTY_RESULT;
}

function buildBlocksQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  context: RuntimeQueryContext,
) {
  const base = supabase.from("blocks").select(BLOCK_SELECT).order("created_at", { ascending: false });
  if (context.scope === "admin" || context.scope === "full") {
    return base.limit(BLOCK_LIMIT);
  }
  return context.userId ? base.eq("blocker_id", context.userId).limit(BLOCK_LIMIT) : EMPTY_RESULT;
}

function buildDatingProfilesQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  context: RuntimeQueryContext,
) {
  const base = supabase.from("dating_profiles").select(DATING_PROFILE_SELECT).order("created_at", { ascending: false });

  if (context.scope === "profile") {
    return context.userId ? base.eq("user_id", context.userId).limit(8) : EMPTY_RESULT;
  }

  return base.limit(DATING_PROFILE_LIMIT);
}

function buildMediaAssetsQuery(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  context: RuntimeQueryContext,
) {
  const base = supabase.from("media_assets").select(MEDIA_ASSET_SELECT).order("created_at", { ascending: false });
  if (context.scope === "admin" || context.scope === "full") {
    return base.limit(MEDIA_ASSET_LIMIT);
  }
  return context.userId ? base.eq("owner_id", context.userId).limit(MEDIA_ASSET_LIMIT) : EMPTY_RESULT;
}

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
  if (value === "applicant" || value === "high_school" || value === "highschool") {
    return "applicant";
  }
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

const toVerificationStateValue = (
  value?: string | null,
  input?: {
    userType?: UserType | null;
    studentVerificationStatus?: string | null;
    verified?: boolean;
    schoolEmailVerifiedAt?: string | null;
  },
): VerificationState => {
  const direct = toVerificationState(value);
  if (direct) {
    return direct;
  }

  return deriveVerificationState({
    userType: input?.userType,
    verificationState: value,
    studentVerificationStatus: input?.studentVerificationStatus,
    verified: input?.verified,
    schoolEmailVerifiedAt: input?.schoolEmailVerifiedAt,
  });
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

async function createServerProfileImageUrl(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  path: string,
) {
  const { data, error } = await supabase.storage
    .from(PROFILE_IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    return undefined;
  }

  return data.signedUrl;
}

async function buildVisibleProfilePreviewMap(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userIds: string[],
  canReadProfiles: boolean,
) {
  const empty = new Map<string, {
    bio?: string;
    interests: string[];
    primaryImageUrl?: string;
  }>();

  if (!canReadProfiles || userIds.length === 0) {
    return empty;
  }

  const [profilesResult, primaryImagesResult] = await Promise.all([
    supabase.from("profiles").select(PROFILE_PREVIEW_SELECT).in("id", userIds),
    supabase
      .from("profile_images")
      .select(PRIMARY_PROFILE_IMAGE_SELECT)
      .in("user_id", userIds)
      .eq("is_primary", true)
      .eq("moderation_status", "approved"),
  ]);

  if (profilesResult.error || primaryImagesResult.error) {
    return empty;
  }

  const primaryImageUrlEntries = await Promise.all(
    asRecordRows(primaryImagesResult.data).map(async (row) => [
      String(row.user_id),
      await createServerProfileImageUrl(supabase, String(row.image_path)),
    ] as const),
  );
  const primaryImageUrlByUserId = new Map(
    primaryImageUrlEntries.filter(([, value]) => Boolean(value)),
  );

  for (const row of asRecordRows(profilesResult.data)) {
    empty.set(String(row.id), {
      bio: row.bio ? String(row.bio) : undefined,
      interests: Array.isArray(row.interests)
        ? row.interests.map((value) => String(value)).filter(Boolean)
        : [],
      primaryImageUrl: primaryImageUrlByUserId.get(String(row.id)),
    });
  }

  return empty;
}

function mapUserRow(row: Record<string, unknown>, schools: School[]): User {
  const school = schools.find((item) => item.id === String(row.school_id ?? ""));
  const userType = toUserType(row.user_type as string | null | undefined);
  const studentVerificationStatus = toStudentVerificationStatus(
    row.student_verification_status as string | null | undefined,
    Boolean(row.verified),
  );
  const verificationState = toVerificationStateValue(
    row.verification_state as string | null | undefined,
    {
      userType,
      studentVerificationStatus,
      verified: Boolean(row.verified),
      schoolEmailVerifiedAt: row.school_email_verified_at as string | null | undefined,
    },
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
    referralCode: row.referral_code ? String(row.referral_code) : undefined,
    referredByCode: row.referred_by_code ? String(row.referred_by_code) : undefined,
    referredByUserId: row.referred_by_user_id ? String(row.referred_by_user_id) : undefined,
    userType,
    schoolId: row.school_id ? String(row.school_id) : undefined,
    department: row.department ? String(row.department) : undefined,
    grade: typeof row.grade === "number" ? row.grade : undefined,
    verified: verificationState === "student_verified" || Boolean(row.verified),
    adultVerified: Boolean(row.adult_verified),
    adultVerifiedAt: row.adult_verified_at ? String(row.adult_verified_at) : undefined,
    studentVerificationStatus,
    verificationState,
    verificationScore:
      typeof row.verification_score === "number" ? row.verification_score : 0,
    verificationRequestedAt: row.verification_requested_at
      ? String(row.verification_requested_at)
      : undefined,
    verificationReviewedAt: row.verification_reviewed_at
      ? String(row.verification_reviewed_at)
      : undefined,
    verificationRejectionReason: row.verification_rejection_reason
      ? String(row.verification_rejection_reason)
      : undefined,
    schoolEmail: row.school_email ? String(row.school_email) : undefined,
    schoolEmailVerifiedAt: row.school_email_verified_at
      ? String(row.school_email_verified_at)
      : undefined,
    studentNumber: row.student_number ? String(row.student_number) : undefined,
    admissionYear: typeof row.admission_year === "number" ? row.admission_year : undefined,
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

function buildPollMap(
  pollRows: Record<string, unknown>[],
  optionRows: Record<string, unknown>[],
  voteRows: Record<string, unknown>[],
) {
  const userVoteByPollId = new Map<string, string>();
  for (const row of voteRows) {
    userVoteByPollId.set(String(row.poll_id), String(row.option_id));
  }

  const optionsByPollId = new Map<string, Array<Record<string, unknown>>>();
  for (const row of optionRows) {
    const pollId = String(row.poll_id);
    optionsByPollId.set(pollId, [...(optionsByPollId.get(pollId) ?? []), row]);
  }

  const pollMap = new Map<string, Poll>();
  for (const row of pollRows) {
    const pollId = String(row.id);
    const postId = String(row.post_id);
    const options = [...(optionsByPollId.get(pollId) ?? [])].sort(
      (a, b) => Number(a.position ?? 0) - Number(b.position ?? 0),
    );
    const totalVotes = options.reduce(
      (sum, option) => sum + (typeof option.vote_count === "number" ? option.vote_count : 0),
      0,
    );
    const votedOptionId = userVoteByPollId.get(pollId);

    pollMap.set(postId, {
      id: pollId,
      postId,
      question: String(row.question),
      totalVotes,
      votedOptionId,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      options: options.map((option) => {
        const voteCount = typeof option.vote_count === "number" ? option.vote_count : 0;
        return {
          id: String(option.id),
          text: String(option.option_text),
          voteCount,
          percentage: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
          selected: votedOptionId === String(option.id),
        };
      }),
    });
  }

  return pollMap;
}

function mapPostRow(row: Record<string, unknown>, poll?: Poll): Post {
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
      viewCount:
        typeof row.view_count === "number"
          ? row.view_count
          : typeof metadata?.viewCount === "number"
            ? metadata.viewCount
            : undefined,
      likes,
      commentCount,
    }),
    hotScore: typeof row.hot_score === "number" ? row.hot_score : 0,
    pollVoteCount:
      typeof row.poll_vote_count === "number"
        ? row.poll_vote_count
        : poll?.totalVotes ?? 0,
    postType:
      row.post_type === "poll" ||
      row.post_type === "question" ||
      row.post_type === "balance"
        ? row.post_type
        : "normal",
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
    poll: poll ?? null,
  };
}

function mapCommentRow(row: Record<string, unknown>): Comment {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    parentCommentId: row.parent_comment_id ? String(row.parent_comment_id) : undefined,
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
    courseName: String(row.name),
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
    referralCode: buildInviteCode(authUser.id),
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

function getReferralCodeFromAuthUser(authUser: SupabaseAuthUser) {
  const rawCode =
    typeof authUser.user_metadata.referral_code === "string"
      ? authUser.user_metadata.referral_code
      : undefined;
  return normalizeReferralCode(rawCode);
}

async function resolveReferrerUserId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  referralCode?: string,
  currentUserId?: string,
) {
  const normalizedCode = normalizeReferralCode(referralCode);
  if (!normalizedCode) {
    return null;
  }

  const ownCode = currentUserId ? buildInviteCode(currentUserId) : undefined;
  if (ownCode && normalizedCode === ownCode) {
    return null;
  }

  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("referral_code", normalizedCode)
    .maybeSingle();

  return data?.id ? String(data.id) : null;
}

async function ensureProfileRow(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, authUser: SupabaseAuthUser) {
  const referralCode = buildInviteCode(authUser.id);
  const referredByCode = getReferralCodeFromAuthUser(authUser);
  const referredByUserId = await resolveReferrerUserId(supabase, referredByCode, authUser.id);

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
      referral_code: referralCode,
      referred_by_code: referredByCode ?? null,
      referred_by_user_id: referredByUserId,
    },
    { onConflict: "id" },
  );
}

function getServerSnapshotCacheKey(
  scope: RuntimeSnapshotScope,
  authUserId?: string,
  schoolId?: string,
  adultVerified?: boolean,
) {
  return [scope, authUserId ?? "guest", schoolId ?? "all", adultVerified ? "adult" : "base"].join(":");
}

export async function loadServerRuntimeSnapshot(
  scope: RuntimeSnapshotScope = "full",
): Promise<AppRuntimeSnapshot> {
  if (!isServerSnapshotCacheable(scope)) {
    noStore();
  }

  if (!hasSupabaseEnv) {
    return createSupabaseFallbackSnapshot();
  }

  try {
    const supabase = await createServerSupabaseClient();
    const include = getSnapshotIncludeConfig(scope);
    const {
      data: { user: authUser },
    } = await measureServerOperation("runtime.auth.get_user", () => supabase.auth.getUser(), { scope });

    let currentUserProfileResult = authUser
      ? await measureServerOperation(
          "runtime.current_user_profile",
          () => supabase.from("users").select(CURRENT_USER_PROFILE_SELECT).eq("id", authUser.id).single(),
          { scope },
        )
      : null;

    if (authUser && currentUserProfileResult?.error) {
      await ensureProfileRow(supabase, authUser);
      currentUserProfileResult = await measureServerOperation(
        "runtime.current_user_profile_refetch",
        () => supabase.from("users").select(CURRENT_USER_PROFILE_SELECT).eq("id", authUser.id).single(),
        { scope },
      );
    }

    const currentUserProfileRow =
      currentUserProfileResult?.error || !currentUserProfileResult?.data
        ? null
        : (currentUserProfileResult.data as unknown as Record<string, unknown>);
    const queryContext: RuntimeQueryContext = {
      scope,
      schoolId: currentUserProfileRow?.school_id ? String(currentUserProfileRow.school_id) : undefined,
      userId: authUser?.id,
      adultVerified: Boolean(currentUserProfileRow?.adult_verified),
    };
    const cacheKey = getServerSnapshotCacheKey(
      scope,
      authUser?.id,
      queryContext.schoolId,
      queryContext.adultVerified,
    );
    const cacheTtlMs = getServerRuntimeSnapshotTtlMs(scope);
    const cachedSnapshot = serverRuntimeSnapshotCache.get(cacheKey);

    if (
      isServerSnapshotCacheable(scope) &&
      cachedSnapshot &&
      Date.now() - cachedSnapshot.at < cacheTtlMs
    ) {
      return cachedSnapshot.snapshot;
    }

    const [
      schoolsResult,
      postsResult,
      lecturesResult,
    ] = await measureServerOperation(
      "runtime.primary_queries",
      () =>
        Promise.all([
          loadCachedSchoolRows(supabase),
          include.posts ? buildPostQuery(supabase, queryContext) : EMPTY_RESULT,
          include.lectures ? buildLectureQuery(supabase, queryContext) : EMPTY_RESULT,
        ]),
      { scope, schoolId: queryContext.schoolId },
    );

    if (schoolsResult.error || !schoolsResult.data) {
      return createSupabaseFallbackSnapshot(getSupabaseSetupIssue(schoolsResult.error));
    }

    if (postsResult?.error || lecturesResult?.error) {
      return createSupabaseFallbackSnapshot(
        getSupabaseSetupIssue(
          postsResult?.error ?? undefined,
          lecturesResult?.error ?? undefined,
        ),
      );
    }

    const postRows = asRecordRows(postsResult?.data);
    const lectureRows = asRecordRows(lecturesResult?.data);
    const postIds = postRows.map((row) => String(row.id));
    const lectureIds = lectureRows.map((row) => String(row.id));
    const pollsResult =
      include.posts && postIds.length > 0
        ? await measureServerOperation(
            "runtime.polls",
            () => supabase.from("polls").select(POLL_SELECT).in("post_id", postIds),
            { scope, postCount: postIds.length },
          )
        : { data: [], error: null };
    const pollRows = asRecordRows(pollsResult.data);
    const pollIds = pollRows.map((row) => String(row.id));

    const [
      commentsResult,
      lectureReviewsResult,
      tradePostsResult,
      notificationsResult,
      reportsResult,
      blocksResult,
      datingProfilesResult,
      mediaAssetsResult,
      pollOptionsResult,
      pollVotesResult,
    ] = await measureServerOperation(
      "runtime.secondary_queries",
      () =>
        Promise.all([
          include.comments ? buildCommentQuery(supabase, queryContext, postIds) : EMPTY_RESULT,
          include.lectureReviews ? buildLectureReviewQuery(supabase, queryContext, lectureIds) : EMPTY_RESULT,
          authUser && include.tradePosts ? buildTradePostsQuery(supabase, queryContext) : EMPTY_RESULT,
          authUser && include.notifications ? buildNotificationsQuery(supabase, queryContext) : EMPTY_RESULT,
          authUser && include.reports ? buildReportsQuery(supabase, queryContext) : EMPTY_RESULT,
          authUser && include.blocks ? buildBlocksQuery(supabase, queryContext) : EMPTY_RESULT,
          authUser && include.datingProfiles ? buildDatingProfilesQuery(supabase, queryContext) : EMPTY_RESULT,
          authUser && include.mediaAssets ? buildMediaAssetsQuery(supabase, queryContext) : EMPTY_RESULT,
          pollIds.length > 0
            ? supabase.from("poll_options").select(POLL_OPTION_SELECT).in("poll_id", pollIds)
            : EMPTY_RESULT,
          authUser && pollIds.length > 0
            ? supabase.from("poll_votes").select(POLL_VOTE_SELECT).eq("user_id", authUser.id).in("poll_id", pollIds)
            : EMPTY_RESULT,
        ]),
      { scope, postCount: postIds.length, lectureCount: lectureIds.length, pollCount: pollIds.length },
    );

    if (
      commentsResult.error ||
      lectureReviewsResult.error ||
      pollsResult.error ||
      pollOptionsResult.error ||
      pollVotesResult?.error
    ) {
      return createSupabaseFallbackSnapshot(
        getSupabaseSetupIssue(
          commentsResult.error ?? undefined,
          lectureReviewsResult.error ?? undefined,
          pollsResult.error ?? undefined,
          pollOptionsResult.error ?? undefined,
          pollVotesResult?.error ?? undefined,
        ),
      );
    }

    const schools = schoolsResult.data.map(mapSchoolRow);
    const relatedUserIds = collectRuntimeUserIds({
      currentUserId: authUser?.id,
      postRows,
      commentRows: asRecordRows(commentsResult?.data),
      lectureReviewRows: asRecordRows(lectureReviewsResult?.data),
      tradePostRows: asRecordRows(tradePostsResult?.data),
      datingProfileRows: asRecordRows(datingProfilesResult?.data),
      blockRows: asRecordRows(blocksResult?.data),
    });
    const usersResult =
      relatedUserIds.length > 0
        ? await measureServerOperation(
            "runtime.related_user_profiles",
            () => supabase.rpc("list_user_public_profiles_by_ids", { user_ids: relatedUserIds }),
            { scope, userCount: relatedUserIds.length },
          )
        : { data: [], error: null };

    if (usersResult.error) {
      return createSupabaseFallbackSnapshot(getSupabaseSetupIssue(usersResult.error));
    }

    const profilePreviewTargetIds = authUser?.id
      ? relatedUserIds.filter((id) => id !== authUser.id)
      : relatedUserIds;
    const profilePreviewByUserId = await buildVisibleProfilePreviewMap(
      supabase,
      profilePreviewTargetIds,
      currentUserProfileRow?.verification_state === "student_verified",
    );
    const users = (usersResult.data ?? []).map((row: Record<string, unknown>) => {
      const mappedUser = mapUserRow(row as unknown as Record<string, unknown>, schools);
      const profilePreview = profilePreviewByUserId.get(mappedUser.id);

      return profilePreview
        ? {
            ...mappedUser,
            profileBio: profilePreview.bio ?? mappedUser.bio,
            profileInterests: profilePreview.interests,
            profilePrimaryImageUrl: profilePreview.primaryImageUrl,
          }
        : mappedUser;
    });
    const pollMap = buildPollMap(
      pollRows,
      asRecordRows(pollOptionsResult?.data),
      asRecordRows(pollVotesResult?.data),
    );

    const snapshot: AppRuntimeSnapshot = {
      schools,
      users,
      posts: postRows.map((row) =>
        mapPostRow(row as unknown as Record<string, unknown>, pollMap.get(String(row.id))),
      ),
      comments: asRecordRows(commentsResult?.data).map((row) =>
        mapCommentRow(row as unknown as Record<string, unknown>),
      ),
      lectures: lectureRows.map((row) => mapLectureRow(row as unknown as Record<string, unknown>)),
      lectureReviews: asRecordRows(lectureReviewsResult?.data).map((row) =>
        mapLectureReviewRow(row as unknown as Record<string, unknown>),
      ),
      tradePosts: asRecordRows(tradePostsResult?.data).map((row) =>
        mapTradePostRow(row as unknown as Record<string, unknown>),
      ),
      notifications: notificationsResult?.error
        ? []
        : asRecordRows(notificationsResult?.data).map((row) =>
            mapNotificationRow(row as unknown as Record<string, unknown>),
          ),
      reports: reportsResult?.error
        ? []
        : asRecordRows(reportsResult?.data).map((row) =>
            mapReportRow(row as unknown as Record<string, unknown>),
          ),
      blocks: blocksResult?.error
        ? []
        : asRecordRows(blocksResult?.data).map((row) => ({
            id: String((row as Record<string, unknown>).id),
            blockerId: String((row as Record<string, unknown>).blocker_id),
            blockedUserId: String((row as Record<string, unknown>).blocked_user_id),
            createdAt: String((row as Record<string, unknown>).created_at ?? new Date().toISOString()),
          })),
      datingProfiles: datingProfilesResult?.error
        ? []
        : asRecordRows(datingProfilesResult?.data).map((row) =>
            mapDatingProfileRow(row as unknown as Record<string, unknown>),
          ),
      mediaAssets: mediaAssetsResult?.error
        ? []
        : asRecordRows(mediaAssetsResult?.data).map((row) =>
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
          const privateProfileRow = currentUserProfileRow;

          if (privateProfileRow) {
            const visibleProfile = users.find((item: User) => item.id === authUser.id);

            return {
              ...mapUserRow(privateProfileRow, schools),
              email: authUser.email ?? String(privateProfileRow.email ?? ""),
              profileBio: visibleProfile?.profileBio,
              profileInterests: visibleProfile?.profileInterests,
              profilePrimaryImageUrl: visibleProfile?.profilePrimaryImageUrl,
            };
          }

          return users.find((user: User) => user.id === authUser.id) ?? createFallbackUser(authUser);
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

    const finalSnapshot = deriveModerationSnapshot(snapshot);

    if (isServerSnapshotCacheable(scope)) {
      serverRuntimeSnapshotCache.set(cacheKey, {
        snapshot: finalSnapshot,
        at: Date.now(),
      });
    }

    return finalSnapshot;
  } catch (error) {
    return createSupabaseFallbackSnapshot(
      getSupabaseSetupIssue(error instanceof Error ? error : undefined),
    );
  }
}
