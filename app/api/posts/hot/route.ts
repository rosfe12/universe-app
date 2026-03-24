import { NextResponse } from "next/server";

import { measureServerOperation } from "@/lib/ops";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const preferredRegion = "hnd1";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const school = searchParams.get("school");
  const admin = createAdminSupabaseClient();

  let query = admin
    .from("posts")
    .select("id, school_id, category, subcategory, post_type, title, like_count, comment_count, view_count, hot_score, poll_vote_count, created_at")
    .order("hot_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (school) {
    query = query.eq("school_id", school);
  }

  const { data, error } = await measureServerOperation(
    "api.posts.hot",
    async () => await query,
    { school, limit },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { posts: data ?? [] },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
