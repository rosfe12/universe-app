import type { User } from "@/types";
import { isReliabilityRestricted, isVerifiedStudent } from "@/lib/user-identity";

function isSignedInUser(user: User) {
  return user.id !== "guest-user";
}

function canParticipate(user: User) {
  return isSignedInUser(user) && !isReliabilityRestricted(user.trustScore);
}

export function canWriteAdmissionQuestion(user: User) {
  return canParticipate(user) && isVerifiedStudent(user);
}

export function canWriteAdmissionAnswer(user: User) {
  return canParticipate(user) && isVerifiedStudent(user);
}

export function canWriteLectureReview(user: User) {
  return canParticipate(user) && isVerifiedStudent(user);
}

export function canAccessSchoolFeatures(user: User) {
  return isSignedInUser(user) && (user.userType === "student" || user.userType === "freshman");
}

export function canAccessTrade(user: User) {
  return canParticipate(user) && isVerifiedStudent(user);
}

export function canAccessDating(user: User) {
  return canParticipate(user) && isVerifiedStudent(user);
}

export function canWriteCommunity(user: User) {
  return canParticipate(user) && isVerifiedStudent(user);
}

export function canWriteFreshmanZone(user: User) {
  return canParticipate(user) && user.userType === "freshman" && Boolean(user.schoolId);
}

export function canCommentFreshmanZone(user: User) {
  return canParticipate(user) && isVerifiedStudent(user);
}

export function canWriteCareer(user: User) {
  return canParticipate(user) && isVerifiedStudent(user);
}
