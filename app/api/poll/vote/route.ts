import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const voteSchema = z.object({
  pollId: z.string().uuid(),
  optionId: z.string().uuid(),
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

    const payload = voteSchema.parse(await request.json());
    const admin = createAdminSupabaseClient();

    const { data: existingVote } = await admin
      .from("poll_votes")
      .select("id")
      .eq("poll_id", payload.pollId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json({ error: "이미 투표에 참여했습니다." }, { status: 409 });
    }

    const { data: optionRow, error: optionError } = await admin
      .from("poll_options")
      .select("id, poll_id, vote_count")
      .eq("id", payload.optionId)
      .eq("poll_id", payload.pollId)
      .single();

    if (optionError || !optionRow) {
      return NextResponse.json({ error: "투표 선택지를 찾을 수 없습니다." }, { status: 404 });
    }

    const { error: voteError } = await admin.from("poll_votes").insert({
      poll_id: payload.pollId,
      option_id: payload.optionId,
      user_id: user.id,
    });

    if (voteError) {
      return NextResponse.json({ error: voteError.message }, { status: 400 });
    }

    await admin
      .from("poll_options")
      .update({ vote_count: Number(optionRow.vote_count ?? 0) + 1 })
      .eq("id", payload.optionId);

    const { data: pollRow, error: pollError } = await admin
      .from("polls")
      .select("id, post_id")
      .eq("id", payload.pollId)
      .single();

    if (pollError || !pollRow) {
      return NextResponse.json({ error: "투표를 찾을 수 없습니다." }, { status: 404 });
    }

    const { data: voteRows, error: voteRowsError } = await admin
      .from("poll_votes")
      .select("id")
      .eq("poll_id", payload.pollId);

    if (voteRowsError) {
      return NextResponse.json({ error: voteRowsError.message }, { status: 500 });
    }

    const pollVoteCount = voteRows?.length ?? 0;

    const { data: postRow, error: postError } = await admin
      .from("posts")
      .select("id, created_at, like_count, comment_count, view_count")
      .eq("id", String(pollRow.post_id))
      .single();

    if (postError || !postRow) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    const hotScore = calculateHotScore({
      likeCount: typeof postRow.like_count === "number" ? postRow.like_count : 0,
      commentCount: typeof postRow.comment_count === "number" ? postRow.comment_count : 0,
      viewCount: typeof postRow.view_count === "number" ? postRow.view_count : 0,
      pollVoteCount,
      createdAt: String(postRow.created_at),
    });

    await admin
      .from("posts")
      .update({
        poll_vote_count: pollVoteCount,
        hot_score: hotScore,
      })
      .eq("id", String(pollRow.post_id));

    const { data: optionRows, error: optionsError } = await admin
      .from("poll_options")
      .select("id, option_text, vote_count")
      .eq("poll_id", payload.pollId)
      .order("created_at", { ascending: true });

    if (optionsError) {
      return NextResponse.json({ error: optionsError.message }, { status: 500 });
    }

    return NextResponse.json({
      pollId: payload.pollId,
      postId: String(pollRow.post_id),
      totalVotes: pollVoteCount,
      votedOptionId: payload.optionId,
      options: (optionRows ?? []).map((option) => ({
        id: String(option.id),
        text: String(option.option_text),
        voteCount: Number(option.vote_count ?? 0),
        percentage:
          pollVoteCount > 0
            ? Math.round((Number(option.vote_count ?? 0) / pollVoteCount) * 100)
            : 0,
      })),
    });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "투표에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
