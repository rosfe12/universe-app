export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type SupabaseTable<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type VisibilityLevel = "anonymous" | "school" | "schoolDepartment" | "profile";
type UserType = "student" | "applicant" | "freshman";
type StudentVerificationStatus = "none" | "unverified" | "pending" | "verified" | "rejected";
type VerificationRequestStatus = "pending" | "verified" | "expired" | "cancelled";
type ReportStatus = "pending" | "reviewed" | "reviewing" | "confirmed" | "dismissed";
type ReportReason =
  | "misinformation"
  | "abuse"
  | "spam"
  | "harassment"
  | "fraud"
  | "sexual_content"
  | "other";
type ReportTargetType = "post" | "comment" | "review" | "profile" | "user";

type SchoolRow = {
  id: string;
  name: string;
  domain: string;
  city: string;
  created_at: string;
};

type SchoolInsert = {
  id?: string;
  name: string;
  domain: string;
  city?: string;
  created_at?: string;
};

type UserRow = {
  id: string;
  email: string;
  referral_code: string | null;
  referred_by_code: string | null;
  referred_by_user_id: string | null;
  user_type: UserType;
  school_id: string | null;
  department: string | null;
  grade: number | null;
  nickname: string;
  trust_score: number;
  report_count: number;
  warning_count: number;
  is_restricted: boolean;
  created_at: string;
  name: string | null;
  verified: boolean;
  adult_verified: boolean;
  adult_verified_at: string | null;
  student_verification_status: StudentVerificationStatus;
  school_email: string | null;
  school_email_verified_at: string | null;
  default_visibility_level: VisibilityLevel;
  bio: string | null;
  avatar_url: string | null;
  updated_at: string;
};

type UserInsert = {
  id: string;
  email: string;
  referral_code?: string | null;
  referred_by_code?: string | null;
  referred_by_user_id?: string | null;
  user_type?: UserType;
  school_id?: string | null;
  department?: string | null;
  grade?: number | null;
  nickname?: string | null;
  trust_score?: number;
  report_count?: number;
  warning_count?: number;
  is_restricted?: boolean;
  created_at?: string;
  name?: string | null;
  verified?: boolean;
  adult_verified?: boolean;
  adult_verified_at?: string | null;
  student_verification_status?: StudentVerificationStatus;
  school_email?: string | null;
  school_email_verified_at?: string | null;
  default_visibility_level?: VisibilityLevel;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at?: string;
};

type UserRoleRow = {
  id: string;
  user_id: string;
  role: "admin" | "moderator";
  created_at: string;
};

type UserRoleInsert = {
  id?: string;
  user_id: string;
  role?: "admin" | "moderator";
  created_at?: string;
};

type StudentVerificationRequestRow = {
  id: string;
  user_id: string;
  school_id: string;
  school_email: string;
  verification_user_id: string | null;
  status: VerificationRequestStatus;
  delivery_method: "pending" | "app_smtp" | "supabase_auth";
  delivery_status: "pending" | "sent" | "failed" | "rate_limited";
  delivery_error: string | null;
  delivered_at: string | null;
  next_path: string;
  requested_at: string;
  verified_at: string | null;
  expires_at: string;
};

type StudentVerificationRequestInsert = {
  id?: string;
  user_id: string;
  school_id: string;
  school_email: string;
  verification_user_id?: string | null;
  status?: VerificationRequestStatus;
  delivery_method?: "pending" | "app_smtp" | "supabase_auth";
  delivery_status?: "pending" | "sent" | "failed" | "rate_limited";
  delivery_error?: string | null;
  delivered_at?: string | null;
  next_path?: string;
  requested_at?: string;
  verified_at?: string | null;
  expires_at?: string;
};

type PostRow = {
  id: string;
  author_id: string;
  category: "admission" | "community" | "dating";
  subcategory:
    | "free"
    | "club"
    | "meetup"
    | "food"
    | "advice"
    | "ask"
    | "anonymous"
    | "school"
    | "hot"
    | "freshman"
    | "dating"
    | "meeting"
    | null;
  title: string;
  content: string;
  school_id: string | null;
  scope: "school" | "global";
  like_count: number;
  comment_count: number;
  view_count: number;
  hot_score: number;
  poll_vote_count: number;
  post_type: "normal" | "poll" | "question" | "balance";
  report_count: number;
  admin_hidden: boolean;
  auto_hidden: boolean;
  created_at: string;
  visibility_level: VisibilityLevel;
  image_url: string | null;
  metadata: Json;
  updated_at: string;
};

type PostInsert = {
  id?: string;
  author_id: string;
  category: "admission" | "community" | "dating";
  subcategory?:
    | "free"
    | "club"
    | "meetup"
    | "food"
    | "advice"
    | "ask"
    | "anonymous"
    | "school"
    | "hot"
    | "freshman"
    | "dating"
    | "meeting"
    | null;
  title: string;
  content: string;
  school_id?: string | null;
  scope: "school" | "global";
  like_count?: number;
  comment_count?: number;
  view_count?: number;
  hot_score?: number;
  poll_vote_count?: number;
  post_type?: "normal" | "poll" | "question" | "balance";
  report_count?: number;
  admin_hidden?: boolean;
  auto_hidden?: boolean;
  created_at?: string;
  visibility_level?: VisibilityLevel;
  image_url?: string | null;
  metadata?: Json;
  updated_at?: string;
};

type CommentRow = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_id: string;
  content: string;
  like_count: number;
  report_count: number;
  admin_hidden: boolean;
  auto_hidden: boolean;
  created_at: string;
  accepted: boolean;
  visibility_level: VisibilityLevel;
};

type CommentInsert = {
  id?: string;
  post_id: string;
  parent_comment_id?: string | null;
  author_id: string;
  content: string;
  like_count?: number;
  report_count?: number;
  admin_hidden?: boolean;
  auto_hidden?: boolean;
  created_at?: string;
  accepted?: boolean;
  visibility_level?: VisibilityLevel;
};

type LectureRow = {
  id: string;
  school_id: string;
  name: string;
  professor: string;
  section: string;
  semester: string;
  created_at: string;
  day_time: string;
  credits: number;
  department: string;
};

type LectureInsert = {
  id?: string;
  school_id: string;
  name: string;
  professor: string;
  section?: string;
  semester: string;
  created_at?: string;
  day_time?: string;
  credits?: number;
  department?: string;
};

type LectureReviewRow = {
  id: string;
  lecture_id: string;
  author_id: string;
  difficulty: "easy" | "medium" | "hard";
  workload: "light" | "medium" | "heavy";
  attendance: "flexible" | "medium" | "strict";
  exam_style: "multipleChoice" | "essay" | "project" | "mixed";
  team_project: boolean;
  grading_style: "tough" | "medium" | "generous";
  honey_score: number;
  short_comment: string;
  long_comment: string;
  semester: string;
  report_count: number;
  admin_hidden: boolean;
  auto_hidden: boolean;
  created_at: string;
  presentation: boolean;
  helpful_count: number;
  visibility_level: VisibilityLevel;
};

type LectureReviewInsert = {
  id?: string;
  lecture_id: string;
  author_id: string;
  difficulty: "easy" | "medium" | "hard";
  workload: "light" | "medium" | "heavy";
  attendance: "flexible" | "medium" | "strict";
  exam_style: "multipleChoice" | "essay" | "project" | "mixed";
  team_project?: boolean;
  grading_style: "tough" | "medium" | "generous";
  honey_score: number;
  short_comment: string;
  long_comment: string;
  semester: string;
  report_count?: number;
  admin_hidden?: boolean;
  auto_hidden?: boolean;
  created_at?: string;
  presentation?: boolean;
  helpful_count?: number;
  visibility_level?: VisibilityLevel;
};

type TradePostRow = {
  id: string;
  author_id: string;
  school_id: string;
  have_lecture_id: string;
  want_lecture_id: string;
  note: string;
  status: "open" | "matched" | "closed";
  report_count: number;
  created_at: string;
  semester: string;
  professor: string | null;
  section: string | null;
  time_range: string;
  visibility_level: VisibilityLevel;
  auto_hidden: boolean;
};

type TradePostInsert = {
  id?: string;
  author_id: string;
  school_id: string;
  have_lecture_id: string;
  want_lecture_id: string;
  note?: string;
  status?: "open" | "matched" | "closed";
  report_count?: number;
  created_at?: string;
  semester?: string;
  professor?: string | null;
  section?: string | null;
  time_range?: string;
  visibility_level?: VisibilityLevel;
  auto_hidden?: boolean;
};

type TradeMessageRow = {
  id: string;
  trade_post_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type TradeMessageInsert = {
  id?: string;
  trade_post_id: string;
  sender_id: string;
  content: string;
  created_at?: string;
};

type PollRow = {
  id: string;
  post_id: string;
  question: string;
  created_at: string;
};

type PollInsert = {
  id?: string;
  post_id: string;
  question: string;
  created_at?: string;
};

type PollOptionRow = {
  id: string;
  poll_id: string;
  option_text: string;
  position: number;
  vote_count: number;
};

type PollOptionInsert = {
  id?: string;
  poll_id: string;
  option_text: string;
  position: number;
  vote_count?: number;
};

type PollVoteRow = {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
};

type PollVoteInsert = {
  id?: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at?: string;
};

type DatingProfileRow = {
  id: string;
  user_id: string;
  school_id: string;
  department: string | null;
  grade: number;
  intro: string;
  vibe_tag: string;
  photo_url: string | null;
  visibility_level: VisibilityLevel;
  report_count: number;
  created_at: string;
  admin_hidden: boolean;
  auto_hidden: boolean;
  is_visible: boolean;
};

type DatingProfileInsert = {
  id?: string;
  user_id: string;
  school_id: string;
  department?: string | null;
  grade: number;
  intro: string;
  vibe_tag: string;
  photo_url?: string | null;
  visibility_level?: VisibilityLevel;
  report_count?: number;
  created_at?: string;
  admin_hidden?: boolean;
  auto_hidden?: boolean;
  is_visible?: boolean;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  memo: string | null;
  status: ReportStatus;
  created_at: string;
};

type ReportInsert = {
  id?: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason?: ReportReason;
  memo?: string | null;
  status?: ReportStatus;
  created_at?: string;
};

type BlockRow = {
  id: string;
  blocker_id: string;
  blocked_user_id: string;
  created_at: string;
};

type BlockInsert = {
  id?: string;
  blocker_id: string;
  blocked_user_id: string;
  created_at?: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  type:
    | "comment"
    | "reply"
    | "trending_post"
    | "lecture_reaction"
    | "trade_match"
    | "admission_answer"
    | "school_recommendation"
    | "freshman_trending"
    | "admission_unanswered"
    | "verification_approved"
    | "report_update"
    | "announcement"
    | "answer"
    | "trade"
    | "report";
  title: string;
  body: string;
  is_read: boolean;
  read_at: string | null;
  href: string | null;
  target_type: string | null;
  target_id: string | null;
  source_kind: "activity" | "recommendation" | "system";
  delivery_mode: "instant" | "daily";
  metadata: Record<string, unknown>;
  created_at: string;
};

type NotificationInsert = {
  id?: string;
  user_id: string;
  type:
    | "comment"
    | "reply"
    | "trending_post"
    | "lecture_reaction"
    | "trade_match"
    | "admission_answer"
    | "school_recommendation"
    | "freshman_trending"
    | "admission_unanswered"
    | "verification_approved"
    | "report_update"
    | "announcement"
    | "answer"
    | "trade"
    | "report";
  title: string;
  body: string;
  is_read?: boolean;
  read_at?: string | null;
  href?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  source_kind?: "activity" | "recommendation" | "system";
  delivery_mode?: "instant" | "daily";
  metadata?: Record<string, unknown>;
  created_at?: string;
};

type MediaAssetRow = {
  id: string;
  owner_type: "post" | "profile";
  owner_id: string;
  file_url: string;
  media_type: "image" | "video";
  created_at: string;
};

type MediaAssetInsert = {
  id?: string;
  owner_type: "post" | "profile";
  owner_id: string;
  file_url: string;
  media_type: "image" | "video";
  created_at?: string;
};

type AdminAuditLogRow = {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type AdminAuditLogInsert = {
  id?: string;
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

type AdminSettingRow = {
  key: string;
  value: Json;
  updated_at: string;
};

type AdminSettingInsert = {
  key: string;
  value?: Json;
  updated_at?: string;
};

export interface Database {
  public: {
    Tables: {
      schools: SupabaseTable<SchoolRow, SchoolInsert>;
      users: SupabaseTable<UserRow, UserInsert>;
      user_roles: SupabaseTable<UserRoleRow, UserRoleInsert>;
      student_verification_requests: SupabaseTable<
        StudentVerificationRequestRow,
        StudentVerificationRequestInsert
      >;
      posts: SupabaseTable<PostRow, PostInsert>;
      comments: SupabaseTable<CommentRow, CommentInsert>;
      lectures: SupabaseTable<LectureRow, LectureInsert>;
      lecture_reviews: SupabaseTable<LectureReviewRow, LectureReviewInsert>;
      trade_posts: SupabaseTable<TradePostRow, TradePostInsert>;
      trade_messages: SupabaseTable<TradeMessageRow, TradeMessageInsert>;
      polls: SupabaseTable<PollRow, PollInsert>;
      poll_options: SupabaseTable<PollOptionRow, PollOptionInsert>;
      poll_votes: SupabaseTable<PollVoteRow, PollVoteInsert>;
      dating_profiles: SupabaseTable<DatingProfileRow, DatingProfileInsert>;
      reports: SupabaseTable<ReportRow, ReportInsert>;
      blocks: SupabaseTable<BlockRow, BlockInsert>;
      notifications: SupabaseTable<NotificationRow, NotificationInsert>;
      media_assets: SupabaseTable<MediaAssetRow, MediaAssetInsert>;
      admin_audit_logs: SupabaseTable<AdminAuditLogRow, AdminAuditLogInsert>;
      admin_settings: SupabaseTable<AdminSettingRow, AdminSettingInsert>;
    };
    Views: Record<string, never>;
    Functions: {
      list_user_public_profiles: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          email: string | null;
          name: string | null;
          nickname: string;
          user_type: UserType;
          school_id: string | null;
          department: string | null;
          grade: number | null;
          verified: boolean;
          student_verification_status: StudentVerificationStatus;
          trust_score: number;
          report_count: number;
          warning_count: number;
          is_restricted: boolean;
          default_visibility_level: VisibilityLevel;
          created_at: string;
          bio: string | null;
          avatar_url: string | null;
        }[];
      };
    };
    Enums: {
      user_type: UserType;
      student_verification_status: StudentVerificationStatus;
      verification_request_status: VerificationRequestStatus;
      visibility_level: VisibilityLevel;
      report_status: ReportStatus;
      report_reason: ReportReason;
      report_target_type: ReportTargetType;
    };
    CompositeTypes: Record<string, never>;
  };
}
