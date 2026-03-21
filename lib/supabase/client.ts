import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const anonKey = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key";

  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}
