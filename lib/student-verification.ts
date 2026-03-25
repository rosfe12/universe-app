import type {
  SchoolDepartment,
  SchoolEmailRule,
  SchoolStudentRule,
  UserType,
  VerificationAutoCheck,
  VerificationState,
} from "@/types";

type DeriveVerificationStateInput = {
  userType?: UserType | null;
  verificationState?: string | null;
  studentVerificationStatus?: string | null;
  verified?: boolean;
  schoolEmailVerifiedAt?: string | null;
};

type VerificationEvaluationInput = {
  schoolEmail: string;
  studentNumber?: string | null;
  department?: string | null;
  admissionYear?: number | null;
  emailRules: SchoolEmailRule[];
  studentRule?: SchoolStudentRule | null;
  departments: SchoolDepartment[];
};

export type VerificationEvaluationResult = {
  score: number;
  state: VerificationState;
  requiresDocumentUpload: boolean;
  checks: VerificationAutoCheck[];
  decisionReason: string;
};

const VALID_VERIFICATION_STATES = new Set<VerificationState>([
  "guest",
  "email_verified",
  "student_verified",
  "manual_review",
  "rejected",
]);

export function toVerificationState(value?: string | null): VerificationState | undefined {
  if (!value) return undefined;
  return VALID_VERIFICATION_STATES.has(value as VerificationState)
    ? (value as VerificationState)
    : undefined;
}

export function deriveVerificationState(
  input: DeriveVerificationStateInput,
): VerificationState {
  if (input.userType && input.userType !== "student") {
    return "guest";
  }

  const direct = toVerificationState(input.verificationState);
  if (direct) {
    return direct;
  }

  if (input.studentVerificationStatus === "verified" || input.verified) {
    return "student_verified";
  }

  if (input.studentVerificationStatus === "rejected") {
    return "rejected";
  }

  if (input.schoolEmailVerifiedAt) {
    return "email_verified";
  }

  return "guest";
}

export function isStudentVerificationComplete(state?: VerificationState | null) {
  return state === "student_verified";
}

export function normalizeStudentNumber(value?: string | null) {
  return (value ?? "").replace(/[^0-9A-Za-z]/g, "").trim();
}

export function normalizeDepartmentName(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()\-_/]/g, "");
}

function buildCheck(
  code: string,
  label: string,
  passed: boolean,
  weight: number,
  detail?: string,
): VerificationAutoCheck {
  return {
    code,
    label,
    passed,
    weight,
    detail,
  };
}

function getActiveEmailRules(rules: SchoolEmailRule[]) {
  return [...rules]
    .filter((rule) => rule.isActive)
    .sort((a, b) => a.priority - b.priority);
}

function matchesEmailDomain(email: string, rules: SchoolEmailRule[]) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return rules.some((rule) => rule.domain.toLowerCase() === domain);
}

function matchesEmailRegex(email: string, rules: SchoolEmailRule[]) {
  return rules.some((rule) => {
    if (!rule.emailRegex) return false;
    try {
      return new RegExp(rule.emailRegex, "i").test(email);
    } catch {
      return false;
    }
  });
}

function matchesStudentId(
  studentNumber: string,
  rule?: SchoolStudentRule | null,
) {
  if (!studentNumber) return false;

  if (rule?.studentIdRegex) {
    try {
      return new RegExp(rule.studentIdRegex).test(studentNumber);
    } catch {
      return false;
    }
  }

  if (rule?.expectedStudentNumberLength) {
    return studentNumber.length === rule.expectedStudentNumberLength;
  }

  return /^[0-9]{8,10}$/.test(studentNumber);
}

function matchesAdmissionYear(
  admissionYear: number | null | undefined,
  studentNumber: string,
  rule?: SchoolStudentRule | null,
) {
  if (!admissionYear) return false;

  if (rule?.admissionYearMin && admissionYear < rule.admissionYearMin) {
    return false;
  }

  if (rule?.admissionYearMax && admissionYear > rule.admissionYearMax) {
    return false;
  }

  if (rule?.admissionYearRegex) {
    try {
      if (!new RegExp(rule.admissionYearRegex).test(String(admissionYear))) {
        return false;
      }
    } catch {
      return false;
    }
  }

  const yearSuffix = String(admissionYear).slice(-2);
  if (studentNumber && /^[0-9]{2}/.test(studentNumber)) {
    return studentNumber.slice(0, 2) === yearSuffix;
  }

  return true;
}

function matchesDepartment(
  department: string | null | undefined,
  departments: SchoolDepartment[],
) {
  const normalizedDepartment = normalizeDepartmentName(department);
  if (!normalizedDepartment) return false;

  return departments.some((item) => {
    if (!item.isActive) return false;
    if (normalizeDepartmentName(item.name) === normalizedDepartment) {
      return true;
    }

    return (item.aliases ?? []).some(
      (alias) => normalizeDepartmentName(alias) === normalizedDepartment,
    );
  });
}

export function evaluateStudentVerification(
  input: VerificationEvaluationInput,
): VerificationEvaluationResult {
  const email = input.schoolEmail.trim().toLowerCase();
  const studentNumber = normalizeStudentNumber(input.studentNumber);
  const activeEmailRules = getActiveEmailRules(input.emailRules);
  const studentRule = input.studentRule ?? null;

  const emailDomainWeight = studentRule?.scoreEmailDomain ?? 35;
  const emailRegexWeight = studentRule?.scoreEmailRegex ?? 20;
  const studentIdWeight = studentRule?.scoreStudentId ?? 20;
  const admissionYearWeight = studentRule?.scoreAdmissionYear ?? 15;
  const departmentWeight = studentRule?.scoreDepartment ?? 10;

  const emailDomainPassed = matchesEmailDomain(email, activeEmailRules);
  const emailRegexPassed = matchesEmailRegex(email, activeEmailRules);
  const studentIdPassed = matchesStudentId(studentNumber, studentRule);
  const admissionYearPassed = matchesAdmissionYear(
    input.admissionYear,
    studentNumber,
    studentRule,
  );
  const departmentPassed = matchesDepartment(input.department, input.departments);

  const checks = [
    buildCheck(
      "email_domain",
      "학교 허용 메일 도메인",
      emailDomainPassed,
      emailDomainWeight,
      emailDomainPassed ? "학교 메일 도메인이 일치합니다." : "학교 메일 도메인이 일치하지 않습니다.",
    ),
    buildCheck(
      "email_regex",
      "학교 메일 형식",
      emailRegexPassed,
      emailRegexWeight,
      emailRegexPassed ? "학교 메일 패턴과 일치합니다." : "학교별 메일 패턴과 일치하지 않습니다.",
    ),
    buildCheck(
      "student_number",
      "학번 형식",
      studentIdPassed,
      studentIdWeight,
      studentIdPassed ? "학번 형식이 학교 규칙과 맞습니다." : "학번 형식을 다시 확인해주세요.",
    ),
    buildCheck(
      "admission_year",
      "입학년도 규칙",
      admissionYearPassed,
      admissionYearWeight,
      admissionYearPassed
        ? "입학년도와 학번 규칙이 자연스럽게 맞습니다."
        : "입학년도와 학번 규칙이 맞지 않습니다.",
    ),
    buildCheck(
      "department",
      "학과 유효성",
      departmentPassed,
      departmentWeight,
      departmentPassed ? "학교 학과 목록에서 확인되었습니다." : "학과 정보를 다시 확인해주세요.",
    ),
  ];

  const score = checks.reduce(
    (total, check) => total + (check.passed ? check.weight : 0),
    0,
  );

  if (score >= 80) {
    return {
      score,
      state: "student_verified",
      requiresDocumentUpload: false,
      checks,
      decisionReason: "학교 메일과 학생 정보가 학교 기준과 충분히 일치해 자동 승인되었습니다.",
    };
  }

  if (score >= 50) {
    return {
      score,
      state: "manual_review",
      requiresDocumentUpload: true,
      checks,
      decisionReason: "학교 메일은 확인되었지만 학생 정보 검수를 위해 추가 인증이 필요합니다.",
    };
  }

  return {
    score,
    state: "rejected",
    requiresDocumentUpload: false,
    checks,
    decisionReason: "입력한 학생 정보가 학교 기준과 충분히 일치하지 않아 자동 반려되었습니다.",
  };
}

export function getVerificationStateLabel(state?: VerificationState | null) {
  switch (state) {
    case "student_verified":
      return "대학생 인증 완료";
    case "email_verified":
      return "학교 메일 확인";
    case "manual_review":
      return "추가 인증 검토 중";
    case "rejected":
      return "학생 인증 반려";
    default:
      return "학생 인증 필요";
  }
}

export function getVerificationRestrictionMessage(state?: VerificationState | null) {
  switch (state) {
    case "email_verified":
      return "학교 메일 확인까지 완료되었습니다. 학생 정보 확인 뒤 글쓰기와 댓글이 열립니다.";
    case "manual_review":
      return "학생 인증을 검토 중입니다. 검토가 끝날 때까지 읽기 중심으로 이용할 수 있습니다.";
    case "rejected":
      return "학생 인증이 반려되었습니다. 학번, 학과, 입학년도나 추가 인증 자료를 다시 제출해주세요.";
    case "student_verified":
      return "대학생 인증이 완료되어 모든 커뮤니티 기능을 사용할 수 있습니다.";
    default:
      return "학생 인증을 완료하면 글쓰기, 댓글, 쪽지, 채팅, 익명 게시판 이용이 열립니다.";
  }
}
