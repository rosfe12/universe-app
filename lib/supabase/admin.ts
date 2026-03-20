import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

export function createAdminSupabaseClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "service-role-key";

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
