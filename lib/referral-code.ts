const DEFAULT_INVITE_CODE = "CAMVERSE";
const REFERRAL_STORAGE_KEY = "camverse-pending-referral-code";

export function normalizeReferralCode(code?: string | null) {
  const normalized = code?.trim().toUpperCase();
  return normalized ? normalized.slice(0, 48) : undefined;
}

export function buildInviteCode(userId?: string) {
  if (!userId) {
    return DEFAULT_INVITE_CODE;
  }

  return `${DEFAULT_INVITE_CODE}-${userId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function rememberReferralCode(code?: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeReferralCode(code);
  if (!normalized) {
    window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
}

export function getRememberedReferralCode() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return normalizeReferralCode(window.localStorage.getItem(REFERRAL_STORAGE_KEY));
}

export function clearRememberedReferralCode() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
}
