import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AUTH_SESSION_MARKER_STORAGE_KEY,
  AUTH_KEEP_LOGGED_IN_STORAGE_KEY,
  SUPABASE_AUTH_STORAGE_KEY,
  getKeepLoggedInPreference,
} from "@/lib/app-preferences";
import { publicEnv } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

const SUPABASE_AUTH_AUXILIARY_KEYS = [
  SUPABASE_AUTH_STORAGE_KEY,
  `${SUPABASE_AUTH_STORAGE_KEY}-code-verifier`,
];

function getActiveAuthStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return getKeepLoggedInPreference() ? window.localStorage : window.sessionStorage;
}

const browserAuthStorage = {
  getItem(key: string) {
    return getActiveAuthStorage()?.getItem(key) ?? null;
  },
  setItem(key: string, value: string) {
    getActiveAuthStorage()?.setItem(key, value);
  },
  removeItem(key: string) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export function setSupabaseSessionPersistence(keepLoggedIn: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_KEEP_LOGGED_IN_STORAGE_KEY, keepLoggedIn ? "true" : "false");
  if (keepLoggedIn) {
    window.sessionStorage.removeItem(AUTH_SESSION_MARKER_STORAGE_KEY);
  } else {
    window.sessionStorage.setItem(AUTH_SESSION_MARKER_STORAGE_KEY, "true");
  }

  const sourceStorage = keepLoggedIn ? window.sessionStorage : window.localStorage;
  const targetStorage = keepLoggedIn ? window.localStorage : window.sessionStorage;

  for (const key of SUPABASE_AUTH_AUXILIARY_KEYS) {
    const value = sourceStorage.getItem(key);
    if (value) {
      targetStorage.setItem(key, value);
      sourceStorage.removeItem(key);
    }
  }
}

export function clearSupabaseSessionStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(AUTH_SESSION_MARKER_STORAGE_KEY);

  for (const key of SUPABASE_AUTH_AUXILIARY_KEYS) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
}

export function shouldClearNonPersistentSession() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    !getKeepLoggedInPreference() &&
    window.sessionStorage.getItem(AUTH_SESSION_MARKER_STORAGE_KEY) !== "true"
  );
}

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const anonKey = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key";

  browserClient = createBrowserClient(url, anonKey, {
    cookieOptions: {
      name: SUPABASE_AUTH_STORAGE_KEY,
    },
    auth: {
      storage: browserAuthStorage,
      storageKey: SUPABASE_AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}
