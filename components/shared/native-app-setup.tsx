"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

import { bindNativePushAuthSync, initializeNativePushNotifications, requestNativePushPermissionAndRegister } from "@/lib/native-push";
import { ensureSupabaseSessionReady } from "@/lib/supabase/client";

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
    };
  }, []);

  return null;
}
