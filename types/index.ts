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
  | "poll"
  | "verification"
  | "report"
  | "system";
export type TradeStatus = "open" | "matching" | "closed";
export type PostType = "normal" | "poll" | "question" | "balance";
export type DifficultyLevel = "easy" | "medium" | "hard";
export type WorkloadLevel = "light" | "medium" | "heavy";
export type AttendanceLevel = "flexible" | "medium" | "strict";
export type ExamStyle = "multipleChoice" | "essay" | "project" | "mixed";
export type GradingStyle = "tough" | "medium" | "generous";
export type MatchStrength = "high" | "medium" | "low";
export type VisibilityLevel = "anonymous" | "school" | "schoolDepartment" | "profile";
export type VerificationState =
  | "guest"
  | "email_verified"
  | "student_verified"
  | "manual_review"
  | "rejected";
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

export interface SchoolEmailRule {
  id: string;
  schoolId: string;
  domain: string;
  emailRegex?: string;
  priority: number;
  isActive: boolean;
}

export interface SchoolStudentRule {
  id: string;
  schoolId: string;
  studentIdRegex?: string;
  admissionYearRegex?: string;
  admissionYearMin?: number;
  admissionYearMax?: number;
  expectedStudentNumberLength?: number;
  scoreEmailDomain?: number;
  scoreEmailRegex?: number;
  scoreStudentId?: number;
  scoreAdmissionYear?: number;
  scoreDepartment?: number;
}

export interface SchoolDepartment {
  id: string;
  schoolId: string;
  name: string;
  aliases?: string[];
  isActive: boolean;
}

export interface VerificationAutoCheck {
  code: string;
  label: string;
  passed: boolean;
  weight: number;
  detail?: string;
}

export interface VerificationDocument {
  id: string;
  verificationId: string;
  userId: string;
  documentType: string;
  fileName?: string;
  filePath: string;
  fileUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  status: "uploaded" | "reviewed" | "deleted";
  notes?: string;
  uploadedAt: string;
  reviewedAt?: string;
  deletedAt?: string;
}

export interface StudentVerification {
  id: string;
  userId: string;
  schoolId: string;
  requestId?: string;
  schoolEmail: string;
  studentNumber?: string;
  departmentName?: string;
  admissionYear?: number;
  verificationState: VerificationState;
  score: number;
  requiresDocumentUpload: boolean;
  autoChecks: VerificationAutoCheck[];
  decisionReason?: string;
  rejectionReason?: string;
  requestedAt: string;
  emailVerifiedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  documents?: VerificationDocument[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  referralCode?: string;
  referredByCode?: string;
  referredByUserId?: string;
  userType: UserType;
  schoolId?: string;
  department?: string;
  grade?: number;
  verified: boolean;
  adultVerified?: boolean;
  adultVerifiedAt?: string;
  studentVerificationStatus?: StudentVerificationStatus;
  verificationState?: VerificationState;
  verificationScore?: number;
  verificationRequestedAt?: string;
  verificationReviewedAt?: string;
  verificationRejectionReason?: string;
  schoolEmail?: string;
  schoolEmailVerifiedAt?: string;
  studentNumber?: string;
  admissionYear?: number;
  trustScore: number;
  reportCount?: number;
  warningCount?: number;
  isRestricted?: boolean;
  defaultVisibilityLevel?: VisibilityLevel;
  createdAt: string;
  bio?: string;
  avatarUrl?: string;
}

export type ProfileImageModerationStatus = "pending" | "approved" | "rejected";

export interface CommunityProfileImage {
  id: string;
  userId: string;
  imagePath: string;
  imageOrder: 1 | 2 | 3;
  moderationStatus: ProfileImageModerationStatus;
  moderationReason?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityProfile {
  userId: string;
  schoolId?: string;
  schoolName?: string;
  displayName: string;
  bio?: string;
  interests: string[];
  showDepartment: boolean;
  showAdmissionYear: boolean;
  department?: string;
  admissionYear?: number;
  verificationState?: VerificationState;
  images: CommunityProfileImage[];
  isOwner: boolean;
}

export interface ProfileBlock {
  id: string;
  userId: string;
  blockedUserId: string;
  createdAt: string;
}

export interface ProfileReport {
  id: string;
  targetUserId: string;
  reporterUserId: string;
  reason: string;
  detail?: string;
  createdAt: string;
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
  postType?: PostType;
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
  hotScore?: number;
  pollVoteCount?: number;
  tags?: string[];
  imageUrl?: string;
  meta?: AdmissionQuestionMeta;
  poll?: Poll | null;
}

export interface Comment {
  id: string;
  postId: string;
  parentCommentId?: string;
  authorId: string;
  visibilityLevel?: VisibilityLevel;
  reportCount?: number;
  adminHidden?: boolean;
  autoHidden?: boolean;
  content: string;
  accepted: boolean;
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
  selected?: boolean;
}

export interface Poll {
  id: string;
  postId: string;
  question: string;
  totalVotes: number;
  options: PollOption[];
  votedOptionId?: string;
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
  verificationState?: VerificationState;
  verificationScore?: number;
  studentNumber?: string;
  admissionYear?: number;
  decisionReason?: string;
  rejectionReason?: string;
  autoChecks?: VerificationAutoCheck[];
  documents?: VerificationDocument[];
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

export interface AdminMember {
  id: string;
  email: string;
  nickname: string;
  name?: string;
  userType: UserType;
  schoolId?: string;
  schoolName?: string;
  department?: string;
  grade?: number;
  verified: boolean;
  adultVerified: boolean;
  studentVerificationStatus: StudentVerificationStatus;
  verificationState?: VerificationState;
  verificationScore?: number;
  studentNumber?: string;
  admissionYear?: number;
  verificationRejectionReason?: string;
  schoolEmail?: string;
  trustScore: number;
  reportCount: number;
  warningCount: number;
  isRestricted: boolean;
  role?: "admin" | "moderator";
  createdAt: string;
  lastSignInAt?: string;
}

export interface AdminMemberPostSummary {
  id: string;
  title: string;
  category: PostCategory;
  subcategory?: CommunitySubcategory | "dating" | "meeting";
  createdAt: string;
  commentCount: number;
  likeCount: number;
  viewCount: number;
  hidden: boolean;
}

export interface AdminMemberCommentSummary {
  id: string;
  postId: string;
  postTitle?: string;
  content: string;
  createdAt: string;
  hidden: boolean;
}

export interface AdminMemberReportSummary {
  id: string;
  reason: ReportReason;
  status: ReportStatus;
  targetType: ReportTargetType;
  targetId: string;
  createdAt: string;
  memo?: string;
}

export interface AdminMemberDetail {
  member: AdminMember;
  recentPosts: AdminMemberPostSummary[];
  recentComments: AdminMemberCommentSummary[];
  receivedReports: AdminMemberReportSummary[];
  auditLogs: AdminAuditLog[];
  studentVerifications?: StudentVerification[];
}

export interface AdminSchoolStat {
  schoolId: string;
  schoolName: string;
  memberCount: number;
  verifiedCount: number;
  restrictedCount: number;
  reportCount: number;
  postCount: number;
}

export interface AdminOverview {
  totalMembers: number;
  restrictedMembers: number;
  adminCount: number;
  moderatorCount: number;
  pendingVerificationCount: number;
  failedVerificationCount: number;
  hiddenContentCount: number;
  reportCount: number;
  reviewingReportCount: number;
  reportReasonStats: Array<{
    reason: ReportReason;
    count: number;
  }>;
  moderationHistory: AdminAuditLog[];
  recentErrorEvents: AdminOpsEvent[];
  recentSlowEvents: AdminOpsEvent[];
  schools: School[];
  schoolStats: AdminSchoolStat[];
}

export interface AdminOpsEvent {
  id: string;
  level: "info" | "warn" | "error";
  event: string;
  source: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminFeatureFlags {
  premiumLimitsEnabled: boolean;
  adsEnabled: boolean;
  promotedPostsEnabled: boolean;
  schoolTargetAdsEnabled: boolean;
}

export interface AdminNotice {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  active: boolean;
  createdAt: string;
  startsAt?: string;
  endsAt?: string;
}

export interface AdminPromotion {
  id: string;
  title: string;
  description: string;
  placement: string;
  linkUrl?: string;
  targetSchoolId?: string;
  targetUserType?: UserType;
  priority: number;
  active: boolean;
  pinned: boolean;
  createdAt: string;
}

export interface AdminSettingsPayload {
  featureFlags: AdminFeatureFlags;
  notices: AdminNotice[];
  promotions: AdminPromotion[];
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
  schoolEmailRules?: SchoolEmailRule[];
  schoolStudentRules?: SchoolStudentRule[];
  schoolDepartments?: SchoolDepartment[];
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
