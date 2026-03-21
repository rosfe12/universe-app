import { NextResponse } from "next/server";
import { z } from "zod";

import { insertAdminAuditLog, listAdminAuditLogs, requireAdminUser } from "@/app/api/admin/_utils";

export const runtime = "nodejs";

const patchSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(["pending", "reviewing", "confirmed", "dismissed"]),
});

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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "신고 상태를 변경할 수 없습니다." },
      { status: 403 },
    );
  }
}
