import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient, User as SupabaseAuthUser } from "@supabase/supabase-js";

import {
  AUTH_SESSION_MARKER_STORAGE_KEY,
  AUTH_KEEP_LOGGED_IN_STORAGE_KEY,
  SUPABASE_AUTH_STORAGE_KEY,
  getKeepLoggedInPreference,
} from "@/lib/app-preferences";
import { publicEnv } from "@/lib/env";

let browserClient: SupabaseClient | null = null;
let authUserPromise: Promise<SupabaseAuthUser | null> | null = null;

export function hasSupabaseAuthCookie() {
  if (typeof window === "undefined") {
    return false;
  }

  return document.cookie
    .split(";")
    .map((item) => item.trim().split("=")[0] ?? "")
    .some(
      (name) =>
        name === SUPABASE_AUTH_STORAGE_KEY ||
        name.startsWith(`${SUPABASE_AUTH_STORAGE_KEY}.`),
    );
}

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
}

export function clearSupabaseSessionStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(AUTH_SESSION_MARKER_STORAGE_KEY);
}

export async function waitForSupabaseAuthCookie(
  present: boolean,
  timeoutMs = 1500,
) {
  if (typeof window === "undefined") {
    return;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (hasSupabaseAuthCookie() === present) {
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
}

export async function getCurrentSupabaseAuthUser(force = false) {
  if (!force && authUserPromise) {
    return authUserPromise;
  }

  authUserPromise = createClient()
    .auth.getUser()
    .then(({ data: { user } }) => user ?? null)
    .catch(() => null)
    .finally(() => {
      window.setTimeout(() => {
        authUserPromise = null;
      }, 0);
    });

  return authUserPromise;
}

export function resetSupabaseAuthUserCache() {
  authUserPromise = null;
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
      storageKey: SUPABASE_AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}
