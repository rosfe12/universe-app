import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  const { postId } = await context.params;
  const admin = createAdminSupabaseClient();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pollRow, error: pollError } = await admin
    .from("polls")
    .select("id, post_id, question, created_at")
    .eq("post_id", postId)
    .maybeSingle();

  if (pollError) {
    return NextResponse.json({ error: pollError.message }, { status: 500 });
  }

  if (!pollRow) {
    return NextResponse.json({ poll: null }, { status: 404 });
  }

  const { data: optionRows, error: optionError } = await admin
    .from("poll_options")
    .select("id, option_text, vote_count")
    .eq("poll_id", String(pollRow.id))
    .order("position", { ascending: true });

  if (optionError) {
    return NextResponse.json({ error: optionError.message }, { status: 500 });
  }

  const totalVotes = (optionRows ?? []).reduce(
    (sum, option) => sum + Number(option.vote_count ?? 0),
    0,
  );

  let votedOptionId: string | undefined;
  if (user) {
    const { data: voteRow } = await admin
      .from("poll_votes")
      .select("option_id")
      .eq("poll_id", String(pollRow.id))
      .eq("user_id", user.id)
      .maybeSingle();

    votedOptionId = voteRow?.option_id ? String(voteRow.option_id) : undefined;
  }

  return NextResponse.json({
    poll: {
      id: String(pollRow.id),
      postId: String(pollRow.post_id),
      question: String(pollRow.question),
      createdAt: String(pollRow.created_at),
      totalVotes,
      votedOptionId,
      options: (optionRows ?? []).map((option) => ({
        id: String(option.id),
        text: String(option.option_text),
        voteCount: Number(option.vote_count ?? 0),
        percentage:
          totalVotes > 0
            ? Math.round((Number(option.vote_count ?? 0) / totalVotes) * 100)
            : 0,
      })),
    },
  });
}
