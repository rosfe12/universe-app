export type ThemeMode = "light" | "dark" | "system";

export const APP_THEME_STORAGE_KEY = "univers-theme-mode";
export const APP_MOTION_STORAGE_KEY = "univers-reduce-motion";

export function getResolvedThemeMode(themeMode: ThemeMode, prefersDark: boolean) {
  if (themeMode === "system") {
    return prefersDark ? "dark" : "light";
  }

  return themeMode;
}
