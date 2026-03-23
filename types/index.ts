export type UserType = "student" | "applicant" | "freshman";

export type CommunitySubcategory =
  | "club"
  | "meetup"
  | "food"
  | "hot"
  | "anonymous"
  | "freshman"
  | "school"
  | "advice"
  | "free"
  | "ask";
export type PostCategory = "admission" | "community" | "dating";
export type ReportTargetType = "post" | "comment" | "user" | "review" | "profile";
export type ReportStatus =
  | "pending"
  | "reviewed"
  | "reviewing"
  | "confirmed"
  | "dismissed";
export type ReportReason =
  | "misinformation"
  | "abuse"
  | "spam"
  | "harassment"
  | "fraud"
  | "sexual_content"
  | "other";
export type NotificationType =
  | "comment"
  | "reply"
  | "trendingPost"
  | "lectureReaction"
  | "tradeMatch"
  | "admissionAnswer"
  | "schoolRecommendation"
  | "freshmanTrending"
  | "admissionUnanswered"
  | "verificationApproved"
  | "reportUpdate"
  | "announcement";
export type NotificationCategory = "activity" | "notice";
export type NotificationSourceKind = "activity" | "recommendation" | "system";
export type NotificationDeliveryMode = "instant" | "daily";
export type NotificationTargetType =
  | "post"
  | "comment"
  | "lecture"
  | "trade"
  | "verification"
  | "report"
  | "system";
export type TradeStatus = "open" | "matching" | "closed";
export type DifficultyLevel = "easy" | "medium" | "hard";
export type WorkloadLevel = "light" | "medium" | "heavy";
export type AttendanceLevel = "flexible" | "medium" | "strict";
export type ExamStyle = "multipleChoice" | "essay" | "project" | "mixed";
export type GradingStyle = "tough" | "medium" | "generous";
export type MatchStrength = "high" | "medium" | "low";
export type VisibilityLevel = "anonymous" | "school" | "schoolDepartment" | "profile";
export type StudentVerificationStatus =
  | "none"
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";
export type VerificationRequestStatus = "pending" | "verified" | "expired" | "cancelled";

export interface School {
  id: string;
  name: string;
  domain: string;
  city: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  userType: UserType;
  schoolId?: string;
  department?: string;
  grade?: number;
  verified: boolean;
  adultVerified?: boolean;
  adultVerifiedAt?: string;
  studentVerificationStatus?: StudentVerificationStatus;
  schoolEmail?: string;
  schoolEmailVerifiedAt?: string;
  trustScore: number;
  reportCount?: number;
  warningCount?: number;
  isRestricted?: boolean;
  defaultVisibilityLevel?: VisibilityLevel;
  createdAt: string;
  bio?: string;
  avatarUrl?: string;
}

export interface AdmissionQuestionMeta {
  region: string;
  track: "문과" | "이과" | "예체능" | "기타";
  scoreType: string;
  interestUniversity: string;
  interestDepartment: string;
}

export interface Post {
  id: string;
  category: PostCategory;
  subcategory?: CommunitySubcategory | "dating" | "meeting";
  schoolId?: string;
  authorId: string;
  visibilityLevel?: VisibilityLevel;
  reportCount?: number;
  adminHidden?: boolean;
  autoHidden?: boolean;
  title: string;
  content: string;
  createdAt: string;
  likes: number;
  commentCount: number;
  viewCount?: number;
  tags?: string[];
  imageUrl?: string;
  meta?: AdmissionQuestionMeta;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  visibilityLevel?: VisibilityLevel;
  reportCount?: number;
  adminHidden?: boolean;
  autoHidden?: boolean;
  content: string;
  accepted: boolean;
  createdAt: string;
}

export interface Lecture {
  id: string;
  schoolId: string;
  semester: string;
  courseName: string;
  professor: string;
  section: string;
  dayTime: string;
  credits: number;
  department: string;
}

export interface LectureReview {
  id: string;
  lectureId: string;
  reviewerId: string;
  visibilityLevel?: VisibilityLevel;
  reportCount?: number;
  adminHidden?: boolean;
  autoHidden?: boolean;
  difficulty: DifficultyLevel;
  workload: WorkloadLevel;
  attendance: AttendanceLevel;
  examStyle: ExamStyle;
  teamProject: boolean;
  presentation: boolean;
  gradingStyle: GradingStyle;
  honeyScore: number;
  helpfulCount: number;
  shortComment: string;
  longComment: string;
  semester: string;
  createdAt: string;
}

export interface TradePost {
  id: string;
  schoolId: string;
  semester: string;
  userId: string;
  visibilityLevel?: VisibilityLevel;
  reportCount?: number;
  autoHidden?: boolean;
  haveLectureId: string;
  wantLectureId: string;
  professor?: string;
  section?: string;
  timeRange: string;
  note: string;
  status: TradeStatus;
  createdAt: string;
}

export interface TradeMessage {
  id: string;
  tradePostId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  sourceKind: NotificationSourceKind;
  deliveryMode: NotificationDeliveryMode;
  title: string;
  body: string;
  isRead: boolean;
  readAt?: string;
  href?: string;
  targetType?: NotificationTargetType;
  targetId?: string;
  metadata?: Record<string, unknown>;
  recommended?: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  memo?: string;
  status: ReportStatus;
  createdAt: string;
}

export interface Block {
  id: string;
  blockerId: string;
  blockedUserId: string;
  createdAt: string;
}

export interface DatingProfile {
  id: string;
  userId: string;
  intro: string;
  vibeTag: string;
  photoUrl?: string;
  isVisible: boolean;
  visibilityLevel?: VisibilityLevel;
  reportCount?: number;
  adminHidden?: boolean;
  autoHidden?: boolean;
  schoolId: string;
  department?: string;
  grade: number;
}

export interface MediaAsset {
  id: string;
  ownerType: "post" | "profile";
  ownerId: string;
  mediaType: "image" | "video";
  fileUrl: string;
  createdAt: string;
}

export interface StudentVerificationRequest {
  id: string;
  userId: string;
  schoolId: string;
  schoolEmail: string;
  verificationUserId?: string;
  status: VerificationRequestStatus;
  deliveryMethod: "pending" | "app_smtp" | "supabase_auth";
  deliveryStatus: "pending" | "sent" | "failed" | "rate_limited";
  deliveryError?: string;
  deliveredAt?: string;
  nextPath: string;
  requestedAt: string;
  verifiedAt?: string;
  expiresAt: string;
  schoolName: string;
  userNickname: string;
  userDepartment?: string;
  userGrade?: number;
  trustScore: number;
  reportCount: number;
  warningCount: number;
  studentVerificationStatus: StudentVerificationStatus;
}

export interface AdminAuditLog {
  id: string;
  adminUserId: string;
  action: string;
  targetType:
    | "verification_request"
    | "report"
    | "user"
    | "post"
    | "comment"
    | "review"
    | "profile";
  targetId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface LectureSummary extends Lecture {
  reviewCount: number;
  averageHoneyScore: number;
  attendanceLabel: string;
  workloadLabel: string;
  isLightWorkload: boolean;
  isFlexibleAttendance: boolean;
  hasNoTeamProject: boolean;
  isGenerousGrading: boolean;
}

export interface TradeMatchInsight {
  postId: string;
  strength: MatchStrength;
  count: number;
}

export interface AppCollections {
  schools: School[];
  users: User[];
  posts: Post[];
  comments: Comment[];
  lectures: Lecture[];
  lectureReviews: LectureReview[];
  tradePosts: TradePost[];
  notifications: Notification[];
  reports: Report[];
  blocks: Block[];
  datingProfiles: DatingProfile[];
  mediaAssets: MediaAsset[];
}

export interface AppRuntimeSnapshot extends AppCollections {
  currentUser: User;
  source: "mock" | "supabase";
  isAuthenticated: boolean;
  setupStatus?: "ready" | "demo" | "supabase-error";
  setupIssue?: string;
}
