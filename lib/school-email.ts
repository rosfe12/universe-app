export function normalizeSchoolEmail(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

export function isAcademicSchoolEmail(email: string) {
  return /@([^.@]+\.)*ac\.kr$/i.test(email);
}

export function canUseSchoolVerificationEmail(email: string) {
  return isAcademicSchoolEmail(email);
}
