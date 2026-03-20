import type { School, User, VisibilityLevel } from "@/types";

const SCHOOL_CODE_OVERRIDES: Record<string, string> = {
  건국대학교: "KU",
  세종대학교: "SJU",
  홍익대학교: "HK",
};

function hashSeed(seed: string) {
  return [...seed].reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
}

export function getSchoolShortName(name?: string) {
  if (!name) return "익명";
  return name.replace("대학교", "대");
}

export function getSchoolCode(school?: Pick<School, "name" | "domain"> | null) {
  if (!school) return "ANON";

  if (SCHOOL_CODE_OVERRIDES[school.name]) {
    return SCHOOL_CODE_OVERRIDES[school.name];
  }

  const domainPrefix = school.domain.split(".")[0]?.replace(/[^a-zA-Z]/g, "") ?? "";
  return domainPrefix.slice(0, 3).toUpperCase() || "ANON";
}

export function generateAutoNickname({
  id,
  email,
  school,
}: {
  id?: string;
  email?: string;
  school?: Pick<School, "name" | "domain"> | null;
}) {
  const seed = `${id ?? ""}:${email ?? ""}:${school?.domain ?? ""}`;
  const suffix = String((hashSeed(seed) % 90) + 10).padStart(2, "0");

  return `${getSchoolCode(school)}_익명_${suffix}`;
}

export function clampTrustScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getTrustTier(score: number) {
  const normalized = clampTrustScore(score);

  if (normalized >= 80) {
    return { label: "골드", variant: "success" as const };
  }
  if (normalized >= 60) {
    return { label: "실버", variant: "secondary" as const };
  }
  return { label: "브론즈", variant: "warning" as const };
}

export function getDefaultVisibilityLevel(user?: Pick<User, "userType" | "schoolId"> | null): VisibilityLevel {
  if (!user) return "anonymous";

  if (user.userType === "college") {
    return user.schoolId ? "schoolDepartment" : "anonymous";
  }

  if (user.userType === "parent") {
    return "anonymous";
  }

  return user.schoolId ? "school" : "anonymous";
}

export function getPublicIdentityLabel({
  schoolName,
  department,
  grade,
  visibilityLevel,
}: {
  schoolName?: string;
  department?: string;
  grade?: number | null;
  visibilityLevel: VisibilityLevel;
}) {
  if (visibilityLevel === "anonymous") {
    return "익명";
  }

  if (visibilityLevel === "school") {
    return schoolName
      ? `${getSchoolShortName(schoolName)} · 학교 공개`
      : "익명 (학교만 공개)";
  }

  if (visibilityLevel === "profile") {
    return [
      schoolName ? getSchoolShortName(schoolName) : "익명",
      department,
      grade ? `${grade}학년` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    schoolName ? getSchoolShortName(schoolName) : "익명",
    department,
    grade ? `${grade}학년` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
