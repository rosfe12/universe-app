import type { Metadata } from "next";
import Script from "next/script";

import "@/app/globals.css";
import { APP_MOTION_STORAGE_KEY, APP_THEME_STORAGE_KEY } from "@/lib/app-preferences";
import { resolveAppUrl } from "@/lib/env";

const appUrl = resolveAppUrl();
const themeBootScript = `
(() => {
  try {
    const themeMode = localStorage.getItem("${APP_THEME_STORAGE_KEY}") || "dark";
    const reduceMotion = localStorage.getItem("${APP_MOTION_STORAGE_KEY}") === "true";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme =
      themeMode === "dark" || (themeMode === "system" && prefersDark) ? "dark" : "light";

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themeMode = themeMode;
    document.documentElement.dataset.reduceMotion = reduceMotion ? "true" : "false";
  } catch (error) {}
})();
`;

export const metadata: Metadata = {
  title: "CAMVERSE – 대학생 커뮤니티",
  description: "익명으로 연결되는 캠퍼스 네트워크",
  metadataBase: new URL(appUrl),
  icons: {
    icon: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
