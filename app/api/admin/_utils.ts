import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AdminAuditLog } from "@/types";

export async function requireAdminUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("인증 정보가 필요합니다.");
  }

  let user = null;

  if (token) {
    const authClient = createClient(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const {
      data: { user: tokenUser },
      error: tokenUserError,
    } = await authClient.auth.getUser(token);

    if (tokenUserError || !tokenUser) {
      throw new Error("로그인이 필요합니다.");
    }

    user = tokenUser;
  } else {
    const serverClient = await createServerSupabaseClient();
    const {
      data: { user: cookieUser },
      error: cookieUserError,
    } = await serverClient.auth.getUser();

    if (cookieUserError || !cookieUser) {
      throw new Error("로그인이 필요합니다.");
    }

    user = cookieUser;
  }

  const admin = createAdminSupabaseClient();
  const { data: role, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !role) {
    throw new Error("관리자만 접근할 수 있습니다.");
  }

  return { user, admin };
}

export async function insertAdminAuditLog(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  input: {
    adminUserId: string;
    action: string;
    targetType:
      | "verification_request"
      | "report"
      | "user"
      | "post"
      | "comment"
      | "review"
      | "profile";
    targetId?: string | null;
    summary: string;
    metadata?: Record<string, unknown>;
  },
) {
  await admin.from("admin_audit_logs").insert({
    admin_user_id: input.adminUserId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    summary: input.summary,
    metadata: input.metadata ?? {},
  });
}

export async function listAdminAuditLogs(
  admin: ReturnType<typeof createAdminSupabaseClient>,
) {
  const { data, error } = await admin
    .from("admin_audit_logs")
    .select("id, admin_user_id, action, target_type, target_id, summary, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (row): AdminAuditLog => ({
      id: String(row.id),
      adminUserId: String(row.admin_user_id),
      action: String(row.action),
      targetType:
        row.target_type === "verification_request" ||
        row.target_type === "report" ||
        row.target_type === "user" ||
        row.target_type === "post" ||
        row.target_type === "comment" ||
        row.target_type === "review" ||
        row.target_type === "profile"
          ? row.target_type
          : "report",
      targetId: row.target_id ? String(row.target_id) : undefined,
      summary: String(row.summary),
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : undefined,
      createdAt: String(row.created_at),
    }),
  );
}
