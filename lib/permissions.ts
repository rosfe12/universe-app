import type { User } from "@/types";

function isSignedInUser(user: User) {
  return user.id !== "guest-user";
}

export function canWriteAdmissionQuestion() {
  return true;
}

export function canWriteAdmissionAnswer(user: User) {
  return isSignedInUser(user);
}

export function canWriteLectureReview(user: User) {
  return isSignedInUser(user);
}

export function canAccessTrade() {
  return true;
}

export function canAccessDating() {
  return true;
}

export function canWriteCommunity(user: User) {
  return isSignedInUser(user);
}
