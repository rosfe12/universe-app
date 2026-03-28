import type { Metadata } from "next";
import Script from "next/script";
import type { Viewport } from "next";

import "@/app/globals.css";
import { NativeAppSetup } from "@/components/shared/native-app-setup";
import { AppLaunchGate } from "@/components/shared/app-launch-gate";
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

const serviceWorkerRegisterScript = `
(() => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
})();
`;

export const metadata: Metadata = {
  applicationName: "CAMVERSE",
  title: "CAMVERSE",
  description: "익명으로 연결되는 캠퍼스 네트워크",
  metadataBase: new URL(appUrl),
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcut: "/icon.svg",
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="CAMVERSE" />
        <meta name="theme-color" content="#0F172A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="CAMVERSE" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
        <Script id="pwa-register" strategy="afterInteractive">
          {serviceWorkerRegisterScript}
        </Script>
        <NativeAppSetup />
        <AppLaunchGate>{children}</AppLaunchGate>
      </body>
    </html>
  );
}
