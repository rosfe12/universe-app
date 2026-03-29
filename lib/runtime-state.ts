import {
  blocks,
  comments,
  datingProfiles,
  lectureReviews,
  lectures,
  mediaAssets,
  notifications,
  posts,
  reports,
  schools,
  tradePosts,
  users,
} from "@/data/mock";
import type { AppRuntimeSnapshot } from "@/types";

export const guestUser = {
  id: "guest-user",
  email: "guest@univers.app",
  name: "게스트",
  nickname: "게스트",
  userType: "student",
  schoolId: schools[0]?.id,
  department: undefined,
  grade: undefined,
  verified: false,
  adultVerified: false,
  adultVerifiedAt: undefined,
  studentVerificationStatus: "none",
  trustScore: 0,
  reportCount: 0,
  warningCount: 0,
  isRestricted: false,
  defaultVisibilityLevel: "school",
  createdAt: new Date("2026-03-01T00:00:00+09:00").toISOString(),
  bio: undefined,
  avatarUrl: undefined,
} satisfies AppRuntimeSnapshot["currentUser"];

const baseMockRuntimeSnapshot: AppRuntimeSnapshot = {
  schools,
  users,
  posts,
  comments,
  lectures,
  lectureReviews,
  tradePosts,
  notifications,
  reports,
  blocks,
  datingProfiles,
  mediaAssets,
  currentUser: guestUser,
  source: "mock",
  isAuthenticated: false,
  runtimeScope: "full",
  setupStatus: "demo",
  setupIssue: undefined,
};

let runtimeSnapshot: AppRuntimeSnapshot = baseMockRuntimeSnapshot;

export function getRuntimeSnapshot() {
  return runtimeSnapshot;
}

export function getMockRuntimeSnapshot(): AppRuntimeSnapshot {
  return {
    ...baseMockRuntimeSnapshot,
    schools: [...baseMockRuntimeSnapshot.schools],
    users: [...baseMockRuntimeSnapshot.users],
    posts: [...baseMockRuntimeSnapshot.posts],
    comments: [...baseMockRuntimeSnapshot.comments],
    lectures: [...baseMockRuntimeSnapshot.lectures],
    lectureReviews: [...baseMockRuntimeSnapshot.lectureReviews],
    tradePosts: [...baseMockRuntimeSnapshot.tradePosts],
    notifications: [...baseMockRuntimeSnapshot.notifications],
    reports: [...baseMockRuntimeSnapshot.reports],
    blocks: [...baseMockRuntimeSnapshot.blocks],
    datingProfiles: [...baseMockRuntimeSnapshot.datingProfiles],
    mediaAssets: [...baseMockRuntimeSnapshot.mediaAssets],
  };
}

export function setRuntimeSnapshot(nextSnapshot: AppRuntimeSnapshot) {
  runtimeSnapshot = nextSnapshot;
}

export function resetRuntimeSnapshot() {
  runtimeSnapshot = getMockRuntimeSnapshot();
}
