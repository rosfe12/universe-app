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
  while (Date.now() - startedAt < 8000) {
    const bootSplash = document.getElementById("app-boot-splash");
    if (
      bootSplash &&
      bootSplash.getBoundingClientRect().height > 0 &&
      window.getComputedStyle(bootSplash).display !== "none"
    ) {
      await waitForNextPaint();
      return;
    }

    if (document.readyState === "complete") {
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
    let deferredPushTimer: number | null = null;

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

      deferredPushTimer = window.setTimeout(() => {
        if (!active) {
          return;
        }

        void (async () => {
          try {
            await nativePushModule.initializeNativePushNotifications();
            const session = await ensureSupabaseSessionReady();
            if (session?.user) {
              await nativePushModule.requestNativePushPermissionAndRegister();
            }
          } catch {}
        })();
      }, 900);
    })();

    return () => {
      active = false;
      if (deferredPushTimer !== null) {
        window.clearTimeout(deferredPushTimer);
      }
      unsubscribePushSync();
      void removePushListeners();
    };
  }, []);

  return null;
}
