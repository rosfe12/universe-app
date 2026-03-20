export type UserType = "college" | "highSchool" | "parent";

export type CommunitySubcategory = "club" | "meetup" | "food" | "hot";
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
  | "other";
export type NotificationType = "comment" | "answer" | "trade" | "report";
export type TradeStatus = "open" | "matching" | "closed";
export type DifficultyLevel = "easy" | "medium" | "hard";
export type WorkloadLevel = "light" | "medium" | "heavy";
export type AttendanceLevel = "flexible" | "medium" | "strict";
export type ExamStyle = "multipleChoice" | "essay" | "project" | "mixed";
export type GradingStyle = "tough" | "medium" | "generous";
export type MatchStrength = "high" | "medium" | "low";
export type VisibilityLevel = "anonymous" | "school" | "schoolDepartment" | "profile";

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
  autoHidden?: boolean;
  title: string;
  content: string;
  createdAt: string;
  likes: number;
  commentCount: number;
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

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
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
