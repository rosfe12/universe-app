import { NextResponse } from "next/server";

import { requireAdminUser } from "@/app/api/admin/_utils";
import { logServerEvent } from "@/lib/ops";
import type { AdminOpsEvent } from "@/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdminUser(request);
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim().toLowerCase();
    const level = (searchParams.get("level") ?? "all").trim();
    const slowOnly = searchParams.get("slowOnly") === "true";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "50") || 50, 1), 100);

    let builder = admin
      .from("ops_events")
      .select("id, level, event, source, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(limit * 3);

    if (level === "info" || level === "warn" || level === "error") {
      builder = builder.eq("level", level);
    }

    const { data, error } = await builder;

    if (error) {
      throw error;
    }

    const items = (data ?? [])
      .map(
        (row): AdminOpsEvent => ({
          id: String(row.id),
          level:
            row.level === "warn" || row.level === "error" || row.level === "info"
              ? row.level
              : "info",
          event: String(row.event),
          source: String(row.source),
          metadata:
            row.metadata && typeof row.metadata === "object"
              ? (row.metadata as Record<string, unknown>)
              : undefined,
          createdAt: String(row.created_at),
        }),
      )
      .filter((item) => {
        if (slowOnly && typeof item.metadata?.durationMs !== "number") {
          return false;
        }

        if (!query) {
          return true;
        }

        const haystack = [
          item.event,
          item.source,
          JSON.stringify(item.metadata ?? {}),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .slice(0, limit);

    return NextResponse.json({ items });
  } catch (error) {
    logServerEvent("error", "admin_ops_events_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "운영 로그를 불러올 수 없습니다." },
      { status: 403 },
    );
  }
}
