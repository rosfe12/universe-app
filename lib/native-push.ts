import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import { PushNotifications } from "@capacitor/push-notifications";

import {
  createClient,
  ensureSupabaseSessionReady,
  getCurrentSupabaseAuthUser,
} from "@/lib/supabase/client";

type PushPlatform = "ios" | "android";

type StoredPushRegistration = {
  token: string;
  deviceId: string;
  platform: PushPlatform;
};

const PUSH_REGISTRATION_STORAGE_KEY = "camverse_native_push_registration";
const PUSH_PERMISSION_REQUESTED_STORAGE_KEY = "camverse_native_push_requested";

let pushListenersInitialized = false;
let pushListenerHandles: PluginListenerHandle[] = [];

function getNativePushPlatform(): PushPlatform | null {
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android" ? platform : null;
}

function readStoredPushRegistration() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(PUSH_REGISTRATION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as StoredPushRegistration;
    if (!parsed?.token || !parsed?.deviceId || !parsed?.platform) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistPushRegistration(value: StoredPushRegistration) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PUSH_REGISTRATION_STORAGE_KEY, JSON.stringify(value));
}

function clearPushRegistration() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PUSH_REGISTRATION_STORAGE_KEY);
}

function hasRequestedPushPermission() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(PUSH_PERMISSION_REQUESTED_STORAGE_KEY) === "true";
}

function markPushPermissionRequested() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PUSH_PERMISSION_REQUESTED_STORAGE_KEY, "true");
}

async function postPushRegistration(method: "POST" | "DELETE", payload: Record<string, unknown>) {
  const response = await fetch("/api/push/devices", {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return;
  }

  const result = (await response.json().catch(() => null)) as { error?: string } | null;
  throw new Error(result?.error ?? "푸시 기기 정보를 저장하지 못했습니다.");
}

async function buildPushRegistration(token: string) {
  const platform = getNativePushPlatform();
  if (!platform) {
    return null;
  }

  await ensureSupabaseSessionReady();
  const user = await getCurrentSupabaseAuthUser();
  if (!user) {
    return null;
  }

  const [deviceId, deviceInfo] = await Promise.all([Device.getId(), Device.getInfo()]);
  const appInfo = await App.getInfo().catch(() => null);

  return {
    token,
    deviceId: deviceId.identifier,
    platform,
    appVersion: appInfo?.version ?? undefined,
    deviceModel: deviceInfo.model ?? undefined,
    locale: typeof navigator !== "undefined" ? navigator.language : undefined,
  };
}

async function syncPushRegistration(token: string) {
  const payload = await buildPushRegistration(token);
  if (!payload) {
    return;
  }

  await postPushRegistration("POST", payload);
  persistPushRegistration({
    token: payload.token,
    deviceId: payload.deviceId,
    platform: payload.platform,
  });
}

export async function initializeNativePushNotifications() {
  if (!getNativePushPlatform() || pushListenersInitialized) {
    return;
  }

  pushListenersInitialized = true;

  pushListenerHandles = await Promise.all([
    PushNotifications.addListener("registration", (token) => {
      void syncPushRegistration(token.value);
    }),
    PushNotifications.addListener("registrationError", () => {}),
    PushNotifications.addListener("pushNotificationReceived", () => {}),
    PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      const href =
        typeof event.notification.data?.href === "string" ? event.notification.data.href : null;
      if (href && typeof window !== "undefined") {
        window.location.assign(href);
      }
    }),
  ]);
}

export async function requestNativePushPermissionAndRegister(forcePrompt = false) {
  if (!getNativePushPlatform()) {
    return false;
  }

  await initializeNativePushNotifications();
  await ensureSupabaseSessionReady();

  const authUser = await getCurrentSupabaseAuthUser();
  if (!authUser) {
    return false;
  }

  const permissions = await PushNotifications.checkPermissions();
  let receive = permissions.receive;

  if (receive === "prompt") {
    if (!forcePrompt && hasRequestedPushPermission()) {
      return false;
    }

    markPushPermissionRequested();
    receive = (await PushNotifications.requestPermissions()).receive;
  }

  if (receive !== "granted") {
    return false;
  }

  const storedRegistration = readStoredPushRegistration();
  if (storedRegistration && storedRegistration.platform === getNativePushPlatform()) {
    void syncPushRegistration(storedRegistration.token);
  }

  await PushNotifications.register();
  return true;
}

export async function unregisterNativePushDevice(ignoreErrors = false) {
  const storedRegistration = readStoredPushRegistration();
  if (!storedRegistration) {
    return;
  }

  try {
    await postPushRegistration("DELETE", storedRegistration);
  } catch (error) {
    if (!ignoreErrors) {
      throw error;
    }
  } finally {
    clearPushRegistration();
  }
}

export function bindNativePushAuthSync() {
  const supabase = createClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      void requestNativePushPermissionAndRegister();
    }
  });

  return data.subscription;
}
