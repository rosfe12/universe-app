import { createClient } from "@supabase/supabase-js";

import { loadLocalEnv, requireEnv } from "./_env.mjs";

loadLocalEnv();
requireEnv([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "E2E_TEST_EMAIL",
  "E2E_TEST_PASSWORD",
]);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;
const client = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const created = {
  commentId: null,
  postId: null,
  reviewId: null,
  tradePostId: null,
  storagePath: null,
};

function createTinyPngBlob() {
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0VwAAAAASUVORK5CYII=";
  const buffer = Buffer.from(base64, "base64");
  return new Blob([buffer], { type: "image/png" });
}

async function cleanup() {
  if (created.commentId) {
    await client.from("comments").delete().eq("id", created.commentId);
  }

  if (created.reviewId) {
    await client.from("lecture_reviews").delete().eq("id", created.reviewId);
  }

  if (created.tradePostId) {
    await client.from("trade_posts").delete().eq("id", created.tradePostId);
  }

  if (created.postId) {
    await client.from("posts").delete().eq("id", created.postId);
  }

  if (created.storagePath) {
    await client.storage.from("media").remove([created.storagePath]);
  }
}

try {
  const signInResult = await client.auth.signInWithPassword({ email, password });
  if (signInResult.error || !signInResult.data.user) {
    throw signInResult.error ?? new Error("Supabase 로그인에 실패했습니다.");
  }

  const authUser = signInResult.data.user;

  const { data: profile, error: profileError } = await client
    .from("users")
    .select("id, school_id")
    .eq("id", authUser.id)
    .single();

  if (profileError || !profile?.school_id) {
    throw profileError ?? new Error("테스트 계정의 users.school_id가 필요합니다.");
  }

  const { data: lectures, error: lecturesError } = await client
    .from("lectures")
    .select("id")
    .eq("school_id", profile.school_id)
    .limit(2);

  if (lecturesError || !lectures || lectures.length === 0) {
    throw lecturesError ?? new Error("테스트용 lectures 데이터가 필요합니다.");
  }

  const lectureIds = lectures.map((lecture) => lecture.id);
  const now = Date.now();
  const storagePath = `posts/${authUser.id}/${now}.png`;
  created.storagePath = storagePath;

  const uploadResult = await client.storage.from("media").upload(storagePath, createTinyPngBlob(), {
    upsert: true,
    contentType: "image/png",
  });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const {
    data: { publicUrl },
  } = client.storage.from("media").getPublicUrl(storagePath);

  const { data: post, error: postError } = await client
    .from("posts")
    .insert({
      author_id: authUser.id,
      school_id: profile.school_id,
      category: "community",
      subcategory: "hot",
      scope: "global",
      title: `[verify] live post ${now}`,
      content: "verify script generated post",
      image_url: publicUrl,
      metadata: { tags: ["verify", "live"] },
    })
    .select("id")
    .single();

  if (postError || !post) {
    throw postError ?? new Error("posts insert failed");
  }
  created.postId = post.id;

  const { data: comment, error: commentError } = await client
    .from("comments")
    .insert({
      post_id: post.id,
      author_id: authUser.id,
      content: "verify script generated comment",
      visibility_level: "anonymous",
    })
    .select("id")
    .single();

  if (commentError || !comment) {
    throw commentError ?? new Error("comments insert failed");
  }
  created.commentId = comment.id;

  const { data: review, error: reviewError } = await client
    .from("lecture_reviews")
    .insert({
      lecture_id: lectureIds[0],
      author_id: authUser.id,
      difficulty: "medium",
      workload: "light",
      attendance: "flexible",
      exam_style: "mixed",
      team_project: false,
      grading_style: "generous",
      honey_score: 82,
      short_comment: "verify review",
      long_comment: "verify review created by live script for end to end validation",
      semester: `verify-${now}`,
      presentation: false,
      helpful_count: 0,
      visibility_level: "anonymous",
    })
    .select("id")
    .single();

  if (reviewError || !review) {
    throw reviewError ?? new Error("lecture_reviews insert failed");
  }
  created.reviewId = review.id;

  const { data: tradePost, error: tradeError } = await client
    .from("trade_posts")
    .insert({
      author_id: authUser.id,
      school_id: profile.school_id,
      have_lecture_id: lectureIds[0],
      want_lecture_id: lectureIds[1] ?? lectureIds[0],
      note: "verify trade post",
      status: "open",
      semester: "2026-1",
      time_range: "verify slot",
      visibility_level: "school",
    })
    .select("id")
    .single();

  if (tradeError || !tradePost) {
    throw tradeError ?? new Error("trade_posts insert failed");
  }
  created.tradePostId = tradePost.id;

  console.log("Live verification passed.");
  console.log(
    JSON.stringify(
      {
        userId: authUser.id,
        postId: created.postId,
        commentId: created.commentId,
        reviewId: created.reviewId,
        tradePostId: created.tradePostId,
        storagePath: created.storagePath,
      },
      null,
      2,
    ),
  );
  await cleanup();
} catch (error) {
  await cleanup();
  throw error;
} finally {
  await client.auth.signOut();
}
