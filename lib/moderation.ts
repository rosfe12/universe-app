import type {
  AppRuntimeSnapshot,
  Post,
  Report,
  ReportTargetType,
  User,
} from "@/types";
import { isVerifiedStudent } from "@/lib/user-identity";

export const DAILY_TRUST_CAP = 10;
export const POST_DAILY_TRUST_CAP = 6;
export const COMMENT_DAILY_TRUST_CAP = 5;
export const LECTURE_REVIEW_DAILY_TRUST_CAP = 6;
export const REPORT_AUTO_HIDE_THRESHOLD = 3;
export const REPEATED_REPORT_THRESHOLD = 2;
export const LOW_TRUST_THRESHOLD = 40;
export const USER_RESTRICTION_WARNING_THRESHOLD = 3;

const MODERATION_BLOCKED_WORDS = [
  "시발",
  "씨발",
  "ㅅㅂ",
  "병신",
  "ㅂㅅ",
  "개새",
  "죽어",
  "느금",
] as const;

export type PositiveTrustAction =
  | "post"
  | "comment"
  | "acceptedAnswer"
  | "lectureReview";

function dayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function withinSeconds(a: string, b: string, seconds: number) {
  return Math.abs(+new Date(a) - +new Date(b)) <= seconds * 1000;
}

function getUserPosts(snapshot: AppRuntimeSnapshot, userId: string) {
  return snapshot.posts.filter((post) => post.authorId === userId);
}

function getUserComments(snapshot: AppRuntimeSnapshot, userId: string) {
  return snapshot.comments.filter((comment) => comment.authorId === userId);
}

function getUserLectureReviews(snapshot: AppRuntimeSnapshot, userId: string) {
  return snapshot.lectureReviews.filter((review) => review.reviewerId === userId);
}

function getUserTradePosts(snapshot: AppRuntimeSnapshot, userId: string) {
  return snapshot.tradePosts.filter((tradePost) => tradePost.userId === userId);
}

function getPositiveTrustEarnedToday(
  snapshot: AppRuntimeSnapshot,
  userId: string,
  createdAt: string,
) {
  const todayPosts = getUserPosts(snapshot, userId).filter(
    (post) => dayKey(post.createdAt) === dayKey(createdAt),
  ).length;
  const todayComments = getUserComments(snapshot, userId).filter(
    (comment) => dayKey(comment.createdAt) === dayKey(createdAt),
  ).length;
  const todayAccepted = getUserComments(snapshot, userId).filter(
    (comment) => comment.accepted && dayKey(comment.createdAt) === dayKey(createdAt),
  ).length;
  const todayLectureReviews = getUserLectureReviews(snapshot, userId).filter(
    (review) => dayKey(review.createdAt) === dayKey(createdAt),
  ).length;
  const todayTradePosts = getUserTradePosts(snapshot, userId).filter(
    (tradePost) => dayKey(tradePost.createdAt) === dayKey(createdAt),
  ).length;

  return (
    Math.min(todayPosts * 2 + todayTradePosts * 2, POST_DAILY_TRUST_CAP) +
    Math.min(todayComments, COMMENT_DAILY_TRUST_CAP) +
    Math.min(todayLectureReviews * 3, LECTURE_REVIEW_DAILY_TRUST_CAP) +
    todayAccepted * 5
  );
}

function hasRapidRepeatActivity(
  snapshot: AppRuntimeSnapshot,
  userId: string,
  createdAt: string,
  type: PositiveTrustAction,
) {
  if (type === "post") {
    return [...getUserPosts(snapshot, userId), ...getUserTradePosts(snapshot, userId)].some(
      (item) => withinSeconds(item.createdAt, createdAt, 60),
    );
  }

  if (type === "comment") {
    return getUserComments(snapshot, userId).some((item) =>
      withinSeconds(item.createdAt, createdAt, 60),
    );
  }

  if (type === "lectureReview") {
    return getUserLectureReviews(snapshot, userId).some((item) =>
      withinSeconds(item.createdAt, createdAt, 60),
    );
  }

  return false;
}

function getActionCap(action: PositiveTrustAction) {
  if (action === "post") return POST_DAILY_TRUST_CAP;
  if (action === "comment") return COMMENT_DAILY_TRUST_CAP;
  if (action === "lectureReview") return LECTURE_REVIEW_DAILY_TRUST_CAP;
  return Infinity;
}

function getActionBaseScore(action: PositiveTrustAction) {
  if (action === "post") return 2;
  if (action === "comment") return 1;
  if (action === "acceptedAnswer") return 5;
  return 3;
}

function getActionEarnedToday(
  snapshot: AppRuntimeSnapshot,
  userId: string,
  createdAt: string,
  action: PositiveTrustAction,
) {
  if (action === "post") {
    const count =
      getUserPosts(snapshot, userId).filter((post) => dayKey(post.createdAt) === dayKey(createdAt))
        .length +
      getUserTradePosts(snapshot, userId).filter(
        (tradePost) => dayKey(tradePost.createdAt) === dayKey(createdAt),
      ).length;

    return Math.min(count * 2, POST_DAILY_TRUST_CAP);
  }

  if (action === "comment") {
    const count = getUserComments(snapshot, userId).filter(
      (comment) => dayKey(comment.createdAt) === dayKey(createdAt),
    ).length;

    return Math.min(count, COMMENT_DAILY_TRUST_CAP);
  }

  if (action === "acceptedAnswer") {
    return getUserComments(snapshot, userId).filter(
      (comment) => comment.accepted && dayKey(comment.createdAt) === dayKey(createdAt),
    ).length * 5;
  }

  const count = getUserLectureReviews(snapshot, userId).filter(
    (review) => dayKey(review.createdAt) === dayKey(createdAt),
  ).length;

  return Math.min(count * 3, LECTURE_REVIEW_DAILY_TRUST_CAP);
}

export function getPositiveTrustGain(
  snapshot: AppRuntimeSnapshot,
  userId: string,
  createdAt: string,
  action: PositiveTrustAction,
) {
  const base = getActionBaseScore(action);
  const actionCap = getActionCap(action);
  const actionEarnedToday = getActionEarnedToday(snapshot, userId, createdAt, action);
  const dailyEarned = getPositiveTrustEarnedToday(snapshot, userId, createdAt);
  const remainingAction = Number.isFinite(actionCap)
    ? Math.max(0, actionCap - actionEarnedToday)
    : base;
  const remainingDaily = Math.max(0, DAILY_TRUST_CAP - dailyEarned);
  let gain = Math.min(base, remainingAction, remainingDaily);

  if (gain > 0 && hasRapidRepeatActivity(snapshot, userId, createdAt, action)) {
    gain = Math.max(0, gain - 1);
  }

  return gain;
}

export function findBlockedKeyword(text: string) {
  const normalized = normalizeText(text);
  return MODERATION_BLOCKED_WORDS.find((keyword) => normalized.includes(keyword));
}

export function validatePostSubmission(
  snapshot: AppRuntimeSnapshot,
  input: {
    authorId: string;
    category: Post["category"];
    title: string;
    content: string;
    createdAt: string;
  },
) {
  const keyword = findBlockedKeyword(`${input.title} ${input.content}`);
  if (keyword) {
    return `부적절한 표현(${keyword})이 포함되어 있습니다.`;
  }

  const recentSameCategory = snapshot.posts.filter(
    (post) =>
      post.authorId === input.authorId &&
      post.category === input.category &&
      withinSeconds(post.createdAt, input.createdAt, 60),
  ).length;
  if (recentSameCategory >= 1) {
    return "1분 내 같은 카테고리 글은 1개만 작성할 수 있습니다.";
  }

  const normalizedIncoming = normalizeText(`${input.title} ${input.content}`);
  const duplicate = snapshot.posts.some(
    (post) =>
      post.authorId === input.authorId &&
      normalizeText(`${post.title} ${post.content}`) === normalizedIncoming &&
      withinSeconds(post.createdAt, input.createdAt, 600),
  );

  if (duplicate) {
    return "같은 내용을 짧은 시간 안에 반복 작성할 수 없습니다.";
  }

  return null;
}

export function validateCommentSubmission(
  snapshot: AppRuntimeSnapshot,
  input: {
    authorId: string;
    postId: string;
    content: string;
    createdAt: string;
  },
) {
  const keyword = findBlockedKeyword(input.content);
  if (keyword) {
    return `부적절한 표현(${keyword})이 포함되어 있습니다.`;
  }

  const normalizedIncoming = normalizeText(input.content);
  const duplicate = snapshot.comments.some(
    (comment) =>
      comment.authorId === input.authorId &&
      normalizeText(comment.content) === normalizedIncoming &&
      withinSeconds(comment.createdAt, input.createdAt, 600),
  );
  if (duplicate) {
    return "동일한 댓글은 잠시 후 다시 작성할 수 있습니다.";
  }

  const flood = snapshot.comments.filter(
    (comment) =>
      comment.authorId === input.authorId &&
      comment.postId === input.postId &&
      withinSeconds(comment.createdAt, input.createdAt, 60),
  ).length;
  if (flood >= 2) {
    return "같은 글에 너무 빠르게 댓글을 반복할 수 없습니다.";
  }

  return null;
}

export function validateLectureReviewSubmission(
  snapshot: AppRuntimeSnapshot,
  input: {
    reviewerId: string;
    lectureId: string;
    semester: string;
    shortComment: string;
    longComment: string;
  },
) {
  if (input.shortComment.trim().length < 5) {
    return "한줄평은 5자 이상 입력해야 합니다.";
  }

  if (input.longComment.trim().length < 20) {
    return "자세한 후기는 20자 이상 입력해야 합니다.";
  }

  const keyword = findBlockedKeyword(`${input.shortComment} ${input.longComment}`);
  if (keyword) {
    return `부적절한 표현(${keyword})이 포함되어 있습니다.`;
  }

  const duplicated = snapshot.lectureReviews.some(
    (review) =>
      review.reviewerId === input.reviewerId &&
      review.lectureId === input.lectureId &&
      review.semester === input.semester,
  );
  if (duplicated) {
    return "같은 강의와 같은 학기에는 리뷰를 한 번만 남길 수 있습니다.";
  }

  return null;
}

export function validateDatingWriteAccess(user: User) {
  if (user.id === "guest-user") {
    return "로그인 후 미팅 글을 작성할 수 있습니다.";
  }

  if (!isVerifiedStudent(user)) {
    return "학교 메일 인증을 완료한 대학생만 미팅 글을 작성할 수 있습니다.";
  }

  return null;
}

export function validateTradeSubmission(
  snapshot: AppRuntimeSnapshot,
  input: {
    userId: string;
    note: string;
    createdAt: string;
  },
) {
  const keyword = findBlockedKeyword(input.note);
  if (keyword) {
    return `부적절한 표현(${keyword})이 포함되어 있습니다.`;
  }

  const recentTradePosts = snapshot.tradePosts.filter(
    (tradePost) =>
      tradePost.userId === input.userId &&
      withinSeconds(tradePost.createdAt, input.createdAt, 60),
  ).length;
  if (recentTradePosts >= 1) {
    return "1분 내 매칭 글은 1개만 작성할 수 있습니다.";
  }

  const duplicated = snapshot.tradePosts.some(
    (tradePost) =>
      tradePost.userId === input.userId &&
      normalizeText(tradePost.note) === normalizeText(input.note) &&
      withinSeconds(tradePost.createdAt, input.createdAt, 600),
  );
  if (duplicated) {
    return "같은 매칭 메모는 잠시 후 다시 작성할 수 있습니다.";
  }

  return null;
}

export function canSubmitReport(
  snapshot: AppRuntimeSnapshot,
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
) {
  return !snapshot.reports.some(
    (report) =>
      report.reporterId === reporterId &&
      report.targetType === targetType &&
      report.targetId === targetId &&
      report.status !== "dismissed",
  );
}

export function getActiveReportCount(
  reports: Report[],
  targetType: ReportTargetType,
  targetId: string,
) {
  return reports.filter(
    (report) =>
      report.targetType === targetType &&
      report.targetId === targetId &&
      report.status !== "dismissed",
  ).length;
}

export function shouldAutoHide(reportCount: number) {
  return reportCount >= REPORT_AUTO_HIDE_THRESHOLD;
}

export function getModerationSemesterRank(semester?: string) {
  if (!semester) return 0;
  const [yearRaw = "0", termRaw = "0"] = semester.split("-");
  return Number(yearRaw) * 10 + Number(termRaw);
}

export function resolveReportTargetUserId(
  snapshot: AppRuntimeSnapshot,
  targetType: ReportTargetType,
  targetId: string,
) {
  if (targetType === "user") return targetId;

  if (targetType === "post") {
    return snapshot.posts.find((post) => post.id === targetId)?.authorId;
  }

  if (targetType === "comment") {
    return snapshot.comments.find((comment) => comment.id === targetId)?.authorId;
  }

  if (targetType === "review") {
    return snapshot.lectureReviews.find((review) => review.id === targetId)?.reviewerId;
  }

  return snapshot.datingProfiles.find((profile) => profile.id === targetId)?.userId;
}

export function getModerationFutureSignal() {
  return {
    supportsIpHash: true,
    supportsDeviceFingerprint: true,
    supportsBehaviorGraph: true,
  } as const;
}
