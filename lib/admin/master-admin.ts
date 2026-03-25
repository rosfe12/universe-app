import "server-only";

import type { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isMasterAdminEmail } from "@/lib/admin/master-admin-shared";

const DEFAULT_MASTER_ADMIN_HANDLE = "rosfe";

function getMasterAdminHandle() {
  return (process.env.MASTER_ADMIN_HANDLE ?? DEFAULT_MASTER_ADMIN_HANDLE).trim();
}

export async function ensureMasterAdminRole(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  user: {
    id: string;
    email?: string | null;
  },
) {
  if (!isMasterAdminEmail(user.email)) {
    return false;
  }

  const handle = getMasterAdminHandle();
  const [{ error: roleError }, { error: userError }] = await Promise.all([
    admin.from("user_roles").upsert(
      {
        user_id: user.id,
        role: "admin",
      },
      { onConflict: "user_id" },
    ),
    admin.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? null,
        name: handle,
        nickname: handle,
        school_email: null,
        school_email_verified_at: null,
        student_verification_status: "unverified",
        verified: false,
      },
      { onConflict: "id" },
    ),
  ]);

  if (roleError || userError) {
    throw roleError ?? userError;
  }

  return true;
}
