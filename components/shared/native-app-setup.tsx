"use client";

import { useEffect } from "react";

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
    let active = true;
    let unsubscribePushSync = () => {};
    let removePushListeners = async () => {};

    void (async () => {
      const [
        { Capacitor },
        { Keyboard, KeyboardResize },
        { SplashScreen },
        { StatusBar, Style },
        nativePushModule,
        { ensureSupabaseSessionReady },
      ] = await Promise.all([
        import("@capacitor/core"),
        import("@capacitor/keyboard"),
        import("@capacitor/splash-screen"),
        import("@capacitor/status-bar"),
        import("@/lib/native-push"),
        import("@/lib/supabase/client"),
      ]);

      if (!active || !Capacitor.isNativePlatform()) {
        return;
      }

      const pushSubscription = nativePushModule.bindNativePushAuthSync();
      unsubscribePushSync = () => pushSubscription.unsubscribe();
      removePushListeners = nativePushModule.removeNativePushListeners;

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
        await nativePushModule.initializeNativePushNotifications();
        const session = await ensureSupabaseSessionReady();
        if (session?.user) {
          await nativePushModule.requestNativePushPermissionAndRegister();
        }
      } catch {}
    })();

    return () => {
      active = false;
      unsubscribePushSync();
      void removePushListeners();
    };
  }, []);

  return null;
}
