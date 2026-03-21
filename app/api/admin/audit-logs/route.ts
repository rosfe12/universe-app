import { NextResponse } from "next/server";

import { listAdminAuditLogs, requireAdminUser } from "@/app/api/admin/_utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdminUser(request);
    const auditLogs = await listAdminAuditLogs(admin);
    return NextResponse.json({ auditLogs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "운영 이력을 불러올 수 없습니다." },
      { status: 403 },
    );
  }
}
