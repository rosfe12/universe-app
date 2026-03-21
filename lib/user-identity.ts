import type {
  School,
  StudentVerificationStatus,
  User,
  VisibilityLevel,
} from "@/types";
import { isMasterAdminEmail } from "@/lib/admin/master-admin-shared";

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

  if (user.userType === "freshman") {
    return user.schoolId ? "school" : "anonymous";
  }

  return user.schoolId ? "school" : "anonymous";
}

export function getStudentVerificationStatus(
  user?:
    | Pick<User, "userType" | "studentVerificationStatus" | "verified">
    | ({ email?: User["email"] } & Pick<
        User,
        "userType" | "studentVerificationStatus" | "verified"
      >)
    | null,
): StudentVerificationStatus {
  if (!user) return "none";
  const email = "email" in user ? user.email : undefined;
  if (isMasterAdminEmail(email)) return "verified";
  if (user.userType !== "college") return "none";
  if (user.studentVerificationStatus) return user.studentVerificationStatus;
  return user.verified ? "verified" : "unverified";
}

export function isVerifiedStudent(
  user?:
    | Pick<User, "id" | "userType" | "schoolId" | "studentVerificationStatus" | "verified">
    | ({ email?: User["email"] } & Pick<
        User,
        "id" | "userType" | "schoolId" | "studentVerificationStatus" | "verified"
      >)
    | null,
) {
  if (!user || user.id === "guest-user") return false;
  const email = "email" in user ? user.email : undefined;
  if (isMasterAdminEmail(email)) return true;
  return (
    user.userType === "college" &&
    Boolean(user.schoolId) &&
    getStudentVerificationStatus(user) === "verified"
  );
}

export function getStudentVerificationBadge(
  user?:
    | Pick<User, "userType" | "studentVerificationStatus" | "verified">
    | ({ email?: User["email"] } & Pick<
        User,
        "userType" | "studentVerificationStatus" | "verified"
      >)
    | null,
) {
  const status = getStudentVerificationStatus(user);

  if (status === "verified") {
    return {
      status,
      label: "학교 메일 인증 완료",
      shortLabel: "완료",
      tone: "positive" as const,
    };
  }

  if (status === "pending") {
    return {
      status,
      label: "학교 메일 인증 대기",
      shortLabel: "대기",
      tone: "warning" as const,
    };
  }

  if (status === "rejected") {
    return {
      status,
      label: "학교 메일 인증 반려",
      shortLabel: "반려",
      tone: "warning" as const,
    };
  }

  if (status === "unverified") {
    return {
      status,
      label: "학교 메일 미인증",
      shortLabel: "미인증",
      tone: "warning" as const,
    };
  }

  return {
    status,
    label: "학생 인증 해당 없음",
    shortLabel: "해당 없음",
    tone: "neutral" as const,
  };
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
