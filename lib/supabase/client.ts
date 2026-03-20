import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

export function createClient() {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const anonKey = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key";

  return createBrowserClient(url, anonKey);
}
