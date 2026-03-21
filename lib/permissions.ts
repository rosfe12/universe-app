import type { User } from "@/types";
import { isVerifiedStudent } from "@/lib/user-identity";

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
  return isVerifiedStudent(user);
}

export function canAccessSchoolFeatures(user: User) {
  return isSignedInUser(user) && (user.userType === "college" || user.userType === "freshman");
}

export function canAccessTrade(user: User) {
  return isVerifiedStudent(user);
}

export function canAccessDating(user: User) {
  return isVerifiedStudent(user);
}

export function canWriteCommunity(user: User) {
  return isSignedInUser(user) && user.userType === "college";
}

export function canWriteFreshmanZone(user: User) {
  return isSignedInUser(user) && user.userType === "freshman" && Boolean(user.schoolId);
}
