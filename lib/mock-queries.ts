import {
  ATTENDANCE_LABELS,
  CAREER_BOARD_LABELS,
  COMMUNITY_CATEGORY_LABELS,
  MATCH_STRENGTH_LABELS,
  TRADE_STATUS_LABELS,
  USER_TYPE_LABELS,
  WORKLOAD_LABELS,
} from "@/lib/constants";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import {
  generateAutoNickname,
  getDefaultVisibilityLevel,
  getPublicIdentityLabel,
  getSchoolShortName,
  getStudentVerificationBadge,
  getUserLevel,
  getTrustTier,
} from "@/lib/user-identity";
import {
  getActiveReportCount,
  getModerationSemesterRank,
  LOW_TRUST_THRESHOLD,
  REPORT_AUTO_HIDE_THRESHOLD,
  REPEATED_REPORT_THRESHOLD,
  resolveReportTargetUserId,
  shouldAutoHide,
} from "@/lib/moderation";
import { average } from "@/lib/utils";
import type {
  Comment,
  CommunitySubcategory,
  DatingProfile,
  LectureReview,
  LectureSummary,
  MatchStrength,
  Post,
  ReportTargetType,
  TradePost,
  User,
  VisibilityLevel,
} from "@/types";

export type CareerBoardKind = "careerInfo" | "jobPosting";

export const currentUser = new Proxy({} as User, {
  get(_target, prop) {
    return getRuntimeSnapshot().currentUser[prop as keyof User];
  },
});

const recentFirst = <T extends { createdAt: string }>(items: T[]) =>
  [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

function getActivityScore(item: {
  createdAt: string;
  likes?: number;
  commentCount?: number;
}) {
  const hoursSinceCreated = Math.max(
    1,
    (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60),
  );
  const freshnessBoost = Math.max(0, 72 - hoursSinceCreated);

  return (item.likes ?? 0) * 5 + (item.commentCount ?? 0) * 8 + freshnessBoost;
}

const popularFirst = <T extends { createdAt: string; likes?: number; commentCount?: number }>(items: T[]) =>
  [...items].sort(
    (a, b) =>
      getActivityScore(b) - getActivityScore(a) ||
      (b.commentCount ?? 0) - (a.commentCount ?? 0) ||
      (b.likes ?? 0) - (a.likes ?? 0) ||
      +new Date(b.createdAt) - +new Date(a.createdAt),
  );

const getState = () => getRuntimeSnapshot();

const ANONYMOUS_GLYPH: Record<User["userType"], string> = {
  student: "익",
  applicant: "입",
  freshman: "새",
};

const ANONYMOUS_AVATAR_TONES = [
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
] as const;

function hashUserId(value: string) {
  return [...value].reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function getSchoolName(schoolId?: string) {
  return getState().schools.find((school) => school.id === schoolId)?.name ?? "학교 미지정";
}

export function getCurrentSchool() {
  return getState().schools.find((school) => school.id === currentUser.schoolId);
}

export function getUser(userId: string) {
  return getState().users.find((user) => user.id === userId);
}

export function getAnonymousHandle(userId: string) {
  const user = getUser(userId);
  if (!user) return "익명 사용자";

  if (user.nickname) {
    return user.nickname;
  }

  return generateAutoNickname({
    id: user.id,
    email: user.email,
    school: getState().schools.find((school) => school.id === user.schoolId) ?? null,
  });
}

export function getAnonymousAvatarGlyph(userId: string) {
  const user = getUser(userId);
  if (!user) return "익";

  return ANONYMOUS_GLYPH[user.userType];
}

export function getAnonymousAvatarTone(userId: string) {
  return ANONYMOUS_AVATAR_TONES[hashUserId(userId) % ANONYMOUS_AVATAR_TONES.length];
}

export function getUserLabel(userId: string) {
  const user = getUser(userId);
  if (!user) return "알 수 없음";

  return `${getAnonymousHandle(userId)} · ${USER_TYPE_LABELS[user.userType]}`;
}

export function getUserVisibilityLevel(
  userId: string,
  override?: VisibilityLevel,
) {
  if (override) return override;
  const user = getUser(userId);
  return getDefaultVisibilityLevel(user);
}

export function getPublicIdentitySummary(
  userId: string,
  visibilityLevel?: VisibilityLevel,
) {
  const user = getUser(userId);
  if (!user) {
    return {
      label: "완전 익명",
      trustScore: 0,
      trustTier: getTrustTier(0),
      visibilityLevel: "anonymous" as VisibilityLevel,
    };
  }

  const resolvedVisibilityLevel = getUserVisibilityLevel(userId, visibilityLevel);

  return {
    label: getPublicIdentityLabel({
      schoolName: getSchoolName(user.schoolId),
      department: user.department,
      grade: user.grade,
      visibilityLevel: resolvedVisibilityLevel,
    }),
    trustScore: user.trustScore,
    trustTier: getTrustTier(user.trustScore),
    visibilityLevel: resolvedVisibilityLevel,
  };
}

export function getTrustScore(userId: string) {
  return getUser(userId)?.trustScore ?? 0;
}

export function getUserTrustTier(userId: string) {
  return getTrustTier(getTrustScore(userId));
}

export function getReportCount(targetType: ReportTargetType, targetId: string) {
  return getActiveReportCount(getState().reports, targetType, targetId);
}

export function hasUserReportedTarget(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
) {
  return getState().reports.some(
    (report) =>
      report.reporterId === reporterId &&
      report.targetType === targetType &&
      report.targetId === targetId &&
      report.status !== "dismissed",
  );
}

function getPostAuthorId(postId: string) {
  return getState().posts.find((post) => post.id === postId)?.authorId;
}

function getCommentAuthorId(commentId: string) {
  return getState().comments.find((comment) => comment.id === commentId)?.authorId;
}

function getReviewAuthorId(reviewId: string) {
  return getState().lectureReviews.find((review) => review.id === reviewId)?.reviewerId;
}

export function getUserReportCount(userId: string) {
  return getState().reports.filter((report) => {
    if (report.status === "dismissed") return false;
    if (report.targetType === "user") return report.targetId === userId;
    if (report.targetType === "post") return getPostAuthorId(report.targetId) === userId;
    if (report.targetType === "comment") return getCommentAuthorId(report.targetId) === userId;
    if (report.targetType === "review") return getReviewAuthorId(report.targetId) === userId;
    return false;
  }).length;
}

export function isRepeatedlyReportedUser(userId: string) {
  return getUserReportCount(userId) >= REPEATED_REPORT_THRESHOLD;
}

export function isRestrictedUser(userId: string) {
  const user = getUser(userId);
  return Boolean(user?.isRestricted);
}

function isBlockedAuthor(userId: string) {
  return getState().blocks.some(
    (block) =>
      block.blockerId === currentUser.id &&
      block.blockedUserId === userId,
  );
}

function isHiddenPost(post: Post) {
  return (
    isBlockedAuthor(post.authorId) ||
    isRestrictedUser(post.authorId) ||
    post.autoHidden === true ||
    shouldAutoHide(post.reportCount ?? getReportCount("post", post.id)) ||
    getUserReportCount(post.authorId) >= REPORT_AUTO_HIDE_THRESHOLD
  );
}

function isHiddenComment(comment: Comment) {
  return (
    isBlockedAuthor(comment.authorId) ||
    isRestrictedUser(comment.authorId) ||
    comment.autoHidden === true ||
    shouldAutoHide(comment.reportCount ?? getReportCount("comment", comment.id)) ||
    getUserReportCount(comment.authorId) >= REPORT_AUTO_HIDE_THRESHOLD
  );
}

function isHiddenReview(review: LectureReview) {
  return (
    isBlockedAuthor(review.reviewerId) ||
    isRestrictedUser(review.reviewerId) ||
    review.autoHidden === true ||
    shouldAutoHide(review.reportCount ?? getReportCount("review", review.id)) ||
    getUserReportCount(review.reviewerId) >= REPORT_AUTO_HIDE_THRESHOLD
  );
}

function isHiddenTradePost(post: TradePost) {
  return (
    isBlockedAuthor(post.userId) ||
    isRestrictedUser(post.userId) ||
    post.autoHidden === true ||
    shouldAutoHide(post.reportCount ?? getUserReportCount(post.userId))
  );
}

function isHiddenDatingProfile(profile: DatingProfile) {
  return (
    isBlockedAuthor(profile.userId) ||
    isRestrictedUser(profile.userId) ||
    profile.autoHidden === true ||
    shouldAutoHide(profile.reportCount ?? getUserReportCount(profile.userId))
  );
}

export function getCareerBoardKind(post: Pick<Post, "category" | "tags">) {
  if (post.category !== "community") return undefined;
  if (post.tags?.includes(CAREER_BOARD_LABELS.jobPosting)) return "jobPosting" as const;
  if (post.tags?.includes(CAREER_BOARD_LABELS.careerInfo)) return "careerInfo" as const;
  return undefined;
}

export function getAdmissionQuestions() {
  return popularFirst(
    getState().posts.filter((post) => post.category === "admission" && !isHiddenPost(post)),
  );
}

export function getAdmissionQuestion(id: string) {
  return getAdmissionQuestions().find((post) => post.id === id);
}

export function getCommentsByPostId(postId: string) {
  return recentFirst(
    getState().comments.filter(
      (comment) => comment.postId === postId && !isHiddenComment(comment),
    ),
  );
}

export function getLatestCommentPreview(postId: string) {
  return getCommentsByPostId(postId)[0];
}

export function getCommunityPosts(subcategory?: CommunitySubcategory) {
  const sharedCommunityBoards: CommunitySubcategory[] = ["free", "advice", "ask", "hot"];
  return popularFirst(
    getState().posts.filter(
      (post) =>
        post.category === "community" &&
        !getCareerBoardKind(post) &&
        !isHiddenPost(post) &&
        (subcategory
          ? post.subcategory === subcategory
          : sharedCommunityBoards.includes(post.subcategory as CommunitySubcategory)),
    ),
  );
}

export function getCareerPosts(kind?: CareerBoardKind) {
  return popularFirst(
    getState().posts.filter((post) => {
      const board = getCareerBoardKind(post);
      return post.category === "community" && !isHiddenPost(post) && Boolean(board) && (!kind || board === kind);
    }),
  );
}

export function getCommunityFilterForPost(post: Pick<Post, "category" | "subcategory" | "tags">) {
  const careerBoard = getCareerBoardKind(post);
  if (careerBoard) return "career" as const;
  if (post.subcategory === "free") return "free" as const;
  if (post.subcategory === "ask") return "ask" as const;
  if (post.subcategory === "hot") return "hot" as const;
  return "advice" as const;
}

export function getPostHref(postId: string) {
  const post = getPostById(postId);
  if (!post) return "/home";

  if (post.category === "admission") {
    return `/school?tab=admission&post=${post.id}`;
  }

  if (post.category === "dating") {
    return `/dating${post.subcategory ? `?filter=${post.subcategory}` : ""}`;
  }

  if (post.subcategory === "freshman") return `/school?tab=freshman&post=${post.id}`;
  if (post.subcategory === "club") return `/school?tab=club&post=${post.id}`;
  if (post.subcategory === "food") return `/school?tab=food&post=${post.id}`;

  return `/community?filter=${getCommunityFilterForPost(post)}&post=${post.id}`;
}

export function getCommunityCategoryLabel(
  subcategory?: CommunitySubcategory | "dating" | "meeting",
) {
  if (!subcategory) return "전체";
  if (subcategory === "dating") return "연애";
  if (subcategory === "meeting") return "미팅";
  return COMMUNITY_CATEGORY_LABELS[subcategory];
}

export function getHotScore(post: Pick<Post, "likes" | "commentCount">) {
  return post.likes * 2 + post.commentCount * 3;
}

export function getHotGalleryPosts(mode: "popular" | "latest" = "popular") {
  const items = getState().posts.filter(
    (post) =>
      post.category === "community" &&
      post.subcategory === "hot" &&
      !isHiddenPost(post),
  );

  if (mode === "latest") {
    return recentFirst(items);
  }

  return [...items].sort(
    (a, b) =>
      getHotScore(b) - getHotScore(a) ||
      b.likes - a.likes ||
      b.commentCount - a.commentCount ||
      +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function getDatingPosts(kind?: "dating" | "meeting") {
  return popularFirst(
    getState().posts.filter(
      (post) =>
        post.category === "dating" &&
        !isHiddenPost(post) &&
        (!kind || post.subcategory === kind),
    ),
  );
}

export function getDatingProfileByUserId(userId: string) {
  const profile = getState().datingProfiles.find((item) => item.userId === userId);
  if (!profile || isHiddenDatingProfile(profile)) return undefined;
  return profile;
}

export function getLectureSummaries() {
  const { lectures, lectureReviews } = getState();

  return lectures
    .map<LectureSummary>((lecture) => {
      const relatedReviews = lectureReviews.filter(
        (review) => review.lectureId === lecture.id && !isHiddenReview(review),
      );

      return {
        ...lecture,
        reviewCount: relatedReviews.length,
        averageHoneyScore: average(relatedReviews.map((review) => review.honeyScore)),
        attendanceLabel:
          ATTENDANCE_LABELS[relatedReviews[0]?.attendance ?? "medium"],
        workloadLabel: WORKLOAD_LABELS[relatedReviews[0]?.workload ?? "medium"],
        isLightWorkload:
          relatedReviews.filter((review) => review.workload === "light").length >=
          Math.ceil(Math.max(relatedReviews.length, 1) / 2),
        isFlexibleAttendance:
          relatedReviews.filter((review) => review.attendance === "flexible").length >=
          Math.ceil(Math.max(relatedReviews.length, 1) / 2),
        hasNoTeamProject: relatedReviews.every((review) => !review.teamProject),
        isGenerousGrading:
          relatedReviews.filter((review) => review.gradingStyle === "generous").length >=
          Math.ceil(Math.max(relatedReviews.length, 1) / 2),
      };
    })
    .sort(
      (a, b) =>
        b.averageHoneyScore - a.averageHoneyScore || b.reviewCount - a.reviewCount,
    );
}

export function getLectureById(id: string) {
  return getState().lectures.find((lecture) => lecture.id === id);
}

export function getLectures() {
  return getState().lectures;
}

export function getLectureReviews(lectureId: string) {
  return [...getState().lectureReviews]
    .filter((review) => review.lectureId === lectureId && !isHiddenReview(review))
    .sort(
      (a, b) =>
        getModerationSemesterRank(b.semester) -
          getModerationSemesterRank(a.semester) ||
        +new Date(b.createdAt) - +new Date(a.createdAt),
    );
}

export function getTradePosts() {
  return recentFirst(getState().tradePosts.filter((post) => !isHiddenTradePost(post)));
}

export function getTradeStatusLabel(status: TradePost["status"]) {
  return TRADE_STATUS_LABELS[status];
}

export function getTradeMatchCandidates(postId: string) {
  const visiblePosts = getTradePosts();
  const target = visiblePosts.find((post) => post.id === postId);

  if (!target) return [];

  return visiblePosts.filter(
    (post) =>
      post.id !== postId &&
      post.haveLectureId === target.wantLectureId &&
      post.wantLectureId === target.haveLectureId,
  );
}

function getMatchStrength(count: number): MatchStrength {
  if (count >= 2) return "high";
  if (count === 1) return "medium";
  return "low";
}

export function getTradeMatchInsight(postId: string) {
  const { tradePosts } = getState();
  const target = tradePosts.find((post) => post.id === postId);

  if (!target) {
    return {
      postId,
      count: 0,
      strength: "low" as MatchStrength,
      label: MATCH_STRENGTH_LABELS.low,
    };
  }

  const count = tradePosts.filter(
    (post) =>
      post.id !== postId &&
      post.haveLectureId === target.wantLectureId &&
      post.wantLectureId === target.haveLectureId,
  ).length;

  const strength = getMatchStrength(count);

  return {
    postId,
    count,
    strength,
    label: MATCH_STRENGTH_LABELS[strength],
  };
}

export function getNotifications(userId = currentUser.id) {
  return [...recentFirst(
    getState().notifications.filter((notification) => notification.userId === userId),
  )].sort(
    (a, b) =>
      Number(a.isRead) - Number(b.isRead) ||
      +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function getReports() {
  return recentFirst(getState().reports);
}

export function getBlocks(userId = currentUser.id) {
  return getState().blocks.filter((block) => block.blockerId === userId);
}

export function getHomeSections() {
  const mixedDating = popularFirst([...getDatingPosts("meeting"), ...getDatingPosts("dating")]);

  return {
    admission: getAdmissionQuestions().slice(0, 4),
    lectures: getLectureSummaries().slice(0, 4),
    trade: getTradePosts().slice(0, 3),
    community: getCommunityPosts()
      .filter((post) => post.subcategory === "club" || post.subcategory === "meetup")
      .slice(0, 4),
    hot: [],
    dating: mixedDating.slice(0, 4),
  };
}

export function getDashboardStats(viewer: User = currentUser) {
  const verificationBadge = getStudentVerificationBadge(viewer);
  const userLevel = getUserLevel(viewer.trustScore);

  return [
    {
      label: "학교 인증",
      value: verificationBadge.shortLabel,
      tone: verificationBadge.tone,
    },
    { label: "현재 등급", value: `${userLevel.icon} ${userLevel.label}`, tone: "neutral" },
    {
      label: "읽지 않은 알림",
      value: `${getNotifications(viewer.id).filter((item) => !item.isRead).length}건`,
      tone: "primary",
    },
  ] as const;
}

export function getSchoolHotPosts(schoolId = currentUser.schoolId) {
  return popularFirst(
    getState().posts.filter(
      (post) =>
        post.schoolId === schoolId &&
        !getCareerBoardKind(post) &&
        !isHiddenPost(post) &&
        post.subcategory !== "hot" &&
        post.likes >= 40,
    ),
  ).slice(0, 4);
}

export function getRealtimeSchoolFeed(schoolId = currentUser.schoolId) {
  return recentFirst(
    getState().posts.filter(
      (post) => post.schoolId === schoolId && !getCareerBoardKind(post) && !isHiddenPost(post),
    ),
  ).slice(0, 5);
}

export function getHomeRecommendations() {
  const topLecture = getLectureSummaries()[0];
  const topCommunity = getCommunityPosts().find(
    (post) => post.subcategory === "club" || post.subcategory === "meetup",
  );
  const topDating = getDatingPosts("meeting")[0] ?? getDatingPosts("dating")[0];

  return [
    {
      title: topLecture ? `${topLecture.courseName} 리뷰 몰리는 중` : "강의평 추천",
      body: topLecture
        ? `${topLecture.professor} · 리뷰 ${topLecture.reviewCount}개`
        : "지금 많이 보는 강의를 확인해보세요.",
      href: topLecture ? `/lectures/${topLecture.id}` : "/lectures",
      badge: "추천 강의",
    },
    {
      title: topCommunity ? topCommunity.title : "오늘의 커뮤니티 추천",
      body: topCommunity
        ? topCommunity.content
        : "건대 주변 커뮤니티 글을 확인해보세요.",
      href: "/community",
      badge: "추천 커뮤니티",
    },
    {
      title: topDating ? topDating.title : "안전한 만남 가이드",
      body: topDating
        ? topDating.content
        : "학교 인증 기반으로 안전하게 둘러보세요.",
      href: "/dating",
      badge: "추천 관계",
    },
  ] as const;
}

export function getHomeCategoryStats() {
  const { lectureReviews } = getState();

  return [
    {
      label: "입시 질문",
      value: `${getAdmissionQuestions().length}개`,
      description: "입시생 유입 허브",
      href: "/school?tab=admission",
    },
    {
      label: "강의평",
      value: `${lectureReviews.length}개`,
      description: "구조화 리뷰 기반 탐색",
      href: "/lectures",
    },
    {
      label: "커뮤니티",
      value: `${getCommunityPosts().length + getCareerPosts().length}개`,
      description: "자유, 고민, 핫갤, 무물, 취업",
      href: "/community",
    },
    {
      label: "매칭 글",
      value: `${getTradePosts().length}개`,
      description: "수강신청 시즌 킬러 기능",
      href: "/trade",
    },
  ] as const;
}

export function getUserPosts(userId = currentUser.id) {
  return recentFirst(
    getState().posts.filter((post) => post.authorId === userId && !isHiddenPost(post)),
  );
}

export function getUserComments(userId = currentUser.id) {
  return recentFirst(
    getState().comments.filter((comment) => comment.authorId === userId && !isHiddenComment(comment)),
  );
}

export function getUserLectureReviews(userId = currentUser.id) {
  return recentFirst(
    getState().lectureReviews.filter((review) => review.reviewerId === userId && !isHiddenReview(review)),
  );
}

export function getUserTradePosts(userId = currentUser.id) {
  return recentFirst(
    getState().tradePosts.filter((post) => post.userId === userId && !isHiddenTradePost(post)),
  );
}

export function getPostById(postId: string) {
  const post = getState().posts.find((item) => item.id === postId);
  if (!post || isHiddenPost(post)) return undefined;
  return post;
}

export function getLectureTitle(lectureId: string) {
  return getLectureById(lectureId)?.courseName ?? lectureId;
}

export function getHomeHighlights() {
  return [
    {
      title: `${getSchoolShortName(getSchoolName(currentUser.schoolId))} 입시 질문 급상승`,
      body: `${getAdmissionQuestions()[0]?.title ?? "새 질문이 곧 올라옵니다."}`,
      badge: "입시",
    },
    {
      title: `${getSchoolShortName(getSchoolName(currentUser.schoolId))} 강의평 많이 본 강의`,
      body: `${getLectureSummaries()[0]?.courseName ?? "인기 강의 집계 중"} · 리뷰 ${getLectureSummaries()[0]?.reviewCount ?? 0}개`,
      badge: "강의평",
    },
    {
      title: `${getSchoolShortName(getSchoolName(currentUser.schoolId))} 매칭 속도 빠른 조합`,
      body: `${
        getTradePosts()[0]
          ? `${getLectureTitle(getTradePosts()[0].haveLectureId)} ↔ ${getLectureTitle(getTradePosts()[0].wantLectureId)}`
          : "대기 중"
      }`,
      badge: "수강신청",
    },
  ] as const;
}

export function getAdminSummary() {
  const allReports = getReports();
  const hiddenContent = getAutoHiddenContent();
  const lowTrustUsers = getLowTrustUsers();

  return {
    total: allReports.length,
    pending: allReports.filter((item) => item.status === "pending").length,
    reviewing: allReports.filter((item) => item.status === "reviewing").length,
    confirmed: allReports.filter((item) => item.status === "confirmed").length,
    dismissed: allReports.filter((item) => item.status === "dismissed").length,
    posts: allReports.filter((item) => item.targetType === "post").length,
    users: allReports.filter((item) => item.targetType === "user").length,
    autoHidden: hiddenContent.length,
    lowTrust: lowTrustUsers.length,
  };
}

export function getHiddenContentNoticeCount(target: "post" | "comment" | "review" | "dating_profile") {
  if (target === "post") {
    return getState().posts.filter((post) => isHiddenPost(post)).length;
  }
  if (target === "comment") {
    return getState().comments.filter((comment) => isHiddenComment(comment)).length;
  }
  if (target === "review") {
    return getState().lectureReviews.filter((review) => isHiddenReview(review)).length;
  }
  return getState().datingProfiles.filter((profile) => isHiddenDatingProfile(profile)).length;
}

export function getHiddenPostCountByCategory(
  category: Post["category"] | Post["category"][],
) {
  const categories = Array.isArray(category) ? category : [category];

  return getState().posts.filter(
    (post) => categories.includes(post.category) && isHiddenPost(post),
  ).length;
}

export function getHiddenTradePostCount() {
  return getState().tradePosts.filter((post) => isHiddenTradePost(post)).length;
}

export function getHiddenDatingProfileCount() {
  return getState().datingProfiles.filter((profile) => isHiddenDatingProfile(profile)).length;
}

export function getBlockedContentCount() {
  const blockedIds = new Set(getBlocks().map((block) => block.blockedUserId));

  return (
    getState().posts.filter((post) => blockedIds.has(post.authorId)).length +
    getState().comments.filter((comment) => blockedIds.has(comment.authorId)).length +
    getState().lectureReviews.filter((review) => blockedIds.has(review.reviewerId)).length +
    getState().datingProfiles.filter((profile) => blockedIds.has(profile.userId)).length
  );
}

export function getAutoHiddenContent() {
  const posts = getState().posts
    .filter((post) => isHiddenPost(post))
    .map((post) => ({
      targetType: "post" as const,
      id: post.id,
      title: post.title,
      reportCount: post.reportCount ?? getReportCount("post", post.id),
      authorId: post.authorId,
    }));
  const comments = getState().comments
    .filter((comment) => isHiddenComment(comment))
    .map((comment) => ({
      targetType: "comment" as const,
      id: comment.id,
      title: comment.content,
      reportCount: comment.reportCount ?? getReportCount("comment", comment.id),
      authorId: comment.authorId,
    }));
  const reviews = getState().lectureReviews
    .filter((review) => isHiddenReview(review))
    .map((review) => ({
      targetType: "review" as const,
      id: review.id,
      title: review.shortComment,
      reportCount: review.reportCount ?? getReportCount("review", review.id),
      authorId: review.reviewerId,
    }));
  const profiles = getState().datingProfiles
    .filter((profile) => isHiddenDatingProfile(profile))
    .map((profile) => ({
      targetType: "profile" as const,
      id: profile.id,
      title: `${getAnonymousHandle(profile.userId)} 프로필`,
      reportCount: profile.reportCount ?? getReportCount("profile", profile.id),
      authorId: profile.userId,
    }));

  return [...posts, ...comments, ...reviews, ...profiles].sort(
    (a, b) => b.reportCount - a.reportCount,
  );
}

export function getReportedUsersForAdmin() {
  return recentFirst(
    getState()
      .users
      .map((user) => ({
        ...user,
        reportCount: user.reportCount ?? getUserReportCount(user.id),
      }))
      .filter((user) => (user.reportCount ?? 0) > 0)
      .sort(
        (a, b) =>
          (b.reportCount ?? 0) - (a.reportCount ?? 0) ||
          a.trustScore - b.trustScore,
      ),
  );
}

export function getLowTrustUsers() {
  return [...getState().users]
    .filter((user) => user.trustScore <= LOW_TRUST_THRESHOLD)
    .sort((a, b) => a.trustScore - b.trustScore);
}

export function getReportTargetLabel(targetType: ReportTargetType, targetId: string) {
  if (targetType === "post") {
    return getPostById(targetId)?.title ?? `게시글 ${targetId}`;
  }
  if (targetType === "comment") {
    return getState().comments.find((comment) => comment.id === targetId)?.content ?? `댓글 ${targetId}`;
  }
  if (targetType === "review") {
    return getState().lectureReviews.find((review) => review.id === targetId)?.shortComment ?? `강의평 ${targetId}`;
  }
  if (targetType === "profile") {
    const profile = getState().datingProfiles.find((item) => item.id === targetId);
    return profile ? `${getAnonymousHandle(profile.userId)} 프로필` : `프로필 ${targetId}`;
  }
  return getUser(targetId) ? getAnonymousHandle(targetId) : `익명 사용자 ${targetId}`;
}

export function getReportTargetUserId(targetType: ReportTargetType, targetId: string) {
  return resolveReportTargetUserId(getState(), targetType, targetId);
}
