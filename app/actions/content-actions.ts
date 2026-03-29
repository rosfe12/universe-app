"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isMasterAdminEmail } from "@/lib/admin/master-admin-shared";
import { PROFILE_IMAGE_BUCKET } from "@/lib/community-profile";
import { classifyContentLevel, findBlockedKeyword } from "@/lib/moderation";
import { insertNotificationsAsSystem } from "@/lib/notifications/server-notifications";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MEDIA_BUCKET, getStoragePathFromPublicUrl } from "@/lib/supabase/storage";
import { getDefaultVisibilityLevel, isReliabilityRestricted } from "@/lib/user-identity";

const visibilitySchema = z.enum([
  "anonymous",
  "school",
  "schoolDepartment",
  "profile",
]);

const reportReasonSchema = z.enum([
  "misinformation",
  "abuse",
  "spam",
  "harassment",
  "fraud",
  "sexual_content",
  "other",
]);

const VERIFICATION_DOCUMENTS_BUCKET = "verification-documents";

const postSchema = z.object({
  category: z.enum(["admission", "community", "dating"]),
  subcategory: z
    .enum([
      "free",
      "club",
      "meetup",
      "food",
      "advice",
      "ask",
      "anonymous",
      "school",
      "hot",
      "freshman",
      "dating",
      "meeting",
    ])
    .optional(),
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(5000),
  schoolId: z.string().uuid().optional(),
  visibilityLevel: visibilitySchema.optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string().trim().min(1).max(20)).max(8).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  postType: z.enum(["normal", "poll", "question", "balance"]).default("normal"),
  pollQuestion: z.string().trim().min(1).max(140).optional(),
  pollOptions: z.array(z.string().trim().min(1).max(80)).min(2).max(4).optional(),
});

const commentSchema = z.object({
  postId: z.string().uuid(),
  parentCommentId: z.string().uuid().optional(),
  content: z.string().trim().min(1).max(1000),
  visibilityLevel: visibilitySchema.optional(),
});

const lectureReviewSchema = z.object({
  lectureId: z.string().uuid(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  workload: z.enum(["light", "medium", "heavy"]),
  attendance: z.enum(["flexible", "medium", "strict"]),
  examStyle: z.enum(["multipleChoice", "essay", "project", "mixed"]),
  teamProject: z.boolean(),
  presentation: z.boolean().default(false),
  gradingStyle: z.enum(["tough", "medium", "generous"]),
  honeyScore: z.number().int().min(0).max(100),
  shortComment: z.string().trim().min(5).max(120),
  longComment: z.string().trim().min(20).max(4000),
  semester: z.string().trim().min(4).max(20),
  visibilityLevel: visibilitySchema.optional(),
});

const tradePostSchema = z.object({
  schoolId: z.string().uuid().optional(),
  semester: z.string().trim().min(2).max(20).default(""),
  haveLectureId: z.string().uuid(),
  wantLectureId: z.string().uuid(),
  professor: z.string().trim().max(60).optional(),
  section: z.string().trim().max(20).optional(),
  timeRange: z.string().trim().max(80).default(""),
  note: z.string().trim().max(1000).default(""),
  status: z.enum(["open", "matching", "closed"]).default("open"),
  visibilityLevel: visibilitySchema.optional(),
});

const tradeMessageSchema = z.object({
  tradePostId: z.string().uuid(),
  content: z.string().trim().min(1).max(1000),
});

const datingProfileSchema = z.object({
  schoolId: z.string().uuid().optional(),
  department: z.string().trim().max(80).optional(),
  grade: z.number().int().min(1).max(6),
  intro: z.string().trim().min(1).max(160),
  vibeTag: z.string().trim().min(1).max(40),
  photoUrl: z.string().url().optional(),
  visibilityLevel: visibilitySchema.default("profile"),
  isVisible: z.boolean().default(true),
});

const datingPostSchema = z.object({
  title: z.string().trim().min(3).max(120),
  content: z.string().trim().min(6).max(5000),
  vibeTag: z.string().trim().min(2).max(40),
  photoUrl: z.string().url().optional(),
  visibilityLevel: visibilitySchema.default("profile"),
  subcategory: z.enum(["dating", "meeting"]).default("dating"),
});

const reportContentSchema = z.object({
  targetType: z.enum(["post", "comment", "review", "profile", "user"]),
  targetId: z.string().uuid(),
  reason: reportReasonSchema,
  memo: z.string().trim().max(500).optional(),
});

const blockUserSchema = z.object({
  blockedUserId: z.string().uuid(),
});

type CurrentProfile = {
  id: string;
  user_type: "student" | "applicant" | "freshman";
  school_id: string | null;
  department: string | null;
  grade: number | null;
  verified: boolean;
  adult_verified: boolean;
  adult_verified_at: string | null;
  verification_state:
    | "guest"
    | "email_verified"
    | "student_verified"
    | "manual_review"
    | "rejected"
    | null;
  verification_score: number | null;
  verification_rejection_reason: string | null;
  student_verification_status:
    | "none"
    | "unverified"
    | "pending"
    | "verified"
    | "rejected"
    | null;
  school_email: string | null;
  student_number: string | null;
  admission_year: number | null;
  is_restricted: boolean;
  trust_score: number;
  default_visibility_level: "anonymous" | "school" | "schoolDepartment" | "profile";
};

const ONE_MINUTE_MS = 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_REPORTS_PER_DAY = 20;

function normalizeModerationText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function occurredWithin(createdAt: string, windowMs: number) {
  return Date.now() - new Date(createdAt).getTime() <= windowMs;
}

function windowStart(windowMs: number) {
  return new Date(Date.now() - windowMs).toISOString();
}

async function requireCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select(
      "id, user_type, school_id, department, grade, verified, adult_verified, adult_verified_at, verification_state, verification_score, verification_rejection_reason, student_verification_status, school_email, student_number, admission_year, is_restricted, trust_score, default_visibility_level",
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("온보딩을 먼저 완료해야 합니다.");
  }

  if (profile.is_restricted) {
    throw new Error("현재 계정은 작성이 제한되어 있습니다.");
  }

  return {
    supabase,
    authUser: user,
    profile: profile as CurrentProfile,
  };
}

function ensureWritableTrustLevel(profile: CurrentProfile) {
  if (isReliabilityRestricted(profile.trust_score)) {
    throw new Error("현재 계정은 활동 제한 상태라 글쓰기와 댓글 작성이 잠시 제한됩니다.");
  }
}

async function awardTrustScore(userId: string, delta: number) {
  if (!delta) return;

  const admin = createAdminSupabaseClient();
  const { data: profileRow, error: readError } = await admin
    .from("users")
    .select("trust_score")
    .eq("id", userId)
    .single();

  if (readError) {
    throw new Error(readError.message);
  }

  const nextTrustScore = Math.round(
    (typeof profileRow?.trust_score === "number" ? profileRow.trust_score : 0) + delta,
  );

  const { error: updateError } = await admin
    .from("users")
    .update({ trust_score: nextTrustScore })
    .eq("id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

function requireVerifiedStudentProfile(
  profile: CurrentProfile,
  featureLabel: string,
  authEmail?: string | null,
) {
  if (isMasterAdminEmail(authEmail)) {
    return;
  }

  if (profile.user_type !== "student") {
    throw new Error(`${featureLabel}은 대학생만 사용할 수 있습니다.`);
  }

  if (
    profile.verification_state !== "student_verified" ||
    !profile.school_id
  ) {
    throw new Error(`${featureLabel}은 대학생 인증을 완료한 학생만 사용할 수 있습니다.`);
  }
}

function inferScope(input: {
  category: "admission" | "community" | "dating";
  subcategory?: string;
  tags?: string[];
}) {
  if (
    input.category === "dating" ||
    input.subcategory === "free" ||
    input.subcategory === "advice" ||
    input.subcategory === "ask" ||
    input.subcategory === "anonymous" ||
    input.subcategory === "hot" ||
    ("tags" in input &&
      Array.isArray(input.tags) &&
      input.tags.some((tag) => tag === "취업정보" || tag === "채용공고"))
  ) {
    return "global" as const;
  }

  return "school" as const;
}

function revalidateFeed(paths: string[]) {
  paths.forEach((path) => revalidatePath(path));
}

function calculateHotScore(input: {
  likeCount: number;
  commentCount: number;
  viewCount: number;
  pollVoteCount: number;
  createdAt: string;
}) {
  const hours = Math.max(
    0,
    (Date.now() - new Date(input.createdAt).getTime()) / (1000 * 60 * 60),
  );

  const baseScore =
    input.likeCount * 2 +
    input.commentCount * 3 +
    input.viewCount * 0.1 +
    input.pollVoteCount * 2;

  return Math.round((baseScore / (hours + 2)) * 100) / 100;
}

async function recalculatePostHotScore(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  postId: string,
) {
  const { data: postRow, error: postError } = await admin
    .from("posts")
    .select("id, like_count, comment_count, view_count, poll_vote_count, created_at, school_id, title, category, subcategory, metadata")
    .eq("id", postId)
    .single();

  if (postError || !postRow) {
    throw new Error(postError?.message ?? "게시글 점수를 계산할 수 없습니다.");
  }

  const nextHotScore = calculateHotScore({
    likeCount: typeof postRow.like_count === "number" ? postRow.like_count : 0,
    commentCount: typeof postRow.comment_count === "number" ? postRow.comment_count : 0,
    viewCount: typeof postRow.view_count === "number" ? postRow.view_count : 0,
    pollVoteCount:
      typeof postRow.poll_vote_count === "number" ? postRow.poll_vote_count : 0,
    createdAt: String(postRow.created_at),
  });

  const { error: updateError } = await admin
    .from("posts")
    .update({ hot_score: nextHotScore })
    .eq("id", postId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { ...postRow, hot_score: nextHotScore };
}

async function syncPostCommentCount(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  postId: string,
) {
  const { count, error } = await admin
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);

  if (error) {
    throw new Error(error.message);
  }

  const { error: updateError } = await admin
    .from("posts")
    .update({ comment_count: count ?? 0 })
    .eq("id", postId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

async function maybeCreateSchoolHotNotifications(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  post: {
    id: string;
    author_id: string;
    school_id: string | null;
    hot_score?: number | null;
    title: string;
    category: "admission" | "community" | "dating";
    subcategory?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  if (!post.school_id || Number(post.hot_score ?? 0) < 18) {
    return;
  }

  const recentWindow = windowStart(ONE_DAY_MS);
  const { data: existingRows } = await admin
    .from("notifications")
    .select("id")
    .eq("type", "school_recommendation")
    .eq("target_id", post.id)
    .gte("created_at", recentWindow)
    .limit(1);

  if ((existingRows ?? []).length > 0) {
    return;
  }

  const { data: schoolUsers } = await admin
    .from("users")
    .select("id")
    .eq("school_id", post.school_id)
    .neq("id", post.author_id)
    .limit(40);

  if (!schoolUsers?.length) {
    return;
  }

  const href = getPostNotificationHref({
    id: String(post.id),
    category: post.category,
    subcategory: post.subcategory ?? undefined,
    metadata: post.metadata ?? undefined,
  });

  await insertNotificationsAsSystem(
    schoolUsers.map((user) => ({
      user_id: String(user.id),
      type: "school_recommendation",
      title: "지금 우리학교에서 반응이 빠르게 붙고 있어요",
      body: post.title,
      href,
      target_type: "post",
      target_id: String(post.id),
      source_kind: "activity",
      delivery_mode: "instant",
      metadata: {
        postId: String(post.id),
        hotScore: Number(post.hot_score ?? 0),
      },
    })),
  );
}

async function createPollForPost(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  postId: string,
  question: string,
  options: string[],
) {
  const normalizedOptions = options
    .map((option) => option.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (normalizedOptions.length < 2) {
    throw new Error("투표 선택지는 2개 이상 필요합니다.");
  }

  const { data: pollRow, error: pollError } = await admin
    .from("polls")
    .insert({
      post_id: postId,
      question,
    })
    .select("*")
    .single();

  if (pollError || !pollRow) {
    throw new Error(pollError?.message ?? "투표를 생성하지 못했습니다.");
  }

  const { error: optionError } = await admin.from("poll_options").insert(
    normalizedOptions.map((optionText, index) => ({
      poll_id: String(pollRow.id),
      option_text: optionText,
      position: index + 1,
    })),
  );

  if (optionError) {
    throw new Error(optionError.message);
  }
}

function getCommunityFilterFromPost(post: {
  category: "admission" | "community" | "dating";
  subcategory?: string | null;
  metadata?: { tags?: string[] } | null;
}) {
  if (post.category === "dating") {
    return post.subcategory === "meeting" ? "meeting" : "dating";
  }

  if (post.category !== "community") {
    return undefined;
  }

  if (post.metadata?.tags?.includes("취업정보") || post.metadata?.tags?.includes("채용공고")) {
    return "career";
  }

  if (post.subcategory === "anonymous") return "anonymous";
  if (post.subcategory === "hot") return "hot";
  if (post.subcategory === "free") return "free";
  if (post.subcategory === "ask") return "ask";
  return "advice";
}

function getPostNotificationHref(post: {
  id: string;
  category: "admission" | "community" | "dating";
  subcategory?: string | null;
  metadata?: { tags?: string[] } | null;
}) {
  if (post.category === "admission") {
    return `/school?tab=admission&post=${post.id}`;
  }

  if (post.category === "dating") {
    return "/dating";
  }

  if (post.subcategory === "school") {
    return `/school?tab=school&post=${post.id}`;
  }

  const filter = getCommunityFilterFromPost(post);
  return filter ? `/community?filter=${filter}&post=${post.id}` : "/community";
}

async function guardPostSubmission(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  authUserId: string,
  values: z.infer<typeof postSchema>,
) {
  const contentText = `${values.title} ${values.content}`;
  const keyword = findBlockedKeyword(contentText);
  if (keyword) {
    throw new Error(`부적절한 표현(${keyword})이 포함되어 있습니다.`);
  }

  if (classifyContentLevel(contentText) === "obscene") {
    throw new Error("노골적인 성적 표현은 등록할 수 없습니다.");
  }

  const { data, error } = await supabase
    .from("posts")
    .select("title, content, category, created_at")
    .eq("author_id", authUserId)
    .gte("created_at", windowStart(TEN_MINUTES_MS))
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  const recentRows = data ?? [];
  const sameCategoryCount = recentRows.filter(
    (row) =>
      row.category === values.category &&
      occurredWithin(String(row.created_at), ONE_MINUTE_MS),
  ).length;

  if (sameCategoryCount >= 1) {
    throw new Error("1분 내 같은 카테고리 글은 1개만 작성할 수 있습니다.");
  }

  const incoming = normalizeModerationText(`${values.title} ${values.content}`);
  const duplicate = recentRows.some(
    (row) =>
      normalizeModerationText(`${row.title ?? ""} ${row.content ?? ""}`) === incoming,
  );

  if (duplicate) {
    throw new Error("같은 내용을 짧은 시간 안에 반복 작성할 수 없습니다.");
  }
}

async function guardCommentSubmission(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  authUserId: string,
  values: z.infer<typeof commentSchema>,
) {
  const keyword = findBlockedKeyword(values.content);
  if (keyword) {
    throw new Error(`부적절한 표현(${keyword})이 포함되어 있습니다.`);
  }

  if (classifyContentLevel(values.content) === "obscene") {
    throw new Error("노골적인 성적 표현은 댓글에 사용할 수 없습니다.");
  }

  const { data, error } = await supabase
    .from("comments")
    .select("content, post_id, created_at")
    .eq("author_id", authUserId)
    .gte("created_at", windowStart(TEN_MINUTES_MS))
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw new Error(error.message);
  }

  const recentRows = data ?? [];
  const sameContent = normalizeModerationText(values.content);
  const duplicate = recentRows.some(
    (row) => normalizeModerationText(String(row.content ?? "")) === sameContent,
  );
  if (duplicate) {
    throw new Error("동일한 댓글은 잠시 후 다시 작성할 수 있습니다.");
  }

  const samePostRecentCount = recentRows.filter(
    (row) =>
      row.post_id === values.postId &&
      occurredWithin(String(row.created_at), ONE_MINUTE_MS),
  ).length;
  if (samePostRecentCount >= 2) {
    throw new Error("같은 글에 너무 빠르게 댓글을 반복할 수 없습니다.");
  }
}

async function guardLectureReviewSubmission(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  authUserId: string,
  values: z.infer<typeof lectureReviewSchema>,
) {
  const reviewText = `${values.shortComment} ${values.longComment}`;
  const keyword = findBlockedKeyword(reviewText);
  if (keyword) {
    throw new Error(`부적절한 표현(${keyword})이 포함되어 있습니다.`);
  }

  if (classifyContentLevel(reviewText) === "obscene") {
    throw new Error("노골적인 성적 표현은 리뷰에 사용할 수 없습니다.");
  }

  const { data, error } = await supabase
    .from("lecture_reviews")
    .select("id")
    .eq("author_id", authUserId)
    .eq("lecture_id", values.lectureId)
    .eq("semester", values.semester)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    throw new Error("같은 강의와 같은 학기에는 리뷰를 한 번만 남길 수 있습니다.");
  }
}

async function guardTradePostSubmission(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  authUserId: string,
  values: z.infer<typeof tradePostSchema>,
) {
  const keyword = findBlockedKeyword(values.note);
  if (keyword) {
    throw new Error(`부적절한 표현(${keyword})이 포함되어 있습니다.`);
  }

  if (classifyContentLevel(values.note) === "obscene") {
    throw new Error("노골적인 성적 표현은 매칭 메모에 사용할 수 없습니다.");
  }

  const { data, error } = await supabase
    .from("trade_posts")
    .select("note, created_at")
    .eq("author_id", authUserId)
    .gte("created_at", windowStart(TEN_MINUTES_MS))
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  const recentRows = data ?? [];
  const oneMinuteCount = recentRows.filter((row) =>
    occurredWithin(String(row.created_at), ONE_MINUTE_MS),
  ).length;
  if (oneMinuteCount >= 1) {
    throw new Error("1분 내 매칭 글은 1개만 작성할 수 있습니다.");
  }

  const normalizedNote = normalizeModerationText(values.note);
  const duplicate = recentRows.some(
    (row) => normalizeModerationText(String(row.note ?? "")) === normalizedNote,
  );
  if (duplicate) {
    throw new Error("같은 매칭 메모는 잠시 후 다시 작성할 수 있습니다.");
  }
}

async function createTradeMatchNotifications(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  input: {
    tradePostId: string;
    authorId: string;
    schoolId: string;
    haveLectureId: string;
    wantLectureId: string;
  },
) {
  const [{ data: lectureRows, error: lectureError }, { data: candidateRows, error: candidateError }] =
    await Promise.all([
      supabase
        .from("lectures")
        .select("id, name")
        .in("id", [input.haveLectureId, input.wantLectureId]),
      supabase
        .from("trade_posts")
        .select("id, author_id, have_lecture_id, want_lecture_id, status")
        .eq("school_id", input.schoolId)
        .neq("author_id", input.authorId),
    ]);

  if (lectureError) {
    throw new Error(lectureError.message);
  }

  if (candidateError) {
    throw new Error(candidateError.message);
  }

  const lectureNameMap = new Map(
    (lectureRows ?? []).map((lecture) => [lecture.id, lecture.name]),
  );
  const haveLectureName =
    lectureNameMap.get(input.haveLectureId) ?? "원하는 강의";
  const wantLectureName =
    lectureNameMap.get(input.wantLectureId) ?? "보유 강의";

  const notificationsByUser = new Map<
    string,
    {
      title: string;
      body: string;
      metadata: Record<string, unknown>;
    }
  >();

  for (const candidate of candidateRows ?? []) {
    if (candidate.status === "closed") {
      continue;
    }

    if (candidate.want_lecture_id !== input.haveLectureId) {
      continue;
    }

    const isDirectMatch = candidate.have_lecture_id === input.wantLectureId;
    const notificationTitle = isDirectMatch
      ? "교환 가능한 강의가 올라왔어요"
      : "원하는 강의가 새로 올라왔어요";
    const notificationBody = isDirectMatch
      ? `${haveLectureName} 글이 올라와 바로 교환을 검토할 수 있어요.`
      : `${haveLectureName} 글이 올라왔습니다. ${wantLectureName} 조합으로 이어질 수 있어요.`;

    notificationsByUser.set(candidate.author_id, {
      title: notificationTitle,
      body: notificationBody,
      metadata: {
        createdTradePostId: input.tradePostId,
        interestedTradePostId: candidate.id,
        directMatch: isDirectMatch,
      },
    });
  }

  if (notificationsByUser.size === 0) {
    return;
  }

  const payload = [...notificationsByUser.entries()].map(([userId, item]) => ({
    user_id: userId,
    type: "trade_match" as const,
    title: item.title,
    body: item.body,
    href: "/trade",
    target_type: "trade",
    target_id: input.tradePostId,
    source_kind: "activity" as const,
    delivery_mode: "instant" as const,
    metadata: item.metadata,
  }));

  await insertNotificationsAsSystem(payload);
}

async function guardReportSubmission(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  authUserId: string,
  values: z.infer<typeof reportContentSchema>,
) {
  const { data, error } = await supabase
    .from("reports")
    .select("target_type, target_id, created_at, status")
    .eq("reporter_id", authUserId)
    .gte("created_at", windowStart(ONE_DAY_MS))
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  const recentReports = data ?? [];
  if (recentReports.length >= MAX_REPORTS_PER_DAY) {
    throw new Error("신고는 하루에 너무 많이 보낼 수 없습니다.");
  }

  const duplicate = recentReports.some(
    (row) =>
      row.target_type === values.targetType &&
      row.target_id === values.targetId &&
      row.status !== "dismissed",
  );

  if (duplicate) {
    throw new Error("같은 대상은 한 번만 신고할 수 있습니다.");
  }
}

export async function createPost(input: z.input<typeof postSchema>) {
  const values = postSchema.parse(input);
  const { supabase, authUser, profile } = await requireCurrentUser();
  ensureWritableTrustLevel(profile);
  requireVerifiedStudentProfile(profile, "글쓰기", authUser.email);
  if (values.subcategory === "freshman") {
    if (!profile.school_id) {
      throw new Error("같은 학교 예비입학생만 새내기 게시판을 작성할 수 있습니다.");
    }
    if (profile.user_type !== "freshman") {
      throw new Error("새내기 게시판은 같은 학교 예비입학생만 작성할 수 있습니다.");
    }
  }
  await guardPostSubmission(supabase, authUser.id, values);
  const rawPollDraft =
    values.meta &&
    typeof values.meta === "object" &&
    "pollDraft" in values.meta &&
    values.meta.pollDraft &&
    typeof values.meta.pollDraft === "object"
      ? (values.meta.pollDraft as {
          question?: unknown;
          options?: unknown;
        })
      : null;
  const normalizedPollQuestion =
    values.pollQuestion?.trim() ||
    (typeof rawPollDraft?.question === "string" ? rawPollDraft.question.trim() : "");
  const normalizedPollOptions =
    (values.pollOptions ??
      (Array.isArray(rawPollDraft?.options)
        ? rawPollDraft.options.filter((option): option is string => typeof option === "string")
        : []))
      .map((option) => option.trim())
      .filter(Boolean);
  const shouldCreatePoll =
    values.postType === "poll" ||
    values.postType === "balance" ||
    Boolean(normalizedPollQuestion) ||
    Boolean(normalizedPollOptions.length);

  if (shouldCreatePoll) {
    if (!normalizedPollQuestion) {
      throw new Error("투표 질문을 입력해주세요.");
    }
    if (normalizedPollOptions.length < 2) {
      throw new Error("투표 선택지는 2개 이상 필요합니다.");
    }
  }
  const schoolId = values.schoolId ?? profile.school_id ?? null;
  const scope = inferScope(values);
  const defaultVisibility =
    profile.default_visibility_level === "anonymous"
      ? getDefaultVisibilityLevel({
          userType: profile.user_type,
          schoolId: profile.school_id ?? undefined,
        })
      : profile.default_visibility_level;
  const resolvedVisibilityLevel =
    values.subcategory === "anonymous"
      ? "anonymous"
      : values.visibilityLevel === "anonymous"
        ? defaultVisibility
        : (values.visibilityLevel ?? defaultVisibility);
  const resolvedPostType = shouldCreatePoll
    ? values.postType === "normal"
      ? normalizedPollOptions.length === 2
        ? "balance"
        : "poll"
      : values.postType
    : values.postType;
  const metadataRecord =
    values.meta && typeof values.meta === "object" ? { ...values.meta } : {};
  delete metadataRecord.pollDraft;

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: authUser.id,
      category: values.category,
      subcategory: values.subcategory ?? null,
      post_type: resolvedPostType,
      title: values.title,
      content: values.content,
      school_id: schoolId,
      scope,
      visibility_level: resolvedVisibilityLevel,
      image_url: values.imageUrl ?? null,
      metadata: {
        ...metadataRecord,
        tags: values.tags ?? [],
      },
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (shouldCreatePoll) {
    const admin = createAdminSupabaseClient();
    await createPollForPost(
      admin,
      String(data.id),
      normalizedPollQuestion,
      normalizedPollOptions,
    );
  }

  const admin = createAdminSupabaseClient();
  const scoredPost = await recalculatePostHotScore(admin, String(data.id));
  await maybeCreateSchoolHotNotifications(admin, {
    id: String(scoredPost.id),
    author_id: String(data.author_id),
    school_id: scoredPost.school_id ? String(scoredPost.school_id) : null,
    hot_score: Number(scoredPost.hot_score ?? 0),
    title: String(scoredPost.title),
    category: scoredPost.category as "admission" | "community" | "dating",
    subcategory: scoredPost.subcategory ? String(scoredPost.subcategory) : undefined,
    metadata:
      scoredPost.metadata && typeof scoredPost.metadata === "object"
        ? (scoredPost.metadata as Record<string, unknown>)
        : undefined,
  });

  await awardTrustScore(authUser.id, 5);

  revalidateFeed(["/home", "/community", "/school", "/notifications", "/profile"]);
  return data;
}

export async function createComment(input: z.input<typeof commentSchema>) {
  const values = commentSchema.parse(input);
  const { supabase, authUser, profile } = await requireCurrentUser();
  ensureWritableTrustLevel(profile);
  requireVerifiedStudentProfile(profile, "댓글 작성", authUser.email);
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, author_id, category, subcategory, metadata")
    .eq("id", values.postId)
    .single();

  if (postError || !post) {
    throw new Error("댓글을 남길 글을 찾을 수 없습니다.");
  }

  if (values.parentCommentId) {
    const { data: parentComment, error: parentCommentError } = await supabase
      .from("comments")
      .select("id, post_id, author_id")
      .eq("id", values.parentCommentId)
      .single();

    if (parentCommentError || !parentComment || String(parentComment.post_id) !== values.postId) {
      throw new Error("답글을 남길 댓글을 찾을 수 없습니다.");
    }
  }

  if (post.category === "community") {
    const { data: postDetail, error: postDetailError } = await supabase
      .from("posts")
      .select("school_id, subcategory")
      .eq("id", values.postId)
      .single();

    if (postDetailError || !postDetail) {
      throw new Error("댓글을 남길 글을 찾을 수 없습니다.");
    }

    if (postDetail.subcategory === "freshman") {
      if (
        profile.user_type !== "freshman" ||
        !profile.school_id ||
        postDetail.school_id !== profile.school_id
      ) {
        throw new Error("같은 학교 예비입학생만 새내기 게시판 댓글을 작성할 수 있습니다.");
      }
    }
  }

  await guardCommentSubmission(supabase, authUser.id, values);
  const defaultVisibility =
    profile.default_visibility_level === "anonymous"
      ? getDefaultVisibilityLevel({
          userType: profile.user_type,
          schoolId: profile.school_id ?? undefined,
        })
      : profile.default_visibility_level;
  const resolvedVisibilityLevel =
    post.category === "community" && post.subcategory === "anonymous"
      ? "anonymous"
      : values.visibilityLevel === "anonymous"
        ? defaultVisibility
        : (values.visibilityLevel ?? defaultVisibility);

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: values.postId,
      parent_comment_id: values.parentCommentId ?? null,
      author_id: authUser.id,
      content: values.content,
      visibility_level: resolvedVisibilityLevel,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const admin = createAdminSupabaseClient();
  await syncPostCommentCount(admin, values.postId);
  const scoredPost = await recalculatePostHotScore(admin, values.postId);

  await awardTrustScore(authUser.id, 2);

  try {
    const notifications: Array<{
      user_id: string;
      type:
        | "comment"
        | "reply"
        | "admission_answer";
      title: string;
      body: string;
      href: string;
      target_type: "post" | "comment";
      target_id: string;
      source_kind: "activity";
      delivery_mode: "instant";
      metadata: Record<string, unknown>;
    }> = [];
    const postHref = getPostNotificationHref({
      id: String(post.id),
      category: post.category,
      subcategory: (post.subcategory as string | null | undefined) ?? undefined,
      metadata:
        post.metadata && typeof post.metadata === "object"
          ? (post.metadata as { tags?: string[] })
          : undefined,
    });

    if (String(post.author_id) !== authUser.id) {
      notifications.push({
        user_id: String(post.author_id),
        type: post.category === "admission" ? "admission_answer" : "comment",
        title:
          post.category === "admission"
            ? "입시 질문에 새 답변이 도착했어요"
            : "내 글에 새 댓글이 달렸어요",
        body: values.content.slice(0, 80),
        href: postHref,
        target_type: "post",
        target_id: String(post.id),
        source_kind: "activity",
        delivery_mode: "instant",
        metadata: {
          actorUserId: authUser.id,
          postId: String(post.id),
          commentId: String(data.id),
        },
      });
    }

    let replyTarget:
      | {
          id: string;
          author_id: string;
        }
      | undefined;

    if (values.parentCommentId) {
      const { data: parentComment } = await supabase
        .from("comments")
        .select("id, author_id")
        .eq("id", values.parentCommentId)
        .single();

      if (parentComment) {
        replyTarget = {
          id: String(parentComment.id),
          author_id: String(parentComment.author_id),
        };
      }
    }

    if (replyTarget && replyTarget.author_id !== authUser.id) {
      notifications.push({
        user_id: String(replyTarget.author_id),
        type: "reply",
        title: "내가 참여한 글에 새 답글이 달렸어요",
        body: values.content.slice(0, 80),
        href: postHref,
        target_type: "comment",
        target_id: String(replyTarget.id),
        source_kind: "activity",
        delivery_mode: "instant",
        metadata: {
          actorUserId: authUser.id,
          postId: String(post.id),
          commentId: String(data.id),
          parentCommentId: String(replyTarget.id),
        },
      });
    }

    await insertNotificationsAsSystem(notifications);
  } catch {
    // noop
  }

  await maybeCreateSchoolHotNotifications(admin, {
    id: String(scoredPost.id),
    author_id: String(post.author_id),
    school_id: scoredPost.school_id ? String(scoredPost.school_id) : null,
    hot_score: Number(scoredPost.hot_score ?? 0),
    title: String(scoredPost.title),
    category: scoredPost.category as "admission" | "community" | "dating",
    subcategory: scoredPost.subcategory ? String(scoredPost.subcategory) : undefined,
    metadata:
      scoredPost.metadata && typeof scoredPost.metadata === "object"
        ? (scoredPost.metadata as Record<string, unknown>)
        : undefined,
  });

  revalidateFeed(["/home", "/community", "/school"]);
  return data;
}

export async function deletePost(postId: string) {
  const { supabase, authUser } = await requireCurrentUser();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, author_id")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    throw new Error("삭제할 글을 찾을 수 없습니다.");
  }

  const canDelete = String(post.author_id) === authUser.id || isMasterAdminEmail(authUser.email);
  if (!canDelete) {
    throw new Error("본인 글만 삭제할 수 있습니다.");
  }

  const { error } = await supabase.from("posts").delete().eq("id", postId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateFeed(["/home", "/community", "/school", "/dating", "/notifications", "/profile"]);
}

export async function deleteComment(commentId: string) {
  const { supabase, authUser } = await requireCurrentUser();

  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .select("id, author_id, post_id")
    .eq("id", commentId)
    .single();

  if (commentError || !comment) {
    throw new Error("삭제할 댓글을 찾을 수 없습니다.");
  }

  const canDelete = String(comment.author_id) === authUser.id || isMasterAdminEmail(authUser.email);
  if (!canDelete) {
    throw new Error("본인 댓글만 삭제할 수 있습니다.");
  }

  const { error } = await supabase.from("comments").delete().eq("id", commentId);

  if (error) {
    throw new Error(error.message);
  }

  const admin = createAdminSupabaseClient();
  await syncPostCommentCount(admin, String(comment.post_id));
  await recalculatePostHotScore(admin, String(comment.post_id));

  revalidateFeed(["/home", "/community", "/school", "/dating", "/notifications", "/profile"]);
}

export async function deleteCurrentAccount() {
  const { authUser } = await requireCurrentUser();
  const admin = createAdminSupabaseClient();

  const [{ data: profileImages }, { data: verificationDocuments }, { data: uploadedPosts }, { data: userRow }] =
    await Promise.all([
      admin.from("profile_images").select("image_path").eq("user_id", authUser.id),
      admin.from("verification_documents").select("file_path").eq("user_id", authUser.id),
      admin.from("posts").select("image_url").eq("author_id", authUser.id).not("image_url", "is", null),
      admin.from("users").select("avatar_url").eq("id", authUser.id).maybeSingle(),
    ]);

  const profileImagePaths = (profileImages ?? [])
    .map((row) => String(row.image_path ?? "").trim())
    .filter(Boolean);
  const verificationDocumentPaths = (verificationDocuments ?? [])
    .map((row) => String(row.file_path ?? "").trim())
    .filter(Boolean);
  const mediaPaths = [
    ...((uploadedPosts ?? [])
      .map((row) => getStoragePathFromPublicUrl(String(row.image_url ?? "")))
      .filter((value): value is string => Boolean(value))),
    getStoragePathFromPublicUrl(String(userRow?.avatar_url ?? "")),
  ].filter((value): value is string => Boolean(value));

  if (profileImagePaths.length > 0) {
    await admin.storage.from(PROFILE_IMAGE_BUCKET).remove(profileImagePaths).catch(() => null);
  }

  if (verificationDocumentPaths.length > 0) {
    await admin.storage.from(VERIFICATION_DOCUMENTS_BUCKET).remove(verificationDocumentPaths).catch(() => null);
  }

  if (mediaPaths.length > 0) {
    await admin.storage.from(MEDIA_BUCKET).remove(mediaPaths).catch(() => null);
  }

  const { error: deleteUserRowError } = await admin.from("users").delete().eq("id", authUser.id);

  if (deleteUserRowError) {
    throw new Error(deleteUserRowError.message);
  }

  const { error } = await admin.auth.admin.deleteUser(authUser.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateFeed([
    "/home",
    "/community",
    "/school",
    "/dating",
    "/trade",
    "/notifications",
    "/profile",
    "/admin",
  ]);

  return { success: true };
}

export async function votePoll(input: { postId: string; optionId: string }) {
  const values = z
    .object({
      postId: z.string().uuid(),
      optionId: z.string().uuid(),
    })
    .parse(input);
  const { authUser } = await requireCurrentUser();
  const admin = createAdminSupabaseClient();

  const { data: pollRow, error: pollError } = await admin
    .from("polls")
    .select("id, post_id")
    .eq("post_id", values.postId)
    .single();

  if (pollError || !pollRow) {
    throw new Error("투표를 찾을 수 없습니다.");
  }

  const { data: optionRow, error: optionError } = await admin
    .from("poll_options")
    .select("id, poll_id, vote_count")
    .eq("id", values.optionId)
    .eq("poll_id", String(pollRow.id))
    .single();

  if (optionError || !optionRow) {
    throw new Error("선택지를 찾을 수 없습니다.");
  }

  const { data: existingVote } = await admin
    .from("poll_votes")
    .select("id")
    .eq("poll_id", String(pollRow.id))
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (existingVote) {
    throw new Error("이미 투표에 참여했습니다.");
  }

  const { error: voteInsertError } = await admin.from("poll_votes").insert({
    poll_id: String(pollRow.id),
    user_id: authUser.id,
    option_id: values.optionId,
  });

  if (voteInsertError) {
    throw new Error(voteInsertError.message);
  }

  const { error: optionUpdateError } = await admin
    .from("poll_options")
    .update({ vote_count: Number(optionRow.vote_count ?? 0) + 1 })
    .eq("id", values.optionId);

  if (optionUpdateError) {
    throw new Error(optionUpdateError.message);
  }

  const { data: optionRowsAfterUpdate, error: optionRowsAfterUpdateError } = await admin
    .from("poll_options")
    .select("vote_count")
    .eq("poll_id", String(pollRow.id));

  if (optionRowsAfterUpdateError) {
    throw new Error(optionRowsAfterUpdateError.message);
  }

  const pollVoteCount = (optionRowsAfterUpdate ?? []).reduce(
    (sum, option) => sum + Number(option.vote_count ?? 0),
    0,
  );

  const { data: postRow } = await admin
    .from("posts")
    .select("poll_vote_count, author_id")
    .eq("id", values.postId)
    .single();

  const { error: postUpdateError } = await admin
    .from("posts")
    .update({ poll_vote_count: pollVoteCount })
    .eq("id", values.postId);

  if (postUpdateError) {
    throw new Error(postUpdateError.message);
  }

  const scoredPost = await recalculatePostHotScore(admin, values.postId);
  await maybeCreateSchoolHotNotifications(admin, {
    id: String(scoredPost.id),
    author_id: postRow?.author_id ? String(postRow.author_id) : authUser.id,
    school_id: scoredPost.school_id ? String(scoredPost.school_id) : null,
    hot_score: Number(scoredPost.hot_score ?? 0),
    title: String(scoredPost.title),
    category: scoredPost.category as "admission" | "community" | "dating",
    subcategory: scoredPost.subcategory ? String(scoredPost.subcategory) : undefined,
    metadata:
      scoredPost.metadata && typeof scoredPost.metadata === "object"
        ? (scoredPost.metadata as Record<string, unknown>)
        : undefined,
  });

  revalidateFeed(["/home", "/community", "/school", "/notifications"]);
  return { success: true };
}

export async function trackPostView(postId: string) {
  const values = z.object({ postId: z.string().min(1) }).parse({ postId });
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false };
  }

  const admin = createAdminSupabaseClient();
  const { data: nextViewCount, error: viewError } = await admin.rpc("increment_post_view_once", {
    p_post_id: values.postId,
    p_user_id: user.id,
  });

  if (viewError) {
    return { success: false };
  }

  if (Number(nextViewCount ?? 0) > 0 && Number(nextViewCount ?? 0) % 5 === 0) {
    await recalculatePostHotScore(admin, values.postId);
  }
  revalidateFeed(["/home", "/community", "/school"]);
  return { success: true };
}

export async function createLectureReview(input: z.input<typeof lectureReviewSchema>) {
  const values = lectureReviewSchema.parse(input);
  const { supabase, authUser, profile } = await requireCurrentUser();
  ensureWritableTrustLevel(profile);
  requireVerifiedStudentProfile(profile, "강의평 작성", authUser.email);
  await guardLectureReviewSubmission(supabase, authUser.id, values);

  const { data, error } = await supabase
    .from("lecture_reviews")
    .insert({
      lecture_id: values.lectureId,
      author_id: authUser.id,
      difficulty: values.difficulty,
      workload: values.workload,
      attendance: values.attendance,
      exam_style: values.examStyle,
      team_project: values.teamProject,
      presentation: values.presentation,
      grading_style: values.gradingStyle,
      honey_score: values.honeyScore,
      short_comment: values.shortComment,
      long_comment: values.longComment,
      semester: values.semester,
      visibility_level: values.visibilityLevel ?? profile.default_visibility_level,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await awardTrustScore(authUser.id, 10);

  revalidateFeed(["/lectures", `/lectures/${values.lectureId}`, "/school"]);
  return data;
}

export async function createTradePost(input: z.input<typeof tradePostSchema>) {
  try {
    const values = tradePostSchema.parse(input);
    const { supabase, authUser, profile } = await requireCurrentUser();
    ensureWritableTrustLevel(profile);
    requireVerifiedStudentProfile(profile, "수강신청 교환", authUser.email);
    await guardTradePostSubmission(supabase, authUser.id, values);

    const schoolId = values.schoolId ?? profile.school_id;
    if (!schoolId) {
      throw new Error("학교 정보가 필요합니다.");
    }

    const { data, error } = await supabase
      .from("trade_posts")
      .insert({
        author_id: authUser.id,
        school_id: schoolId,
        have_lecture_id: values.haveLectureId,
        want_lecture_id: values.wantLectureId,
        note: values.note,
        status: values.status === "matching" ? "matched" : values.status,
        semester: values.semester,
        professor: values.professor ?? null,
        section: values.section ?? null,
        time_range: values.timeRange,
        visibility_level: values.visibilityLevel ?? profile.default_visibility_level,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await awardTrustScore(authUser.id, 5);

    await createTradeMatchNotifications(supabase, {
      tradePostId: data.id,
      authorId: authUser.id,
      schoolId,
      haveLectureId: values.haveLectureId,
      wantLectureId: values.wantLectureId,
    });

    revalidateFeed(["/school", "/trade", "/notifications"]);
    return { ok: true as const, data };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "매칭 글 등록에 실패했습니다.",
    };
  }
}

export async function createTradeMessage(input: z.input<typeof tradeMessageSchema>) {
  try {
    const values = tradeMessageSchema.parse(input);
    const { supabase, authUser, profile } = await requireCurrentUser();
    ensureWritableTrustLevel(profile);
    requireVerifiedStudentProfile(profile, "수강신청 교환 대화", authUser.email);
    const admin = createAdminSupabaseClient();

    const { data: tradePost, error: tradePostError } = await supabase
      .from("trade_posts")
      .select("id, author_id, school_id, have_lecture_id, want_lecture_id, status")
      .eq("id", values.tradePostId)
      .single();

    if (tradePostError || !tradePost) {
      throw new Error("대화를 이어갈 매칭 글을 찾을 수 없습니다.");
    }

    if (!profile.school_id || tradePost.school_id !== profile.school_id) {
      throw new Error("같은 학교 사용자만 대화에 참여할 수 있습니다.");
    }

    const keyword = findBlockedKeyword(values.content);
    if (keyword) {
      throw new Error(`부적절한 표현(${keyword})이 포함되어 있습니다.`);
    }

    if (classifyContentLevel(values.content) === "obscene") {
      throw new Error("노골적인 성적 표현은 대화에 사용할 수 없습니다.");
    }

    const { data, error } = await supabase
      .from("trade_messages")
      .insert({
        trade_post_id: values.tradePostId,
        sender_id: authUser.id,
        content: values.content,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "채팅 전송에 실패했습니다.");
    }

    if (tradePost.status === "open") {
      await admin
        .from("trade_posts")
        .update({ status: "matching" })
        .eq("id", values.tradePostId)
        .eq("status", "open");
    }

    try {
      const { data: participantRows } = await admin
        .from("trade_messages")
        .select("sender_id")
        .eq("trade_post_id", values.tradePostId);

      const recipientIds = new Set<string>();
      if (String(tradePost.author_id) !== authUser.id) {
        recipientIds.add(String(tradePost.author_id));
      }

      for (const row of participantRows ?? []) {
        const participantId = String(row.sender_id);
        if (participantId !== authUser.id) {
          recipientIds.add(participantId);
        }
      }

      await insertNotificationsAsSystem(
        [...recipientIds].map((userId) => ({
          user_id: userId,
          type: "trade_match",
          title: "수강신청 교환 대화에 새 메시지가 도착했어요",
          body: values.content.slice(0, 80),
          href: `/trade?post=${values.tradePostId}&chat=1`,
          target_type: "trade",
          target_id: values.tradePostId,
          source_kind: "activity",
          delivery_mode: "instant",
          metadata: {
            actorUserId: authUser.id,
            tradePostId: values.tradePostId,
            tradeMessageId: String(data.id),
          },
        })),
      );
    } catch {
      // noop
    }

    revalidateFeed(["/trade", "/messages", "/notifications"]);
    return { ok: true as const, data };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "채팅 전송에 실패했습니다.",
    };
  }
}

export async function createDatingProfile(input: z.input<typeof datingProfileSchema>) {
  const values = datingProfileSchema.parse(input);
  const { supabase, authUser, profile } = await requireCurrentUser();
  requireVerifiedStudentProfile(profile, "미팅 프로필 등록", authUser.email);

  const schoolId = values.schoolId ?? profile.school_id;
  if (!schoolId) {
    throw new Error("학교 정보가 필요합니다.");
  }

  const { data, error } = await supabase
    .from("dating_profiles")
    .upsert(
      {
        user_id: authUser.id,
        school_id: schoolId,
        department: values.department ?? profile.department ?? null,
        grade: values.grade,
        intro: values.intro,
        vibe_tag: values.vibeTag,
        photo_url: values.photoUrl ?? null,
        visibility_level: values.visibilityLevel,
        is_visible: values.isVisible,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidateFeed(["/community", "/dating"]);
  return data;
}

export async function createDatingPost(input: z.input<typeof datingPostSchema>) {
  const values = datingPostSchema.parse(input);
  const { supabase, authUser, profile } = await requireCurrentUser();
  ensureWritableTrustLevel(profile);
  requireVerifiedStudentProfile(profile, "미팅 / 연애 글쓰기", authUser.email);

  if (!profile.school_id) {
    throw new Error("학교 정보가 필요합니다.");
  }

  await guardPostSubmission(supabase, authUser.id, {
    category: "dating",
    subcategory: values.subcategory,
    title: values.title,
    content: values.content,
    schoolId: profile.school_id,
    visibilityLevel: values.visibilityLevel,
    imageUrl: values.photoUrl,
    tags: [values.vibeTag, "새 글"],
    postType: "normal",
  });

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      author_id: authUser.id,
        category: "dating",
        subcategory: values.subcategory,
        post_type: "normal",
        title: values.title,
      content: values.content,
      school_id: profile.school_id,
      scope: "global",
      visibility_level: values.visibilityLevel,
      image_url: values.photoUrl ?? null,
      metadata: {
        tags: [values.vibeTag, "새 글"],
      },
    })
    .select("*")
    .single();

  if (postError || !post) {
    throw new Error(postError?.message ?? "미팅 글 작성에 실패했습니다.");
  }

  const { data: datingProfile, error: profileError } = await supabase
    .from("dating_profiles")
    .upsert(
      {
        user_id: authUser.id,
        school_id: profile.school_id,
        department: profile.department ?? null,
        grade: profile.grade ?? 1,
        intro: values.content,
        vibe_tag: values.vibeTag,
        photo_url: values.photoUrl ?? null,
        visibility_level: values.visibilityLevel,
        is_visible: true,
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (profileError || !datingProfile) {
    await supabase.from("posts").delete().eq("id", post.id);
    throw new Error(profileError?.message ?? "프로필 저장에 실패했습니다.");
  }

  await awardTrustScore(authUser.id, 5);

  revalidateFeed(["/home", "/community", "/dating"]);
  return {
    post,
    datingProfile,
  };
}

export async function acceptAdmissionAnswer(postId: string, commentId: string) {
  const { supabase, authUser } = await requireCurrentUser();
  const admin = createAdminSupabaseClient();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, author_id, category")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    throw new Error("질문을 찾을 수 없습니다.");
  }

  if (String(post.author_id) !== authUser.id) {
    throw new Error("질문 작성자만 답변을 채택할 수 있습니다.");
  }

  if (post.category !== "admission") {
    throw new Error("입시 질문 답변만 채택할 수 있습니다.");
  }

  const { data: targetComment, error: commentError } = await admin
    .from("comments")
    .select("id, author_id, accepted")
    .eq("id", commentId)
    .eq("post_id", postId)
    .single();

  if (commentError || !targetComment) {
    throw new Error("채택할 답변을 찾을 수 없습니다.");
  }

  const { error: resetError } = await admin
    .from("comments")
    .update({ accepted: false })
    .eq("post_id", postId);

  if (resetError) {
    throw new Error(resetError.message);
  }

  const { error: acceptError } = await admin
    .from("comments")
    .update({ accepted: true })
    .eq("id", commentId);

  if (acceptError) {
    throw new Error(acceptError.message);
  }

  if (!targetComment.accepted) {
    await awardTrustScore(String(targetComment.author_id), 5);
  }

  revalidateFeed(["/school", "/notifications"]);
}

export async function reportContent(input: z.input<typeof reportContentSchema>) {
  const values = reportContentSchema.parse(input);
  const { supabase, authUser } = await requireCurrentUser();
  await guardReportSubmission(supabase, authUser.id, values);

  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: authUser.id,
      target_type: values.targetType,
      target_id: values.targetId,
      reason: values.reason,
      memo: values.memo ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidateFeed(["/community", "/school", "/lectures", "/trade", "/dating"]);
  return data;
}

export async function blockUser(input: z.input<typeof blockUserSchema>) {
  const values = blockUserSchema.parse(input);
  const { supabase, authUser } = await requireCurrentUser();

  if (values.blockedUserId === authUser.id) {
    throw new Error("본인은 차단할 수 없습니다.");
  }

  const { data, error } = await supabase
    .from("blocks")
    .upsert(
      {
        blocker_id: authUser.id,
        blocked_user_id: values.blockedUserId,
      },
      { onConflict: "blocker_id,blocked_user_id", ignoreDuplicates: true },
    )
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  revalidateFeed(["/community", "/school", "/lectures", "/trade", "/dating", "/profile"]);
  return data;
}
