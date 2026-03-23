export type ThemeMode = "light" | "dark" | "system";

export const APP_THEME_STORAGE_KEY = "univers-theme-mode";
export const APP_MOTION_STORAGE_KEY = "univers-reduce-motion";
export const AUTH_KEEP_LOGGED_IN_STORAGE_KEY = "univers-auth-keep-logged-in";
export const AUTH_SAVED_EMAIL_STORAGE_KEY = "univers-auth-saved-email";
export const AUTH_SAVED_PASSWORD_STORAGE_KEY = "univers-auth-saved-password";
export const SUPABASE_AUTH_STORAGE_KEY = "univers-supabase-auth-token";
export const AUTH_SESSION_MARKER_STORAGE_KEY = "univers-auth-session-active";
export const AUTH_PERSISTED_LOCAL_SESSION_STORAGE_KEY = "univers-auth-persisted-session";
export const AUTH_PERSISTED_SESSION_STORAGE_KEY = "univers-auth-session-session";

export function getResolvedThemeMode(themeMode: ThemeMode, prefersDark: boolean) {
  if (themeMode === "system") {
    return prefersDark ? "dark" : "light";
  }

  return themeMode;
}

export function getKeepLoggedInPreference() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(AUTH_KEEP_LOGGED_IN_STORAGE_KEY) !== "false";
}

export function setKeepLoggedInPreference(keepLoggedIn: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_KEEP_LOGGED_IN_STORAGE_KEY, keepLoggedIn ? "true" : "false");
}
