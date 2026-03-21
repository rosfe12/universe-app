"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { findBlockedKeyword } from "@/lib/moderation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  "other",
]);

const postSchema = z.object({
  category: z.enum(["admission", "community", "dating"]),
  subcategory: z
    .enum(["club", "meetup", "food", "hot", "freshman", "dating", "meeting"])
    .optional(),
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(5000),
  schoolId: z.string().uuid().optional(),
  visibilityLevel: visibilitySchema.optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string().trim().min(1).max(20)).max(8).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const commentSchema = z.object({
  postId: z.string().uuid(),
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
  user_type: "student" | "highschool" | "freshman";
  school_id: string | null;
  department: string | null;
  grade: number | null;
  verified: boolean;
  student_verification_status:
    | "none"
    | "unverified"
    | "pending"
    | "verified"
    | "rejected"
    | null;
  school_email: string | null;
  is_restricted: boolean;
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
      "id, user_type, school_id, department, grade, verified, student_verification_status, school_email, is_restricted, default_visibility_level",
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

function requireVerifiedStudentProfile(
  profile: CurrentProfile,
  featureLabel: string,
) {
  if (profile.user_type !== "student") {
    throw new Error(`${featureLabel}은 대학생만 사용할 수 있습니다.`);
  }

  if (
    !profile.verified ||
    profile.student_verification_status !== "verified" ||
    !profile.school_id
  ) {
    throw new Error(`${featureLabel}은 학교 메일 인증을 완료한 대학생만 사용할 수 있습니다.`);
  }
}

function inferScope(input: { category: "admission" | "community" | "dating"; subcategory?: string }) {
  if (input.category === "dating" || input.subcategory === "hot") {
    return "global" as const;
  }

  return "school" as const;
}

function revalidateFeed(paths: string[]) {
  paths.forEach((path) => revalidatePath(path));
}

async function guardPostSubmission(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  authUserId: string,
  values: z.infer<typeof postSchema>,
) {
  const keyword = findBlockedKeyword(`${values.title} ${values.content}`);
  if (keyword) {
    throw new Error(`부적절한 표현(${keyword})이 포함되어 있습니다.`);
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
  const keyword = findBlockedKeyword(`${values.shortComment} ${values.longComment}`);
  if (keyword) {
    throw new Error(`부적절한 표현(${keyword})이 포함되어 있습니다.`);
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
  if (profile.user_type === "highschool" && values.category !== "admission") {
    throw new Error("고등학생은 입시 게시판만 작성할 수 있습니다.");
  }
  if (values.category === "dating") {
    requireVerifiedStudentProfile(profile, "미팅 / 연애 글쓰기");
  }
  if (values.subcategory === "freshman") {
    if (profile.user_type !== "freshman" || !profile.school_id) {
      throw new Error("새내기존 글쓰기는 같은 학교 예비입학생만 사용할 수 있습니다.");
    }
  }
  await guardPostSubmission(supabase, authUser.id, values);
  const schoolId = values.schoolId ?? profile.school_id ?? null;
  const scope = inferScope(values);

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: authUser.id,
      category: values.category,
      subcategory: values.subcategory ?? null,
      title: values.title,
      content: values.content,
      school_id: schoolId,
      scope,
      visibility_level: values.visibilityLevel ?? profile.default_visibility_level,
      image_url: values.imageUrl ?? null,
      metadata: {
        ...(values.meta ?? {}),
        tags: values.tags ?? [],
      },
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidateFeed(["/home", "/admission", "/community", "/school"]);
  return data;
}

export async function createComment(input: z.input<typeof commentSchema>) {
  const values = commentSchema.parse(input);
  const { supabase, authUser, profile } = await requireCurrentUser();
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, category")
    .eq("id", values.postId)
    .single();

  if (postError || !post) {
    throw new Error("댓글을 남길 글을 찾을 수 없습니다.");
  }

  if (profile.user_type === "highschool" && post.category !== "admission") {
    throw new Error("고등학생은 입시 게시판에만 댓글을 남길 수 있습니다.");
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
        throw new Error("새내기존 댓글은 같은 학교 예비입학생만 작성할 수 있습니다.");
      }
    }
  }

  await guardCommentSubmission(supabase, authUser.id, values);

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: values.postId,
      author_id: authUser.id,
      content: values.content,
      visibility_level: values.visibilityLevel ?? profile.default_visibility_level,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidateFeed(["/home", "/admission", "/community", "/school"]);
  return data;
}

export async function createLectureReview(input: z.input<typeof lectureReviewSchema>) {
  const values = lectureReviewSchema.parse(input);
  const { supabase, authUser, profile } = await requireCurrentUser();
  requireVerifiedStudentProfile(profile, "강의평 작성");
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

  revalidateFeed(["/lectures", `/lectures/${values.lectureId}`, "/school"]);
  return data;
}

export async function createTradePost(input: z.input<typeof tradePostSchema>) {
  const values = tradePostSchema.parse(input);
  const { supabase, authUser, profile } = await requireCurrentUser();
  requireVerifiedStudentProfile(profile, "수강신청 교환");
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

  revalidateFeed(["/school", "/trade"]);
  return data;
}

export async function createDatingProfile(input: z.input<typeof datingProfileSchema>) {
  const values = datingProfileSchema.parse(input);
  const { supabase, authUser, profile } = await requireCurrentUser();
  requireVerifiedStudentProfile(profile, "미팅 프로필 등록");

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
  requireVerifiedStudentProfile(profile, "미팅 / 연애 글쓰기");

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
  });

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      author_id: authUser.id,
      category: "dating",
      subcategory: values.subcategory,
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

  revalidateFeed(["/home", "/community", "/dating"]);
  return {
    post,
    datingProfile,
  };
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

  revalidateFeed(["/community", "/admission", "/lectures", "/trade", "/dating"]);
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

  revalidateFeed(["/community", "/admission", "/lectures", "/trade", "/dating", "/profile"]);
  return data;
}
