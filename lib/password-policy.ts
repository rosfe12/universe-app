import { isMasterAdminEmail } from "@/lib/admin/master-admin-shared";

const SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;
const BASE_MIN_LENGTH = 4;

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function isPasswordPolicyExemptEmail(email?: string | null) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  if (isMasterAdminEmail(normalizedEmail)) {
    return true;
  }

  return normalizedEmail.endsWith("@example.com");
}

export function getPasswordPolicyError(password: string, email?: string | null) {
  if (password.length < BASE_MIN_LENGTH) {
    return `비밀번호는 ${BASE_MIN_LENGTH}자 이상 입력해주세요.`;
  }

  if (isPasswordPolicyExemptEmail(email)) {
    return null;
  }

  if (password.length < 8) {
    return "비밀번호는 8자 이상 입력해주세요.";
  }

  if (!SPECIAL_CHARACTER_PATTERN.test(password)) {
    return "비밀번호에 특수기호를 1개 이상 포함해주세요.";
  }

  return null;
}

export const PASSWORD_POLICY_HELPER_TEXT = "8자 이상, 특수기호를 1개 이상 포함해주세요.";
export const PASSWORD_POLICY_EXEMPT_HELPER_TEXT = `테스트 계정과 관리자 계정은 ${BASE_MIN_LENGTH}자 이상이면 됩니다.`;
