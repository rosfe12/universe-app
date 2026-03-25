export const SCHOOL_SELECT = "id,name,domain,city";

export const CURRENT_USER_PROFILE_SELECT = [
  "id",
  "email",
  "name",
  "nickname",
  "referral_code",
  "referred_by_code",
  "referred_by_user_id",
  "user_type",
  "school_id",
  "department",
  "grade",
  "verified",
  "adult_verified",
  "adult_verified_at",
  "student_verification_status",
  "school_email",
  "school_email_verified_at",
  "trust_score",
  "report_count",
  "warning_count",
  "is_restricted",
  "default_visibility_level",
  "created_at",
  "bio",
  "avatar_url",
].join(",");

export const POST_SELECT = [
  "id",
  "category",
  "subcategory",
  "school_id",
  "author_id",
  "visibility_level",
  "title",
  "content",
  "created_at",
  "like_count",
  "comment_count",
  "view_count",
  "hot_score",
  "poll_vote_count",
  "post_type",
  "report_count",
  "admin_hidden",
  "auto_hidden",
  "image_url",
  "metadata",
].join(",");

export const COMMENT_SELECT = [
  "id",
  "post_id",
  "parent_comment_id",
  "author_id",
  "visibility_level",
  "content",
  "accepted",
  "report_count",
  "admin_hidden",
  "auto_hidden",
  "created_at",
].join(",");

export const LECTURE_SELECT = [
  "id",
  "school_id",
  "semester",
  "name",
  "professor",
  "section",
  "day_time",
  "credits",
  "department",
].join(",");

export const LECTURE_REVIEW_SELECT = [
  "id",
  "lecture_id",
  "author_id",
  "reviewer_id",
  "visibility_level",
  "difficulty",
  "workload",
  "attendance",
  "exam_style",
  "team_project",
  "presentation",
  "grading_style",
  "honey_score",
  "helpful_count",
  "report_count",
  "admin_hidden",
  "auto_hidden",
  "short_comment",
  "long_comment",
  "semester",
  "created_at",
].join(",");

export const TRADE_POST_SELECT = [
  "id",
  "school_id",
  "semester",
  "author_id",
  "user_id",
  "visibility_level",
  "have_lecture_id",
  "want_lecture_id",
  "professor",
  "section",
  "time_range",
  "note",
  "status",
  "report_count",
  "auto_hidden",
  "created_at",
].join(",");

export const NOTIFICATION_SELECT = [
  "id",
  "user_id",
  "type",
  "source_kind",
  "delivery_mode",
  "title",
  "body",
  "is_read",
  "read_at",
  "href",
  "target_type",
  "target_id",
  "metadata",
  "created_at",
].join(",");

export const REPORT_SELECT = [
  "id",
  "reporter_id",
  "target_type",
  "target_id",
  "reason",
  "memo",
  "status",
  "created_at",
].join(",");

export const BLOCK_SELECT = [
  "id",
  "blocker_id",
  "blocked_user_id",
  "created_at",
].join(",");

export const DATING_PROFILE_SELECT = [
  "id",
  "user_id",
  "intro",
  "vibe_tag",
  "photo_url",
  "is_visible",
  "visibility_level",
  "school_id",
  "department",
  "grade",
  "report_count",
  "admin_hidden",
  "auto_hidden",
  "created_at",
].join(",");

export const MEDIA_ASSET_SELECT = [
  "id",
  "owner_type",
  "owner_id",
  "media_type",
  "file_url",
  "created_at",
].join(",");

export const POLL_SELECT = "id,post_id,question,created_at";
export const POLL_OPTION_SELECT = "id,poll_id,option_text,position,vote_count";
export const POLL_VOTE_SELECT = "id,poll_id,option_id,user_id,created_at";

type UserIdSources = {
  currentUserId?: string;
  postRows?: Record<string, unknown>[];
  commentRows?: Record<string, unknown>[];
  lectureReviewRows?: Record<string, unknown>[];
  tradePostRows?: Record<string, unknown>[];
  datingProfileRows?: Record<string, unknown>[];
  blockRows?: Record<string, unknown>[];
};

export function collectRuntimeUserIds({
  currentUserId,
  postRows = [],
  commentRows = [],
  lectureReviewRows = [],
  tradePostRows = [],
  datingProfileRows = [],
  blockRows = [],
}: UserIdSources) {
  const ids = new Set<string>();

  if (currentUserId) {
    ids.add(currentUserId);
  }

  for (const row of postRows) {
    if (row.author_id) ids.add(String(row.author_id));
  }

  for (const row of commentRows) {
    if (row.author_id) ids.add(String(row.author_id));
  }

  for (const row of lectureReviewRows) {
    if (row.author_id) ids.add(String(row.author_id));
    if (row.reviewer_id) ids.add(String(row.reviewer_id));
  }

  for (const row of tradePostRows) {
    if (row.author_id) ids.add(String(row.author_id));
    if (row.user_id) ids.add(String(row.user_id));
  }

  for (const row of datingProfileRows) {
    if (row.user_id) ids.add(String(row.user_id));
  }

  for (const row of blockRows) {
    if (row.blocker_id) ids.add(String(row.blocker_id));
    if (row.blocked_user_id) ids.add(String(row.blocked_user_id));
  }

  return [...ids];
}

export function getClientRuntimeSnapshotTtlMs(scope: string) {
  switch (scope) {
    case "home":
      return 45000;
    case "community":
    case "school":
      return 30000;
    case "lectures":
    case "trade":
    case "dating":
      return 20000;
    case "search":
    case "chrome":
    case "messages":
    case "notifications":
      return 20000;
    case "profile":
    case "admin":
      return 10000;
    default:
      return 15000;
  }
}

export function getServerRuntimeSnapshotTtlMs(scope: string) {
  switch (scope) {
    case "home":
      return 60000;
    case "community":
    case "school":
      return 30000;
    case "lectures":
    case "dating":
    case "admission":
      return 20000;
    case "notifications":
    case "messages":
      return 15000;
    default:
      return 0;
  }
}

export function isServerSnapshotCacheable(scope: string) {
  return getServerRuntimeSnapshotTtlMs(scope) > 0;
}
