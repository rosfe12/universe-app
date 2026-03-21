import { NextResponse } from "next/server";

import { hasAppSmtpConfig } from "@/lib/env";
import { verifyAppSmtpConnection } from "@/lib/email/server-mailer";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logServerEvent } from "@/lib/ops";

export const runtime = "nodejs";

export async function GET() {
  try {
    const admin = createAdminSupabaseClient();
    const [{ error: schoolsError }, { data: mediaBucket, error: bucketError }] =
      await Promise.all([
        admin.from("schools").select("id", { count: "exact", head: true }),
        admin.storage.getBucket("media"),
      ]);

    if (schoolsError || bucketError) {
      throw schoolsError ?? bucketError ?? new Error("health check failed");
    }

    let mail = "supabase_auth_fallback";
    if (hasAppSmtpConfig()) {
      await verifyAppSmtpConnection();
      mail = "app_smtp_ready";
    }

    return NextResponse.json({
      ok: true,
      database: "ready",
      storage: mediaBucket?.name === "media" ? "ready" : "missing",
      mail,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logServerEvent("error", "health_check_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      {
        ok: false,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
