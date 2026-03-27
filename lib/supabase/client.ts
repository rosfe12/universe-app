import { createBrowserClient } from "@supabase/ssr";
import type {
  Session as SupabaseAuthSession,
  SupabaseClient,
  User as SupabaseAuthUser,
} from "@supabase/supabase-js";

import {
  AUTH_PERSISTED_LOCAL_SESSION_STORAGE_KEY,
  AUTH_PERSISTED_SESSION_STORAGE_KEY,
  AUTH_SESSION_MARKER_STORAGE_KEY,
  AUTH_KEEP_LOGGED_IN_STORAGE_KEY,
  SUPABASE_AUTH_STORAGE_KEY,
  getKeepLoggedInPreference,
} from "@/lib/app-preferences";
import { publicEnv } from "@/lib/env";

let browserClient: SupabaseClient | null = null;
let authUserPromise: Promise<SupabaseAuthUser | null> | null = null;
let sessionBootstrapPromise: Promise<SupabaseAuthSession | null> | null = null;
let sessionBootstrapCompleted = false;

type PersistedSupabaseSession = {
  access_token: string;
  refresh_token: string;
};

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

function getPersistedSessionStorageKeys() {
  return {
    local: AUTH_PERSISTED_LOCAL_SESSION_STORAGE_KEY,
    session: AUTH_PERSISTED_SESSION_STORAGE_KEY,
  };
}

function readPersistedSession(rawValue: string | null): PersistedSupabaseSession | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as PersistedSupabaseSession;
    if (!parsed.access_token || !parsed.refresh_token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hasPersistedSupabaseSession() {
  if (typeof window === "undefined") {
    return false;
  }

  const storageKeys = getPersistedSessionStorageKeys();
  return Boolean(
    readPersistedSession(window.sessionStorage.getItem(storageKeys.session)) ||
      readPersistedSession(window.localStorage.getItem(storageKeys.local)),
  );
}

export function persistSupabaseSession(
  session: SupabaseAuthSession | null,
  keepLoggedIn = getKeepLoggedInPreference(),
) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKeys = getPersistedSessionStorageKeys();
  window.localStorage.removeItem(storageKeys.local);
  window.sessionStorage.removeItem(storageKeys.session);

  if (!session?.access_token || !session.refresh_token) {
    sessionBootstrapCompleted = true;
    return;
  }

  const targetStorage = keepLoggedIn ? window.localStorage : window.sessionStorage;
  const targetKey = keepLoggedIn ? storageKeys.local : storageKeys.session;

  targetStorage.setItem(
    targetKey,
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }),
  );
  sessionBootstrapCompleted = true;
}

export function clearPersistedSupabaseSession() {
  if (typeof window === "undefined") {
    return;
  }

  const storageKeys = getPersistedSessionStorageKeys();
  window.localStorage.removeItem(storageKeys.local);
  window.sessionStorage.removeItem(storageKeys.session);
}

export function resetSupabaseSessionBootstrap() {
  sessionBootstrapCompleted = false;
  sessionBootstrapPromise = null;
}

export async function restorePersistedSupabaseSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const supabase = createClient();
  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession();

  if (currentSession?.access_token && currentSession.refresh_token) {
    persistSupabaseSession(currentSession);
    return currentSession;
  }

  const storageKeys = getPersistedSessionStorageKeys();
  const persistedSession =
    readPersistedSession(window.sessionStorage.getItem(storageKeys.session)) ||
    readPersistedSession(window.localStorage.getItem(storageKeys.local));

  if (!persistedSession) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession(persistedSession);

  if (error || !data.session) {
    clearPersistedSupabaseSession();
    return null;
  }

  persistSupabaseSession(data.session);
  return data.session;
}

export async function ensureSupabaseSessionReady(force = false) {
  if (typeof window === "undefined") {
    return null;
  }

  if (force) {
    resetSupabaseSessionBootstrap();
  }

  if (sessionBootstrapCompleted) {
    const {
      data: { session },
    } = await createClient().auth.getSession();
    return session ?? null;
  }

  if (sessionBootstrapPromise) {
    return sessionBootstrapPromise;
  }

  sessionBootstrapPromise = (async () => {
    if (shouldClearNonPersistentSession()) {
      clearSupabaseSessionStorage();
      await createClient().auth.signOut();
    }

    const restoredSession = await restorePersistedSupabaseSession();
    sessionBootstrapCompleted = true;
    return restoredSession;
  })().finally(() => {
    sessionBootstrapPromise = null;
  });

  return sessionBootstrapPromise;
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

  resetSupabaseSessionBootstrap();
  window.sessionStorage.removeItem(AUTH_SESSION_MARKER_STORAGE_KEY);
  clearPersistedSupabaseSession();
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

  authUserPromise = (async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      return session.user;
    }

    if (!force) {
      return null;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user ?? null;
  })()
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
