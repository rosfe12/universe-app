import type { Session as SupabaseAuthSession } from "@supabase/supabase-js";

import { getKeepLoggedInPreference } from "@/lib/app-preferences";
import {
  createClient,
  persistSupabaseSession,
  waitForSupabaseAuthCookie,
} from "@/lib/supabase/client";

const QUICK_LOGIN_STORAGE_KEY = "session";
const QUICK_LOGIN_KEY_PREFIX = "camverse_quick_login_";
const QUICK_LOGIN_PROMPT_DISMISSED_STORAGE_KEY = "camverse_quick_login_prompt_dismissed";

type NativeQuickLoginPayload = {
  version: 1;
  email?: string;
  accessToken: string;
  refreshToken: string;
  updatedAt: string;
};

export type NativeQuickLoginStatus = {
  supported: boolean;
  available: boolean;
  enabled: boolean;
  ready: boolean;
  methodLabel: string;
  email?: string;
};

type NativeQuickLoginDependencies = {
  BiometricAuth: typeof import("@aparajita/capacitor-biometric-auth").BiometricAuth;
  BiometryType: typeof import("@aparajita/capacitor-biometric-auth").BiometryType;
  AndroidBiometryStrength: typeof import("@aparajita/capacitor-biometric-auth").AndroidBiometryStrength;
  SecureStorage: typeof import("@aparajita/capacitor-secure-storage").SecureStorage;
  KeychainAccess: typeof import("@aparajita/capacitor-secure-storage").KeychainAccess;
};

type CheckBiometryResult =
  Awaited<ReturnType<typeof import("@aparajita/capacitor-biometric-auth").BiometricAuth.checkBiometry>>;

let dependenciesPromise: Promise<NativeQuickLoginDependencies | null> | null = null;

async function loadNativeQuickLoginDependencies() {
  if (typeof window === "undefined") {
    return null;
  }

  if (dependenciesPromise) {
    return dependenciesPromise;
  }

  dependenciesPromise = (async () => {
    const [{ Capacitor }, biometricModule, secureStorageModule] = await Promise.all([
      import("@capacitor/core"),
      import("@aparajita/capacitor-biometric-auth"),
      import("@aparajita/capacitor-secure-storage"),
    ]);

    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    await secureStorageModule.SecureStorage.setKeyPrefix(QUICK_LOGIN_KEY_PREFIX);

    return {
      BiometricAuth: biometricModule.BiometricAuth,
      BiometryType: biometricModule.BiometryType,
      AndroidBiometryStrength: biometricModule.AndroidBiometryStrength,
      SecureStorage: secureStorageModule.SecureStorage,
      KeychainAccess: secureStorageModule.KeychainAccess,
    };
  })().catch(() => null);

  return dependenciesPromise;
}

function getQuickLoginMethodLabel(info?: CheckBiometryResult | null) {
  if (!info) {
    return "간편 로그인";
  }

  switch (info.biometryType) {
    case 2:
      return "Face ID";
    case 1:
      return "Touch ID";
    case 3:
      return "지문 인증";
    case 4:
      return "얼굴 인증";
    case 5:
      return "홍채 인증";
    default:
      return info.deviceIsSecure ? "기기 인증" : "간편 로그인";
  }
}

async function readNativeQuickLoginPayload() {
  const dependencies = await loadNativeQuickLoginDependencies();
  if (!dependencies) {
    return null;
  }

  try {
    const value = await dependencies.SecureStorage.get(QUICK_LOGIN_STORAGE_KEY);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const payload = value as Partial<NativeQuickLoginPayload>;
    if (!payload.accessToken || !payload.refreshToken) {
      return null;
    }

    return {
      version: 1,
      email: typeof payload.email === "string" ? payload.email : undefined,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      updatedAt:
        typeof payload.updatedAt === "string" ? payload.updatedAt : new Date().toISOString(),
    } satisfies NativeQuickLoginPayload;
  } catch {
    return null;
  }
}

async function writeNativeQuickLoginPayload(payload: NativeQuickLoginPayload) {
  const dependencies = await loadNativeQuickLoginDependencies();
  if (!dependencies) {
    return false;
  }

  try {
    await dependencies.SecureStorage.set(
      QUICK_LOGIN_STORAGE_KEY,
      payload,
      true,
      false,
      dependencies.KeychainAccess.whenPasscodeSetThisDeviceOnly,
    );
    return true;
  } catch {
    try {
      await dependencies.SecureStorage.set(
        QUICK_LOGIN_STORAGE_KEY,
        payload,
        true,
        false,
        dependencies.KeychainAccess.whenUnlockedThisDeviceOnly,
      );
      return true;
    } catch {
      return false;
    }
  }
}

function clearQuickLoginPromptDismissed() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(QUICK_LOGIN_PROMPT_DISMISSED_STORAGE_KEY);
}

function dismissQuickLoginPrompt() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(QUICK_LOGIN_PROMPT_DISMISSED_STORAGE_KEY, "true");
}

function isQuickLoginPromptDismissed() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(QUICK_LOGIN_PROMPT_DISMISSED_STORAGE_KEY) === "true";
}

function buildNativeQuickLoginPayload(session: SupabaseAuthSession, email?: string) {
  return {
    version: 1 as const,
    email: email ?? session.user.email ?? undefined,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    updatedAt: new Date().toISOString(),
  };
}

export async function getNativeQuickLoginStatus(): Promise<NativeQuickLoginStatus> {
  const dependencies = await loadNativeQuickLoginDependencies();
  if (!dependencies) {
    return {
      supported: false,
      available: false,
      enabled: false,
      ready: false,
      methodLabel: "간편 로그인",
    };
  }

  const [info, payload] = await Promise.all([
    dependencies.BiometricAuth.checkBiometry().catch(() => null),
    readNativeQuickLoginPayload(),
  ]);

  const available = Boolean(info && (info.isAvailable || info.deviceIsSecure));
  const enabled = Boolean(payload);

  return {
    supported: true,
    available,
    enabled,
    ready: available && enabled,
    methodLabel: getQuickLoginMethodLabel(info),
    email: payload?.email,
  };
}

export async function setNativeQuickLoginEnabled(enabled: boolean) {
  if (!enabled) {
    await clearNativeQuickLogin();
    return getNativeQuickLoginStatus();
  }

  const dependencies = await loadNativeQuickLoginDependencies();
  if (!dependencies) {
    throw new Error("이 기기에서는 간편 로그인을 사용할 수 없습니다.");
  }

  const info = await dependencies.BiometricAuth.checkBiometry().catch(() => null);
  if (!info || (!info.isAvailable && !info.deviceIsSecure)) {
    throw new Error("생체인증 또는 기기 화면 잠금을 먼저 설정해주세요.");
  }

  const {
    data: { session },
  } = await createClient().auth.getSession();

  if (!session?.access_token || !session.refresh_token) {
    throw new Error("로그인 후 설정할 수 있습니다.");
  }

  const saved = await writeNativeQuickLoginPayload(buildNativeQuickLoginPayload(session));
  if (!saved) {
    throw new Error("간편 로그인 정보를 저장하지 못했습니다.");
  }

  clearQuickLoginPromptDismissed();
  return getNativeQuickLoginStatus();
}

export async function maybePromptEnableNativeQuickLogin(
  session: SupabaseAuthSession | null,
  email?: string,
) {
  if (!session || typeof window === "undefined") {
    return;
  }

  const status = await getNativeQuickLoginStatus();
  if (!status.supported || !status.available) {
    return;
  }

  if (status.enabled) {
    await writeNativeQuickLoginPayload(buildNativeQuickLoginPayload(session, email));
    return;
  }

  if (isQuickLoginPromptDismissed()) {
    return;
  }

  const accepted = window.confirm(
    `${status.methodLabel}으로 다음부터 빠르게 로그인할까요?`,
  );

  if (!accepted) {
    dismissQuickLoginPrompt();
    return;
  }

  const saved = await writeNativeQuickLoginPayload(buildNativeQuickLoginPayload(session, email));
  if (saved) {
    clearQuickLoginPromptDismissed();
  }
}

export async function signInWithNativeQuickLogin() {
  const dependencies = await loadNativeQuickLoginDependencies();
  if (!dependencies) {
    return {
      error: new Error("이 기기에서는 간편 로그인을 사용할 수 없습니다."),
    };
  }

  const [info, payload] = await Promise.all([
    dependencies.BiometricAuth.checkBiometry().catch(() => null),
    readNativeQuickLoginPayload(),
  ]);

  if (!info || (!info.isAvailable && !info.deviceIsSecure)) {
    return {
      error: new Error("생체인증 또는 기기 인증을 사용할 수 없습니다."),
    };
  }

  if (!payload) {
    return {
      error: new Error("저장된 간편 로그인 정보가 없습니다."),
    };
  }

  try {
    await dependencies.BiometricAuth.authenticate({
      reason: "CAMVERSE에 로그인하려면 인증해주세요.",
      cancelTitle: "취소",
      allowDeviceCredential: true,
      iosFallbackTitle: "기기 암호 사용",
      androidTitle: "간편 로그인",
      androidSubtitle: "생체인증 또는 기기 인증으로 로그인합니다",
      androidConfirmationRequired: false,
      androidBiometryStrength: dependencies.AndroidBiometryStrength.weak,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error : new Error("간편 로그인을 완료하지 못했습니다."),
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: payload.accessToken,
    refresh_token: payload.refreshToken,
  });

  if (error || !data.session) {
    await clearNativeQuickLogin();
    return {
      error: new Error("간편 로그인 정보가 만료되었습니다. 다시 로그인해주세요."),
    };
  }

  persistSupabaseSession(data.session, getKeepLoggedInPreference());
  await waitForSupabaseAuthCookie(true);
  await writeNativeQuickLoginPayload(
    buildNativeQuickLoginPayload(data.session, payload.email),
  );

  return {
    error: null,
    data: {
      session: data.session,
      email: payload.email,
    },
  };
}

export function syncNativeQuickLoginSession(
  session: SupabaseAuthSession | null,
  email?: string,
) {
  if (!session?.access_token || !session.refresh_token) {
    return;
  }

  void (async () => {
    const existingPayload = await readNativeQuickLoginPayload();
    if (!existingPayload) {
      return;
    }

    await writeNativeQuickLoginPayload(
      buildNativeQuickLoginPayload(
        session,
        email ?? existingPayload.email ?? session.user.email ?? undefined,
      ),
    );
  })();
}

export async function clearNativeQuickLogin() {
  const dependencies = await loadNativeQuickLoginDependencies();
  if (!dependencies) {
    return;
  }

  await dependencies.SecureStorage.remove(QUICK_LOGIN_STORAGE_KEY).catch(() => {});
}
