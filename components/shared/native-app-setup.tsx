"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

import {
  bindNativePushAuthSync,
  initializeNativePushNotifications,
  removeNativePushListeners,
  requestNativePushPermissionAndRegister,
} from "@/lib/native-push";
import { ensureSupabaseSessionReady } from "@/lib/supabase/client";

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

async function waitForBootSplashReady() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < 3000) {
    const bootSplash = document.getElementById("app-boot-splash");
    if (bootSplash) {
      await waitForNextPaint();
      return;
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 16);
    });
  }
}

export function NativeAppSetup() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const pushSubscription = bindNativePushAuthSync();

    void (async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: "#0F172A" });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch {}

      try {
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
      } catch {}

      try {
        await waitForBootSplashReady();
        await SplashScreen.hide();
      } catch {}

      try {
        await initializeNativePushNotifications();
        const session = await ensureSupabaseSessionReady();
        if (session?.user) {
          await requestNativePushPermissionAndRegister();
        }
      } catch {}
    })();

    return () => {
      pushSubscription.unsubscribe();
      void removeNativePushListeners();
    };
  }, []);

  return null;
}
