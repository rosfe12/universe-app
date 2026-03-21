import { NextResponse } from "next/server";

import { listAdminAuditLogs, requireAdminUser } from "@/app/api/admin/_utils";
import { logServerEvent } from "@/lib/ops";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdminUser(request);
    const auditLogs = await listAdminAuditLogs(admin);
    return NextResponse.json({ auditLogs });
  } catch (error) {
    logServerEvent("error", "admin_audit_logs_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "운영 이력을 불러올 수 없습니다." },
      { status: 403 },
    );
  }
}
