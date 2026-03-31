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
import { guestUser } from "@/lib/runtime-state";
import type { AppRuntimeSnapshot } from "@/types";

export function getMockRuntimeSnapshot(): AppRuntimeSnapshot {
  return {
    schools: [...schools],
    users: [...users],
    posts: [...posts],
    comments: [...comments],
    lectures: [...lectures],
    lectureReviews: [...lectureReviews],
    tradePosts: [...tradePosts],
    notifications: [...notifications],
    reports: [...reports],
    blocks: [...blocks],
    datingProfiles: [...datingProfiles],
    mediaAssets: [...mediaAssets],
    currentUser: guestUser,
    source: "mock",
    isAuthenticated: false,
    runtimeScope: "full",
    setupStatus: "demo",
    setupIssue: undefined,
  };
}
