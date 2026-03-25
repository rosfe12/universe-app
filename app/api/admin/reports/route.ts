import { NextResponse } from "next/server";
import { z } from "zod";

import { insertAdminAuditLog, listAdminAuditLogs, requireAdminUser } from "@/app/api/admin/_utils";
import { logServerEvent } from "@/lib/ops";
import type { Report } from "@/types";

export const runtime = "nodejs";

const patchSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(["pending", "reviewing", "confirmed", "dismissed"]),
});

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdminUser(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim();

    let builder = admin
      .from("reports")
      .select("id, reporter_id, target_type, target_id, reason, memo, status, created_at")
      .order("created_at", { ascending: false })
      .limit(80);

    if (
      status === "pending" ||
      status === "reviewing" ||
      status === "confirmed" ||
      status === "dismissed"
    ) {
      builder = builder.eq("status", status);
    }

    const { data, error } = await builder;

    if (error) {
      throw error;
    }

    const reports: Report[] = (data ?? []).map((row) => ({
      id: String(row.id),
      reporterId: String(row.reporter_id),
      targetType:
        row.target_type === "post" ||
        row.target_type === "comment" ||
        row.target_type === "user" ||
        row.target_type === "review" ||
        row.target_type === "profile"
          ? row.target_type
          : "post",
      targetId: String(row.target_id),
      reason:
        row.reason === "misinformation" ||
        row.reason === "abuse" ||
        row.reason === "spam" ||
        row.reason === "harassment" ||
        row.reason === "fraud" ||
        row.reason === "sexual_content" ||
        row.reason === "other"
          ? row.reason
          : "other",
      memo: row.memo ? String(row.memo) : undefined,
      status:
        row.status === "pending" ||
        row.status === "reviewing" ||
        row.status === "confirmed" ||
        row.status === "dismissed" ||
        row.status === "reviewed"
          ? row.status
          : "pending",
      createdAt: String(row.created_at),
    }));

    return NextResponse.json({ reports });
  } catch (error) {
    logServerEvent("error", "admin_reports_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "신고 목록을 불러올 수 없습니다." },
      { status: 403 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { admin, user } = await requireAdminUser(request);
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const { reportId, status } = parsed.data;
    const { data: report, error: reportError } = await admin
      .from("reports")
      .select("id, target_type, target_id, reason, status")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: "신고를 찾을 수 없습니다." }, { status: 404 });
    }

    const { error: updateError } = await admin
      .from("reports")
      .update({ status })
      .eq("id", reportId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await insertAdminAuditLog(admin, {
      adminUserId: user.id,
      action: "report_status_updated",
      targetType: "report",
      targetId: report.id,
      summary: `신고 상태를 ${report.status}에서 ${status}(으)로 변경했습니다.`,
      metadata: {
        reportId: report.id,
        targetType: report.target_type,
        targetId: report.target_id,
        reason: report.reason,
      },
    }).catch(() => null);

    const auditLogs = await listAdminAuditLogs(admin).catch(() => []);
    return NextResponse.json({ ok: true, auditLogs });
  } catch (error) {
    logServerEvent("error", "admin_report_update_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "신고 상태를 변경할 수 없습니다." },
      { status: 403 },
    );
  }
}
