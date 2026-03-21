import type {
  AttendanceLevel,
  DifficultyLevel,
  ExamStyle,
  GradingStyle,
  MatchStrength,
  ReportReason,
  ReportStatus,
  TradeStatus,
  UserType,
  VisibilityLevel,
  WorkloadLevel,
} from "@/types";

export const USER_TYPE_LABELS: Record<UserType, string> = {
  college: "대학생",
  highSchool: "입시생",
  freshman: "예비입학생",
};

export const TRADE_STATUS_LABELS: Record<TradeStatus, string> = {
  open: "교환 가능",
  matching: "매칭 중",
  closed: "완료",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "접수됨",
  reviewed: "검토 완료",
  reviewing: "검토 중",
  confirmed: "유지",
  dismissed: "해제",
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  misinformation: "허위 정보",
  abuse: "욕설/비방",
  spam: "스팸/광고",
  harassment: "성희롱/부적절한 접근",
  fraud: "사기/거래 유도",
  other: "기타",
};

export const MATCH_STRENGTH_LABELS: Record<MatchStrength, string> = {
  high: "매칭 가능",
  medium: "유사한 글 있음",
  low: "탐색 중",
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
};

export const WORKLOAD_LABELS: Record<WorkloadLevel, string> = {
  light: "적음",
  medium: "보통",
  heavy: "많음",
};

export const ATTENDANCE_LABELS: Record<AttendanceLevel, string> = {
  flexible: "널널",
  medium: "보통",
  strict: "빡셈",
};

export const EXAM_STYLE_LABELS: Record<ExamStyle, string> = {
  multipleChoice: "객관식",
  essay: "서술형",
  project: "과제 대체",
  mixed: "혼합",
};

export const GRADING_STYLE_LABELS: Record<GradingStyle, string> = {
  tough: "짜다",
  medium: "보통",
  generous: "후하다",
};

export const COMMUNITY_CATEGORY_LABELS = {
  club: "동아리",
  meetup: "모임 / 번개",
  food: "맛집",
  advice: "고민상담",
  hot: "핫갤",
  freshman: "새내기존",
  dating: "연애",
  meeting: "미팅",
} as const;

export const CAREER_BOARD_LABELS = {
  careerInfo: "취업정보",
  jobPosting: "채용공고",
} as const;

export const VISIBILITY_LEVEL_LABELS: Record<VisibilityLevel, string> = {
  anonymous: "완전 익명",
  school: "학교만 공개",
  schoolDepartment: "학교 + 학과 공개",
  profile: "프로필 공개",
};

export const VISIBILITY_LEVEL_DESCRIPTIONS: Record<VisibilityLevel, string> = {
  anonymous: "학교와 학과를 숨기고 신뢰도만 노출",
  school: "학교만 공개하고 학과와 학년은 숨김",
  schoolDepartment: "학교, 학과, 학년까지 공개",
  profile: "미팅 전용 프로필 카드 정보 공개",
};

export const MAIN_TABS = [
  { href: "/home", label: "홈" },
  { href: "/community", label: "커뮤니티" },
  { href: "/school", label: "우리학교" },
  { href: "/admission", label: "입시" },
  { href: "/profile", label: "마이" },
] as const;
