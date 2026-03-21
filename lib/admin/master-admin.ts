import "server-only";

import type { createAdminSupabaseClient } from "@/lib/supabase/admin";

const DEFAULT_MASTER_ADMIN_EMAILS = ["rosfe12@gmail.com"];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getMasterAdminEmails() {
  const configured = (process.env.MASTER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const merged = configured.length > 0 ? configured : DEFAULT_MASTER_ADMIN_EMAILS;
  return Array.from(new Set(merged.map(normalizeEmail)));
}

export function isMasterAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return getMasterAdminEmails().includes(normalizeEmail(email));
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

  const { error } = await admin.from("user_roles").upsert(
    {
      user_id: user.id,
      role: "admin",
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }

  return true;
}
