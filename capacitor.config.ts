import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: process.env.CAPACITOR_APP_ID?.trim() || "kr.universeapp.camverse",
  appName: process.env.CAPACITOR_APP_NAME?.trim() || "CAMVERSE",
  webDir: "mobile-shell",
  backgroundColor: "#0F172A",
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 450,
      launchFadeOutDuration: 120,
      backgroundColor: "#0F172A",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  loggingBehavior: process.env.NODE_ENV === "production" ? "none" : "debug",
  server: {
    url: process.env.CAPACITOR_SERVER_URL?.trim() || "https://www.universeapp.kr",
    cleartext: false,
    allowNavigation: [
      "universeapp.kr",
      "*.universeapp.kr",
      "*.supabase.co",
      "*.supabase.in",
      "*.googleapis.com",
      "*.gstatic.com",
      "*.kakao.com",
      "*.kakaocdn.net",
    ],
  },
};

export default config;
