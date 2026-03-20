"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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
    .enum(["club", "meetup", "food", "hot", "dating", "meeting"])
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
  user_type: "student" | "highschool" | "parent";
  school_id: string | null;
  department: string | null;
  grade: number | null;
  is_restricted: boolean;
  default_visibility_level: "anonymous" | "school" | "schoolDepartment" | "profile";
};

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
      "id, user_type, school_id, department, grade, is_restricted, default_visibility_level",
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

function inferScope(input: { category: "admission" | "community" | "dating"; subcategory?: string }) {
  if (input.category === "dating" || input.subcategory === "hot") {
    return "global" as const;
  }

  return "school" as const;
}

function revalidateFeed(paths: string[]) {
  paths.forEach((path) => revalidatePath(path));
}

export async function createPost(input: z.input<typeof postSchema>) {
  const values = postSchema.parse(input);
  const { supabase, authUser, profile } = await requireCurrentUser();
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

  if (profile.user_type !== "student") {
    throw new Error("수강신청 교환 글은 대학생만 작성할 수 있습니다.");
  }

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

  if (profile.user_type !== "student") {
    throw new Error("미팅 프로필은 대학생만 등록할 수 있습니다.");
  }

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

export async function reportContent(input: z.input<typeof reportContentSchema>) {
  const values = reportContentSchema.parse(input);
  const { supabase, authUser } = await requireCurrentUser();

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
