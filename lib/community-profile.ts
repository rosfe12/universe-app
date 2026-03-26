import { z } from "zod";

import type { ProfileVisibility, User, VerificationState } from "@/types";

export const PROFILE_IMAGE_BUCKET = "profile-images";
export const MAX_PROFILE_IMAGES = 3;
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const COMMUNITY_PROFILE_RESTRICTION_MESSAGE =
  "프로필 기능은 학생 인증 완료 후 사용할 수 있어요.";
export const COMMUNITY_PROFILE_SAME_SCHOOL_ONLY_MESSAGE =
  "이 프로필은 같은 학교 학생에게만 공개돼요.";
export const COMMUNITY_PROFILE_BLOCKED_MESSAGE =
  "차단 관계에서는 프로필을 볼 수 없어요.";

export const communityProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(24),
  bio: z.string().trim().max(160).optional().or(z.literal("")),
  interests: z.array(z.string().trim().min(1).max(20)).max(10),
  profileVisibility: z.enum(["university_only", "same_school_only"]).default("university_only"),
  showDepartment: z.boolean().default(false),
  showAdmissionYear: z.boolean().default(false),
});

export const profileReportSchema = z.object({
  reason: z.string().trim().min(1).max(60),
  detail: z.string().trim().max(500).optional().or(z.literal("")),
});

function normalizeImageExtension(file: File) {
  const extensionFromType = file.type.split("/")[1];
  const extensionFromName = file.name.split(".").pop();
  return (extensionFromName || extensionFromType || "jpg")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function normalizeSignal(value: string) {
  return value.trim().toLowerCase();
}

async function getImageSignalText(file: File) {
  return normalizeSignal(file.name);
}

export function buildCommunityProfileImagePath(userId: string, file: File) {
  return `${userId}/${crypto.randomUUID()}.${normalizeImageExtension(file)}`;
}

export function validateCommunityProfileImageFile(file: File) {
  if (!file) {
    throw new Error("이미지 파일을 선택해주세요.");
  }

  if (!PROFILE_IMAGE_ALLOWED_TYPES.includes(file.type as (typeof PROFILE_IMAGE_ALLOWED_TYPES)[number])) {
    throw new Error("JPG, PNG, WEBP 파일만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("프로필 사진은 5MB 이하만 업로드할 수 있습니다.");
  }
}

export async function detectFaceInImage(file: File) {
  const signal = await getImageSignalText(file);
  if (/(masked|blurred|sticker|redacted|covered|edited)/.test(signal)) {
    return false;
  }
  return /(face|selfie|portrait|얼굴|셀카|증명사진|profile-photo|front)/.test(signal);
}

export async function detectSensitiveTextInImage(file: File) {
  const signal = await getImageSignalText(file);
  return /(phone|tel|연락처|번호|kakao|insta|instagram|sns|student|학번|qr|barcode|이메일|email|@)/.test(
    signal,
  );
}

export async function detectQrInImage(file: File) {
  const signal = await getImageSignalText(file);
  return /(qr|barcode|바코드|큐알)/.test(signal);
}

export async function moderateCommunityProfileImage(file: File) {
  if (await detectFaceInImage(file)) {
    return {
      status: "rejected" as const,
      reason: "얼굴이 보이는 사진은 업로드할 수 없습니다.",
    };
  }

  if ((await detectSensitiveTextInImage(file)) || (await detectQrInImage(file))) {
    return {
      status: "pending" as const,
      reason: "연락처, SNS, QR, 학생증 등 개인정보가 포함된 것으로 보여 검토 후 공개됩니다.",
    };
  }

  return {
    status: "approved" as const,
    reason: undefined,
  };
}

export function parseInterestTokens(input: string) {
  return Array.from(
    new Set(
      input
        .split(/[,\n]/)
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 10),
    ),
  );
}

export function canUseCommunityProfileFeature(
  user?: Pick<User, "verificationState"> | null,
): user is Pick<User, "verificationState"> & { verificationState: VerificationState } {
  return user?.verificationState === "student_verified";
}

export function canReadCommunityProfile(
  viewer: Pick<User, "id" | "schoolId" | "verificationState">,
  target: Pick<User, "id" | "schoolId" | "verificationState"> & {
    profileVisibility?: ProfileVisibility;
  },
  blocked = false,
) {
  if (viewer.id === target.id) {
    return true;
  }

  if (blocked) {
    return false;
  }

  return (
    viewer.verificationState === "student_verified" &&
    target.verificationState === "student_verified" &&
    (
      (target.profileVisibility ?? "university_only") === "university_only" ||
      (Boolean(viewer.schoolId) &&
        Boolean(target.schoolId) &&
        viewer.schoolId === target.schoolId)
    )
  );
}

export function getCommunityProfileRestrictionMessage(
  viewer: Pick<User, "id" | "schoolId" | "verificationState">,
  target: Pick<User, "id" | "schoolId" | "verificationState"> & {
    profileVisibility?: ProfileVisibility;
  },
  blocked = false,
) {
  if (viewer.id === target.id) {
    return null;
  }

  if (blocked) {
    return COMMUNITY_PROFILE_BLOCKED_MESSAGE;
  }

  if (viewer.verificationState !== "student_verified" || target.verificationState !== "student_verified") {
    return COMMUNITY_PROFILE_RESTRICTION_MESSAGE;
  }

  if ((target.profileVisibility ?? "university_only") === "same_school_only" && viewer.schoolId !== target.schoolId) {
    return COMMUNITY_PROFILE_SAME_SCHOOL_ONLY_MESSAGE;
  }

  return null;
}
