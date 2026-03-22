const TEST_VERIFICATION_EMAILS = new Set(["rosfe12@gmail.com"]);

export function normalizeSchoolEmail(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

export function isAcademicSchoolEmail(email: string) {
  return /@([^.@]+\.)*ac\.kr$/i.test(email);
}

export function isTestVerificationEmail(email: string) {
  return TEST_VERIFICATION_EMAILS.has(normalizeSchoolEmail(email));
}

export function canUseSchoolVerificationEmail(email: string) {
  return isAcademicSchoolEmail(email) || isTestVerificationEmail(email);
}
