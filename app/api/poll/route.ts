import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const createPollSchema = z.object({
  postId: z.string().uuid(),
  question: z.string().trim().min(1).max(140),
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(4),
});

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

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const payload = createPollSchema.parse(await request.json());
    const admin = createAdminSupabaseClient();

    const { data: postRow, error: postError } = await admin
      .from("posts")
      .select("id, author_id, created_at, like_count, comment_count, view_count")
      .eq("id", payload.postId)
      .single();

    if (postError || !postRow) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    if (String(postRow.author_id) !== user.id) {
      return NextResponse.json({ error: "작성자만 투표를 추가할 수 있습니다." }, { status: 403 });
    }

    const { data: existingPoll } = await admin
      .from("polls")
      .select("id")
      .eq("post_id", payload.postId)
      .maybeSingle();

    if (existingPoll) {
      return NextResponse.json({ error: "이미 투표가 추가된 게시글입니다." }, { status: 409 });
    }

    const { data: pollRow, error: pollError } = await admin
      .from("polls")
      .insert({
        post_id: payload.postId,
        question: payload.question,
      })
      .select("id, post_id, question, created_at")
      .single();

    if (pollError || !pollRow) {
      return NextResponse.json({ error: pollError?.message ?? "투표 생성에 실패했습니다." }, { status: 500 });
    }

    const { data: optionRows, error: optionsError } = await admin
      .from("poll_options")
      .insert(
        payload.options.map((option) => ({
          poll_id: String(pollRow.id),
          option_text: option,
        })),
      )
      .select("id, option_text, vote_count");

    if (optionsError) {
      return NextResponse.json({ error: optionsError.message }, { status: 500 });
    }

    const postType = payload.options.length === 2 ? "balance" : "poll";
    const hotScore = calculateHotScore({
      likeCount: typeof postRow.like_count === "number" ? postRow.like_count : 0,
      commentCount: typeof postRow.comment_count === "number" ? postRow.comment_count : 0,
      viewCount: typeof postRow.view_count === "number" ? postRow.view_count : 0,
      pollVoteCount: 0,
      createdAt: String(postRow.created_at),
    });

    await admin
      .from("posts")
      .update({
        post_type: postType,
        poll_vote_count: 0,
        hot_score: hotScore,
      })
      .eq("id", payload.postId);

    return NextResponse.json({
      poll: {
        id: String(pollRow.id),
        postId: String(pollRow.post_id),
        question: String(pollRow.question),
        createdAt: String(pollRow.created_at),
        totalVotes: 0,
        options: (optionRows ?? []).map((option) => ({
          id: String(option.id),
          text: String(option.option_text),
          voteCount: Number(option.vote_count ?? 0),
          percentage: 0,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "투표 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
