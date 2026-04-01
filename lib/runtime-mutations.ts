import { clampTrustScore } from "@/lib/user-identity";
import {
  canSubmitReport,
  getActiveReportCount,
  getPositiveTrustGain,
  resolveReportTargetUserId,
  shouldAutoHide,
  USER_RESTRICTION_WARNING_THRESHOLD,
} from "@/lib/moderation";
import type {
  AppRuntimeSnapshot,
  Block,
  Comment,
  LectureReview,
  Post,
  Report,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  TradePost,
} from "@/types";

function updateUserTrust(
  snapshot: AppRuntimeSnapshot,
  userId: string,
  delta: number,
) {
  if (!delta) return snapshot;

  return {
    ...snapshot,
    users: snapshot.users.map((user) =>
      user.id === userId
        ? { ...user, trustScore: clampTrustScore(user.trustScore + delta) }
        : user,
    ),
    currentUser:
      snapshot.currentUser.id === userId
        ? {
            ...snapshot.currentUser,
            trustScore: clampTrustScore(snapshot.currentUser.trustScore + delta),
          }
        : snapshot.currentUser,
  };
}

function updateUserWarnings(
  snapshot: AppRuntimeSnapshot,
  userId: string,
  delta: number,
) {
  return {
    ...snapshot,
    users: snapshot.users.map((user) => {
      if (user.id !== userId) return user;
      const warningCount = Math.max(0, (user.warningCount ?? 0) + delta);
      return {
        ...user,
        warningCount,
        isRestricted:
          Boolean(user.isRestricted) ||
          warningCount >= USER_RESTRICTION_WARNING_THRESHOLD,
      };
    }),
    currentUser:
      snapshot.currentUser.id === userId
        ? {
            ...snapshot.currentUser,
            warningCount: Math.max(0, (snapshot.currentUser.warningCount ?? 0) + delta),
            isRestricted:
              Boolean(snapshot.currentUser.isRestricted) ||
              Math.max(0, (snapshot.currentUser.warningCount ?? 0) + delta) >=
                USER_RESTRICTION_WARNING_THRESHOLD,
          }
        : snapshot.currentUser,
  };
}

export function deriveModerationSnapshot(snapshot: AppRuntimeSnapshot) {
  const activeReports = snapshot.reports.filter((report) => report.status !== "dismissed");

  const users = snapshot.users.map((user) => {
    const reportCount = activeReports.filter((report) => {
      const targetUserId = resolveReportTargetUserId(
        snapshot,
        report.targetType,
        report.targetId,
      );

      return targetUserId === user.id;
    }).length;

    return {
      ...user,
      reportCount,
      warningCount: user.warningCount ?? 0,
      isRestricted:
        Boolean(user.isRestricted) ||
        (user.warningCount ?? 0) >= USER_RESTRICTION_WARNING_THRESHOLD ||
        reportCount >= 6,
    };
  });

  const posts = snapshot.posts.map((post) => {
    const reportCount = getActiveReportCount(activeReports, "post", post.id);
    return {
      ...post,
      reportCount,
      autoHidden: Boolean(post.adminHidden) || shouldAutoHide(reportCount),
    };
  });

  const comments = snapshot.comments.map((comment) => {
    const reportCount = getActiveReportCount(activeReports, "comment", comment.id);
    return {
      ...comment,
      reportCount,
      autoHidden: Boolean(comment.adminHidden) || shouldAutoHide(reportCount),
    };
  });

  const lectureReviews = snapshot.lectureReviews.map((review) => {
    const reportCount = getActiveReportCount(activeReports, "review", review.id);
    return {
      ...review,
      reportCount,
      autoHidden: Boolean(review.adminHidden) || shouldAutoHide(reportCount),
    };
  });

  const tradePosts = snapshot.tradePosts.map((tradePost) => {
    const reportCount = activeReports.filter((report) => {
      const targetUserId = resolveReportTargetUserId(
        snapshot,
        report.targetType,
        report.targetId,
      );
      return targetUserId === tradePost.userId;
    }).length;

    return {
      ...tradePost,
      reportCount,
      autoHidden: shouldAutoHide(reportCount),
    };
  });

  const datingProfiles = snapshot.datingProfiles.map((profile) => {
    const reportCount = activeReports.filter((report) => {
      const targetUserId = resolveReportTargetUserId(
        snapshot,
        report.targetType,
        report.targetId,
      );
      return targetUserId === profile.userId;
    }).length;

    return {
      ...profile,
      reportCount,
      autoHidden: Boolean(profile.adminHidden) || shouldAutoHide(reportCount),
    };
  });

  const matchedCurrentUser = users.find((user) => user.id === snapshot.currentUser.id);
  const currentUser = matchedCurrentUser
    ? {
        ...matchedCurrentUser,
        ...snapshot.currentUser,
        trustScore: matchedCurrentUser.trustScore,
        reportCount: matchedCurrentUser.reportCount,
        warningCount: matchedCurrentUser.warningCount,
        isRestricted: matchedCurrentUser.isRestricted,
        profileBio: matchedCurrentUser.profileBio ?? snapshot.currentUser.profileBio,
        profileInterests: matchedCurrentUser.profileInterests ?? snapshot.currentUser.profileInterests,
        profilePrimaryImageUrl:
          matchedCurrentUser.profilePrimaryImageUrl ?? snapshot.currentUser.profilePrimaryImageUrl,
      }
    : snapshot.currentUser;

  return {
    ...snapshot,
    users,
    posts,
    comments,
    lectureReviews,
    tradePosts,
    datingProfiles,
    currentUser,
  };
}

export function addPostToSnapshot(snapshot: AppRuntimeSnapshot, post: Post) {
  const gain = getPositiveTrustGain(snapshot, post.authorId, post.createdAt, "post");
  const withPost = {
    ...snapshot,
    posts: [post, ...snapshot.posts],
  };

  return deriveModerationSnapshot(updateUserTrust(withPost, post.authorId, gain));
}

export function addCommentToSnapshot(snapshot: AppRuntimeSnapshot, comment: Comment) {
  const gain = getPositiveTrustGain(snapshot, comment.authorId, comment.createdAt, "comment");
  const withComment = {
    ...snapshot,
    comments: [...snapshot.comments, comment],
    posts: snapshot.posts.map((post) =>
      post.id === comment.postId ? { ...post, commentCount: post.commentCount + 1 } : post,
    ),
  };

  return deriveModerationSnapshot(updateUserTrust(withComment, comment.authorId, gain));
}

export function incrementPostViewInSnapshot(
  snapshot: AppRuntimeSnapshot,
  postId: string,
) {
  return {
    ...snapshot,
    posts: snapshot.posts.map((post) =>
      post.id === postId
        ? {
            ...post,
            viewCount: (post.viewCount ?? 0) + 1,
          }
        : post,
    ),
  };
}

export function removePostFromSnapshot(snapshot: AppRuntimeSnapshot, postId: string) {
  const nextComments = snapshot.comments.filter((comment) => comment.postId !== postId);

  return deriveModerationSnapshot({
    ...snapshot,
    posts: snapshot.posts.filter((post) => post.id !== postId),
    comments: nextComments,
    reports: snapshot.reports.filter(
      (report) =>
        !(
          (report.targetType === "post" && report.targetId === postId) ||
          (report.targetType === "comment" &&
            snapshot.comments.some(
              (comment) => comment.id === report.targetId && comment.postId === postId,
            ))
        ),
    ),
  });
}

export function removeCommentFromSnapshot(snapshot: AppRuntimeSnapshot, commentId: string) {
  const targetComment = snapshot.comments.find((comment) => comment.id === commentId);
  if (!targetComment) {
    return snapshot;
  }

  return deriveModerationSnapshot({
    ...snapshot,
    comments: snapshot.comments.filter((comment) => comment.id !== commentId),
    posts: snapshot.posts.map((post) =>
      post.id === targetComment.postId
        ? { ...post, commentCount: Math.max(0, post.commentCount - 1) }
        : post,
    ),
    reports: snapshot.reports.filter(
      (report) => !(report.targetType === "comment" && report.targetId === commentId),
    ),
  });
}

export function addLectureReviewToSnapshot(
  snapshot: AppRuntimeSnapshot,
  review: LectureReview,
) {
  const gain = getPositiveTrustGain(
    snapshot,
    review.reviewerId,
    review.createdAt,
    "lectureReview",
  );
  const withReview = {
    ...snapshot,
    lectureReviews: [review, ...snapshot.lectureReviews],
  };

  return deriveModerationSnapshot(updateUserTrust(withReview, review.reviewerId, gain));
}

export function addTradePostToSnapshot(snapshot: AppRuntimeSnapshot, tradePost: TradePost) {
  const gain = getPositiveTrustGain(snapshot, tradePost.userId, tradePost.createdAt, "post");
  const withTradePost = {
    ...snapshot,
    tradePosts: [tradePost, ...snapshot.tradePosts],
  };

  return deriveModerationSnapshot(updateUserTrust(withTradePost, tradePost.userId, gain));
}

export function acceptCommentInSnapshot(
  snapshot: AppRuntimeSnapshot,
  postId: string,
  commentId: string,
) {
  const targetComment = snapshot.comments.find((item) => item.id === commentId);
  const nextSnapshot = {
    ...snapshot,
    comments: snapshot.comments.map((item) => ({
      ...item,
      accepted: item.postId === postId ? item.id === commentId : item.accepted,
    })),
  };

  if (!targetComment || targetComment.accepted) {
    return deriveModerationSnapshot(nextSnapshot);
  }

  const gain = getPositiveTrustGain(
    snapshot,
    targetComment.authorId,
    targetComment.createdAt,
    "acceptedAnswer",
  );

  return deriveModerationSnapshot(updateUserTrust(nextSnapshot, targetComment.authorId, gain));
}

export function addReportToSnapshot(
  snapshot: AppRuntimeSnapshot,
  input: {
    targetType: ReportTargetType;
    targetId: string;
    reporterId: string;
    reason: ReportReason;
    memo?: string;
  },
) {
  if (!canSubmitReport(snapshot, input.reporterId, input.targetType, input.targetId)) {
    return snapshot;
  }

  const report: Report = {
    id: `report-local-${snapshot.reports.length + 1}`,
    reporterId: input.reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    memo: input.memo,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  return deriveModerationSnapshot({
    ...snapshot,
    reports: [report, ...snapshot.reports],
  });
}

export function addBlockToSnapshot(
  snapshot: AppRuntimeSnapshot,
  input: { blockerId: string; blockedUserId: string },
) {
  const exists = snapshot.blocks.some(
    (block) =>
      block.blockerId === input.blockerId && block.blockedUserId === input.blockedUserId,
  );

  if (exists) {
    return snapshot;
  }

  const block: Block = {
    id: `block-local-${snapshot.blocks.length + 1}`,
    blockerId: input.blockerId,
    blockedUserId: input.blockedUserId,
    createdAt: new Date().toISOString(),
  };

  return deriveModerationSnapshot({
    ...snapshot,
    blocks: [block, ...snapshot.blocks],
  });
}

export function updateReportStatusInSnapshot(
  snapshot: AppRuntimeSnapshot,
  reportId: string,
  status: ReportStatus,
) {
  const targetReport = snapshot.reports.find((report) => report.id === reportId);
  if (!targetReport || targetReport.status === status) {
    return snapshot;
  }

  let nextSnapshot: AppRuntimeSnapshot = {
    ...snapshot,
    reports: snapshot.reports.map((report) =>
      report.id === reportId ? { ...report, status } : report,
    ),
  };

  if (status === "confirmed" && targetReport.status !== "confirmed") {
    const alreadyConfirmed = snapshot.reports.some(
      (report) =>
        report.id !== reportId &&
        report.targetType === targetReport.targetType &&
        report.targetId === targetReport.targetId &&
        report.status === "confirmed",
    );
    const targetUserId = resolveReportTargetUserId(
      snapshot,
      targetReport.targetType,
      targetReport.targetId,
    );

    if (!alreadyConfirmed && targetUserId) {
      nextSnapshot = updateUserTrust(nextSnapshot, targetUserId, -10);
    }
  }

  if (status === "dismissed" && targetReport.status !== "dismissed") {
    nextSnapshot = updateUserWarnings(nextSnapshot, targetReport.reporterId, 1);
  }

  return deriveModerationSnapshot(nextSnapshot);
}

export function dismissReportsForTargetInSnapshot(
  snapshot: AppRuntimeSnapshot,
  targetType: ReportTargetType,
  targetId: string,
) {
  return snapshot.reports
    .filter(
      (report) =>
        report.targetType === targetType &&
        report.targetId === targetId &&
        report.status !== "dismissed",
    )
    .reduce(
      (currentSnapshot, report) =>
        updateReportStatusInSnapshot(currentSnapshot, report.id, "dismissed"),
      snapshot,
    );
}

export function confirmReportsForTargetInSnapshot(
  snapshot: AppRuntimeSnapshot,
  targetType: ReportTargetType,
  targetId: string,
) {
  return snapshot.reports
    .filter(
      (report) =>
        report.targetType === targetType &&
        report.targetId === targetId &&
        report.status !== "confirmed",
    )
    .reduce(
      (currentSnapshot, report) =>
        updateReportStatusInSnapshot(currentSnapshot, report.id, "confirmed"),
      snapshot,
    );
}

export function hideContentInSnapshot(
  snapshot: AppRuntimeSnapshot,
  targetType: Exclude<ReportTargetType, "user">,
  targetId: string,
) {
  return deriveModerationSnapshot({
    ...snapshot,
    posts:
      targetType === "post"
        ? snapshot.posts.map((post) =>
            post.id === targetId ? { ...post, adminHidden: true, autoHidden: true } : post,
          )
        : snapshot.posts,
    comments:
      targetType === "comment"
        ? snapshot.comments.map((comment) =>
            comment.id === targetId
              ? { ...comment, adminHidden: true, autoHidden: true }
              : comment,
          )
        : snapshot.comments,
    lectureReviews:
      targetType === "review"
        ? snapshot.lectureReviews.map((review) =>
            review.id === targetId
              ? { ...review, adminHidden: true, autoHidden: true }
              : review,
          )
        : snapshot.lectureReviews,
    datingProfiles:
      targetType === "profile"
        ? snapshot.datingProfiles.map((profile) =>
            profile.id === targetId
              ? { ...profile, adminHidden: true, autoHidden: true }
              : profile,
          )
        : snapshot.datingProfiles,
  });
}

export function restoreContentInSnapshot(
  snapshot: AppRuntimeSnapshot,
  targetType: Exclude<ReportTargetType, "user">,
  targetId: string,
) {
  return deriveModerationSnapshot({
    ...snapshot,
    posts:
      targetType === "post"
        ? snapshot.posts.map((post) =>
            post.id === targetId ? { ...post, adminHidden: false } : post,
          )
        : snapshot.posts,
    comments:
      targetType === "comment"
        ? snapshot.comments.map((comment) =>
            comment.id === targetId ? { ...comment, adminHidden: false } : comment,
          )
        : snapshot.comments,
    lectureReviews:
      targetType === "review"
        ? snapshot.lectureReviews.map((review) =>
            review.id === targetId ? { ...review, adminHidden: false } : review,
          )
        : snapshot.lectureReviews,
    datingProfiles:
      targetType === "profile"
        ? snapshot.datingProfiles.map((profile) =>
            profile.id === targetId ? { ...profile, adminHidden: false } : profile,
          )
        : snapshot.datingProfiles,
  });
}

export function warnUserInSnapshot(snapshot: AppRuntimeSnapshot, userId: string) {
  return deriveModerationSnapshot(updateUserWarnings(snapshot, userId, 1));
}
