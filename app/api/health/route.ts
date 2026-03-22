import { NextResponse } from "next/server";

import { env, hasAppSmtpConfig } from "@/lib/env";
import { verifyAppSmtpConnection } from "@/lib/email/server-mailer";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logServerEvent } from "@/lib/ops";

export const runtime = "nodejs";

export async function GET() {
  try {
    const admin = createAdminSupabaseClient();
    const [
      { error: schoolsError },
      { error: usersError },
      { error: postsError },
      { error: commentsError },
      { error: tradeMessagesError },
      { error: notificationsError },
      { error: verificationRequestsError },
      { error: auditLogsError },
      { error: opsEventsError },
      { error: profilesRpcError },
      { data: mediaBucket, error: bucketError },
    ] = await Promise.all([
      admin.from("schools").select("id", { count: "exact", head: true }),
      admin.from("users").select("id", { count: "exact", head: true }),
      admin.from("posts").select("id", { count: "exact", head: true }),
      admin.from("comments").select("id", { count: "exact", head: true }),
      admin.from("trade_messages").select("id", { count: "exact", head: true }),
      admin.from("notifications").select("id", { count: "exact", head: true }),
      admin.from("student_verification_requests").select("id", { count: "exact", head: true }),
      admin.from("admin_audit_logs").select("id", { count: "exact", head: true }),
      admin.from("ops_events").select("id", { count: "exact", head: true }),
      admin.rpc("list_user_public_profiles"),
      admin.storage.getBucket("media"),
    ]);

    const checks = {
      schools: !schoolsError,
      users: !usersError,
      posts: !postsError,
      comments: !commentsError,
      tradeMessages: !tradeMessagesError,
      notifications: !notificationsError,
      verificationRequests: !verificationRequestsError,
      adminAuditLogs: !auditLogsError,
      opsEvents: !opsEventsError,
      publicProfilesRpc: !profilesRpcError,
      mediaBucket: !bucketError && mediaBucket?.name === "media",
    } as const;

    const failedChecks = Object.entries(checks)
      .filter(([, ok]) => !ok)
      .map(([name]) => name);

    if (failedChecks.length > 0) {
      throw new Error(`health check failed: ${failedChecks.join(",")}`);
    }

    const smtpConfig = {
      host: Boolean(env.SUPABASE_SMTP_HOST),
      port: Boolean(env.SUPABASE_SMTP_PORT),
      user: Boolean(env.SUPABASE_SMTP_USER),
      password: Boolean(env.SUPABASE_SMTP_PASSWORD),
      senderName: Boolean(env.SUPABASE_SMTP_SENDER_NAME),
      senderEmail: Boolean(env.SUPABASE_SMTP_SENDER_EMAIL),
    } as const;

    let mail = "supabase_auth_fallback";
    const warnings: string[] = [];
    if (hasAppSmtpConfig()) {
      await verifyAppSmtpConnection();
      mail = "app_smtp_ready";
    } else {
      warnings.push("app_smtp_not_configured");
    }

    return NextResponse.json({
      ok: true,
      database: "ready",
      storage: mediaBucket?.name === "media" ? "ready" : "missing",
      mail,
      smtpConfig,
      checks,
      warnings,
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
