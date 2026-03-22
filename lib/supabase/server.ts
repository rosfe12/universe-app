import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_AUTH_STORAGE_KEY } from "@/lib/app-preferences";
import { publicEnv } from "@/lib/env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const anonKey = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key";

  return createServerClient(url, anonKey, {
    cookieOptions: {
      name: SUPABASE_AUTH_STORAGE_KEY,
    },
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}
