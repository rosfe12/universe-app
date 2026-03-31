import type { AppRuntimeSnapshot } from "@/types";

export const guestUser = {
  id: "guest-user",
  email: "guest@univers.app",
  name: "게스트",
  nickname: "게스트",
  userType: "student",
  schoolId: "school-konkuk",
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

const baseRuntimeSnapshot: AppRuntimeSnapshot = {
  schools: [],
  users: [],
  posts: [],
  comments: [],
  lectures: [],
  lectureReviews: [],
  tradePosts: [],
  notifications: [],
  reports: [],
  blocks: [],
  datingProfiles: [],
  mediaAssets: [],
  currentUser: guestUser,
  source: "mock",
  isAuthenticated: false,
  runtimeScope: "full",
  setupStatus: "demo",
  setupIssue: undefined,
};

let runtimeSnapshot: AppRuntimeSnapshot = baseRuntimeSnapshot;

export function getRuntimeSnapshot() {
  return runtimeSnapshot;
}

export function getMockRuntimeSnapshot(): AppRuntimeSnapshot {
  return {
    ...baseRuntimeSnapshot,
    schools: [],
    users: [],
    posts: [],
    comments: [],
    lectures: [],
    lectureReviews: [],
    tradePosts: [],
    notifications: [],
    reports: [],
    blocks: [],
    datingProfiles: [],
    mediaAssets: [],
  };
}

export function setRuntimeSnapshot(nextSnapshot: AppRuntimeSnapshot) {
  if (runtimeSnapshot === nextSnapshot) {
    return;
  }

  runtimeSnapshot = nextSnapshot;
}

export function resetRuntimeSnapshot() {
  runtimeSnapshot = getMockRuntimeSnapshot();
}
