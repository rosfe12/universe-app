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
  return Math.round(score);
}

export type UserLevel = {
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  icon: string;
  minScore: number;
  maxScore: number | null;
  description: string;
  badgeClassName: string;
};

const USER_LEVELS: UserLevel[] = [
  {
    level: 0,
    label: "활동 제한",
    icon: "🚫",
    minScore: Number.NEGATIVE_INFINITY,
    maxScore: -1,
    description: "신고 누적이나 제재 이력으로 글쓰기와 댓글 작성이 잠시 제한된 상태입니다.",
    badgeClassName: "border-rose-200 bg-rose-50 text-rose-700",
  },
  {
    level: 1,
    label: "우주 먼지",
    icon: "🌫️",
    minScore: 0,
    maxScore: 50,
    description: "막 캠퍼스 바깥 궤도에 진입한 상태입니다.",
    badgeClassName: "border-slate-200 bg-slate-50 text-slate-700",
  },
  {
    level: 2,
    label: "응애 새내기",
    icon: "🐣",
    minScore: 51,
    maxScore: 150,
    description: "이제 막 캠퍼스에 적응하며 활동을 넓혀 가는 중입니다.",
    badgeClassName: "border-lime-200 bg-lime-50 text-lime-700",
  },
  {
    level: 3,
    label: "생존한 학부생",
    icon: "📝",
    minScore: 151,
    maxScore: 400,
    description: "학교생활과 커뮤니티 흐름을 어느 정도 익힌 상태입니다.",
    badgeClassName: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    level: 4,
    label: "맑은 고인물",
    icon: "💧",
    minScore: 401,
    maxScore: 800,
    description: "커뮤니티 안에서 자주 보이는 익숙한 조력자입니다.",
    badgeClassName: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  {
    level: 5,
    label: "살아있는 화석",
    icon: "🦴",
    minScore: 801,
    maxScore: 1500,
    description: "오래 살아남아 정보 신뢰가 높은 편으로 인식되는 상태입니다.",
    badgeClassName: "border-violet-200 bg-violet-50 text-violet-700",
  },
  {
    level: 6,
    label: "정제된 석유",
    icon: "⛽",
    minScore: 1501,
    maxScore: null,
    description: "캠퍼스 세계관에서 가장 안정적인 신뢰 흐름을 가진 상태입니다.",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
  },
];

export function getAllUserLevels() {
  return USER_LEVELS.slice();
}

export function getUserLevel(score: number): UserLevel {
  const normalized = clampTrustScore(score);

  return (
    USER_LEVELS.find((level) => {
      if (level.maxScore === null) {
        return normalized >= level.minScore;
      }

      return normalized >= level.minScore && normalized <= level.maxScore;
    }) ?? USER_LEVELS[1]
  );
}

export function getTrustTier(score: number) {
  return getUserLevel(score);
}

export function getNextUserLevel(score: number) {
  const normalized = clampTrustScore(score);
  return USER_LEVELS.find((level) => level.minScore > normalized) ?? null;
}

export function getUserLevelProgress(score: number) {
  const currentLevel = getUserLevel(score);
  const nextLevel = getNextUserLevel(score);

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      remaining: 0,
      progressPercent: 100,
    };
  }

  const normalized = clampTrustScore(score);
  const startScore = currentLevel.level === 0 ? Math.min(normalized, 0) : currentLevel.minScore;
  const span = Math.max(1, nextLevel.minScore - startScore);
  const progressed = Math.max(0, normalized - startScore);

  return {
    currentLevel,
    nextLevel,
    remaining: Math.max(0, nextLevel.minScore - normalized),
    progressPercent: Math.min(100, Math.max(0, (progressed / span) * 100)),
  };
}

export function isReliabilityRestricted(score: number) {
  return getUserLevel(score).level === 0;
}

export function isLegendarySenior(score: number) {
  return getUserLevel(score).level >= 5;
}

export function getDefaultVisibilityLevel(user?: Pick<User, "userType" | "schoolId"> | null): VisibilityLevel {
  if (!user) return "school";

  if (user.userType === "student") {
    return user.schoolId ? "schoolDepartment" : "school";
  }

  if (user.userType === "freshman") {
    return "school";
  }

  return "school";
}

export function getStandardVisibilityLevel(
  value: VisibilityLevel | undefined,
  user?: Pick<User, "userType" | "schoolId"> | null,
): Extract<VisibilityLevel, "school" | "schoolDepartment"> {
  if (value === "schoolDepartment") {
    return "schoolDepartment";
  }

  if (value === "school") {
    return "school";
  }

  const fallback = getDefaultVisibilityLevel(user);
  return fallback === "schoolDepartment" ? "schoolDepartment" : "school";
}

export function isAdultVerified(user?: Pick<User, "adultVerified"> | null) {
  return Boolean(user?.adultVerified);
}

export function getProfileVisibilityLevel(
  value: VisibilityLevel | undefined,
  user?: Pick<User, "userType" | "schoolId"> | null,
): Extract<VisibilityLevel, "school" | "schoolDepartment" | "profile"> {
  if (value === "profile") {
    return "profile";
  }

  return getStandardVisibilityLevel(value, user);
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
  if (user.userType !== "student") return "none";
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
    user.userType === "student" &&
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
