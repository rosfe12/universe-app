import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const school = searchParams.get("school");
  const since = new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString();
  const admin = createAdminSupabaseClient();

  let query = admin
    .from("posts")
    .select("id, school_id, category, subcategory, post_type, title, content, like_count, comment_count, view_count, hot_score, poll_vote_count, created_at")
    .gte("created_at", since)
    .order("hot_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (school) {
    query = query.eq("school_id", school);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data ?? [] });
}
