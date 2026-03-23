"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sparkles, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  APP_MOTION_STORAGE_KEY,
  APP_THEME_STORAGE_KEY,
  type ThemeMode,
  getResolvedThemeMode,
} from "@/lib/app-preferences";

const THEME_OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "일반", icon: Sun },
  { value: "dark", label: "다크", icon: Moon },
  { value: "system", label: "기기 설정", icon: Monitor },
];

function applyAppPreferences(themeMode: ThemeMode, reduceMotion: boolean, prefersDark: boolean) {
  const resolvedTheme = getResolvedThemeMode(themeMode, prefersDark);

  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeMode = themeMode;
  document.documentElement.dataset.reduceMotion = reduceMotion ? "true" : "false";
}

export function AppSettingsSection() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const storedTheme = localStorage.getItem(APP_THEME_STORAGE_KEY) as ThemeMode | null;
    const storedMotion = localStorage.getItem(APP_MOTION_STORAGE_KEY);

    setPrefersDark(mediaQuery.matches);
    setThemeMode(storedTheme ?? "dark");
    setReduceMotion(storedMotion === "true");

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersDark(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(APP_THEME_STORAGE_KEY, themeMode);
    localStorage.setItem(APP_MOTION_STORAGE_KEY, reduceMotion ? "true" : "false");
    applyAppPreferences(themeMode, reduceMotion, prefersDark);
  }, [themeMode, reduceMotion, prefersDark]);

  const currentThemeLabel =
    getResolvedThemeMode(themeMode, prefersDark) === "dark" ? "다크 모드" : "일반 모드";

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <p className="text-base font-semibold text-gray-900">앱 설정</p>
        <p className="text-sm text-gray-500">화면 모드와 움직임만 간단하게 조정할 수 있습니다.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">화면 모드</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={themeMode === option.value ? "default" : "outline"}
                  className="justify-center"
                  onClick={() => setThemeMode(option.value)}
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </Button>
              ))}
            </div>
            <p className="text-sm text-gray-500">현재 적용: {currentThemeLabel}</p>
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">애니메이션 줄이기</p>
                <p className="text-sm text-gray-500">화면 전환과 버튼 움직임을 더 차분하게 표시합니다.</p>
              </div>
              <Button
                type="button"
                variant={reduceMotion ? "default" : "outline"}
                onClick={() => setReduceMotion((current) => !current)}
              >
                <Sparkles className="h-4 w-4" />
                {reduceMotion ? "켜짐" : "꺼짐"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
