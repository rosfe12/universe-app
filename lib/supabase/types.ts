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
type UserType = "student" | "highschool" | "parent";
type ReportStatus = "pending" | "reviewed" | "reviewing" | "confirmed" | "dismissed";
type ReportReason = "misinformation" | "abuse" | "spam" | "harassment" | "fraud" | "other";
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
  default_visibility_level: VisibilityLevel;
  bio: string | null;
  avatar_url: string | null;
  updated_at: string;
};

type UserInsert = {
  id: string;
  email: string;
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

type PostRow = {
  id: string;
  author_id: string;
  category: "admission" | "community" | "dating";
  subcategory: "club" | "meetup" | "food" | "hot" | "dating" | "meeting" | null;
  title: string;
  content: string;
  school_id: string | null;
  scope: "school" | "global";
  like_count: number;
  comment_count: number;
  report_count: number;
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
  subcategory?: "club" | "meetup" | "food" | "hot" | "dating" | "meeting" | null;
  title: string;
  content: string;
  school_id?: string | null;
  scope: "school" | "global";
  like_count?: number;
  comment_count?: number;
  report_count?: number;
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
  author_id: string;
  content: string;
  like_count: number;
  report_count: number;
  auto_hidden: boolean;
  created_at: string;
  accepted: boolean;
  visibility_level: VisibilityLevel;
};

type CommentInsert = {
  id?: string;
  post_id: string;
  author_id: string;
  content: string;
  like_count?: number;
  report_count?: number;
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
  type: "comment" | "answer" | "trade" | "report";
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

type NotificationInsert = {
  id?: string;
  user_id: string;
  type: "comment" | "answer" | "trade" | "report";
  title: string;
  body: string;
  is_read?: boolean;
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

export interface Database {
  public: {
    Tables: {
      schools: SupabaseTable<SchoolRow, SchoolInsert>;
      users: SupabaseTable<UserRow, UserInsert>;
      user_roles: SupabaseTable<UserRoleRow, UserRoleInsert>;
      posts: SupabaseTable<PostRow, PostInsert>;
      comments: SupabaseTable<CommentRow, CommentInsert>;
      lectures: SupabaseTable<LectureRow, LectureInsert>;
      lecture_reviews: SupabaseTable<LectureReviewRow, LectureReviewInsert>;
      trade_posts: SupabaseTable<TradePostRow, TradePostInsert>;
      dating_profiles: SupabaseTable<DatingProfileRow, DatingProfileInsert>;
      reports: SupabaseTable<ReportRow, ReportInsert>;
      blocks: SupabaseTable<BlockRow, BlockInsert>;
      notifications: SupabaseTable<NotificationRow, NotificationInsert>;
      media_assets: SupabaseTable<MediaAssetRow, MediaAssetInsert>;
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
      visibility_level: VisibilityLevel;
      report_status: ReportStatus;
      report_reason: ReportReason;
      report_target_type: ReportTargetType;
    };
    CompositeTypes: Record<string, never>;
  };
}
