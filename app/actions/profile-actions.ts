"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  buildCommunityProfileImagePath,
  canReadCommunityProfile,
  canUseCommunityProfileFeature,
  communityProfileSchema,
  getCommunityProfileRestrictionMessage,
  COMMUNITY_PROFILE_RESTRICTION_MESSAGE,
  moderateCommunityProfileImage,
  profileReportSchema,
  PROFILE_IMAGE_BUCKET,
  validateCommunityProfileImageFile,
} from "@/lib/community-profile";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  BlockedProfileSummary,
  CommunityProfile,
  CommunityProfileImage,
  ProfileImageModerationStatus,
  VerificationState,
} from "@/types";

const targetUserSchema = z.string().uuid();
const reorderProfileImagesSchema = z.array(z.string().uuid()).min(1).max(3);
const profileDraftImageSchema = z.object({
  id: z.string().uuid().optional(),
  imageOrder: z.number().int().min(1).max(3),
  isPrimary: z.boolean(),
  localFileField: z.string().min(1).optional(),
  sensitiveTextDetected: z.boolean().optional(),
  qrDetected: z.boolean().optional(),
  wasProcessed: z.boolean().optional(),
});
const saveCommunityProfileDraftSchema = z
  .object({
    profile: communityProfileSchema,
    images: z.array(profileDraftImageSchema).max(3),
  })
  .superRefine((value, context) => {
    const orders = value.images.map((image) => image.imageOrder);
    if (new Set(orders).size !== orders.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["images"],
        message: "사진 슬롯 정보가 올바르지 않습니다.",
      });
    }
  });

type CurrentProfileUserRow = {
  id: string;
  email: string | null;
  school_id: string | null;
  department: string | null;
  admission_year: number | null;
  verification_state: VerificationState | null;
  student_verification_status: string | null;
  verified: boolean;
  nickname: string | null;
  name: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  bio: string | null;
  interests: string[] | null;
  profile_visibility: "university_only" | "same_school_only";
  show_department: boolean;
  show_admission_year: boolean;
  created_at: string;
  updated_at: string;
};

type ProfileImageRow = {
  id: string;
  user_id: string;
  image_path: string;
  image_order: number;
  is_primary: boolean;
  moderation_status: ProfileImageModerationStatus;
  moderation_reason: string | null;
  created_at: string;
  updated_at: string;
};

function revalidateCommunityProfileSurfaces(targetUserId?: string) {
  revalidatePath("/profile");
  revalidatePath("/community");
  revalidatePath("/home");
  revalidatePath("/school");

  if (targetUserId) {
    revalidatePath(`/profile/${targetUserId}`);
  }
}

async function requireAuthenticatedProfileUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select(
      "id, email, school_id, department, admission_year, verification_state, student_verification_status, verified, nickname, name",
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("사용자 정보를 확인할 수 없습니다.");
  }

  return {
    supabase,
    admin: createAdminSupabaseClient(),
    user: profile as CurrentProfileUserRow,
  };
}

function requireVerifiedProfileFeature(
  user: Pick<
    CurrentProfileUserRow,
    "verification_state" | "student_verification_status" | "verified" | "email"
  >,
) {
  if (
    !canUseCommunityProfileFeature({
      verificationState: user.verification_state ?? undefined,
      studentVerificationStatus: user.student_verification_status ?? undefined,
      verified: user.verified,
      email: user.email ?? undefined,
    })
  ) {
    throw new Error(COMMUNITY_PROFILE_RESTRICTION_MESSAGE);
  }
}

async function ensureOwnProfileRow(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  user: CurrentProfileUserRow,
) {
  const payload = {
    id: user.id,
    display_name: user.nickname ?? user.name ?? "익명",
    bio: null,
  };

  const { error } = await admin.from("profiles").upsert(payload, {
    onConflict: "id",
    ignoreDuplicates: true,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function getUserBaseRow(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from("users")
    .select(
      "id, email, school_id, department, admission_year, verification_state, student_verification_status, verified, nickname, name",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as CurrentProfileUserRow | null;
}

function toCommunityProfileAccessUser(
  user: Pick<
    CurrentProfileUserRow,
    "id" | "email" | "school_id" | "verification_state" | "student_verification_status" | "verified"
  >,
) {
  return {
    id: user.id,
    email: user.email ?? undefined,
    schoolId: user.school_id ?? undefined,
    verificationState: user.verification_state ?? undefined,
    studentVerificationStatus: user.student_verification_status ?? undefined,
    verified: Boolean(user.verified),
  };
}

async function getProfileRow(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, display_name, bio, interests, profile_visibility, show_department, show_admission_year, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as ProfileRow | null;
}

async function getSchoolName(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  schoolId?: string | null,
) {
  if (!schoolId) return undefined;

  const { data, error } = await admin
    .from("schools")
    .select("name")
    .eq("id", schoolId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.name ? String(data.name) : undefined;
}

async function createSignedImageUrl(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  path: string,
) {
  const { data, error } = await admin.storage
    .from(PROFILE_IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    return undefined;
  }

  return data.signedUrl;
}

async function listProfileImages(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  owner = false,
) {
  const { data, error } = await admin
    .from("profile_images")
    .select(
      "id, user_id, image_path, image_order, is_primary, moderation_status, moderation_reason, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("image_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as ProfileImageRow[]).filter((item) =>
    owner ? true : item.moderation_status === "approved",
  );

  const images = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      userId: row.user_id,
      imagePath: row.image_path,
      imageOrder: row.image_order as 1 | 2 | 3,
      isPrimary: Boolean(row.is_primary),
      moderationStatus: row.moderation_status,
      moderationReason: row.moderation_reason ?? undefined,
      imageUrl: await createSignedImageUrl(admin, row.image_path),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  );

  return images;
}

async function listOwnProfileImageRows(
  supabase: Awaited<ReturnType<typeof requireAuthenticatedProfileUser>>["supabase"],
  userId: string,
) {
  const { data, error } = await supabase
    .from("profile_images")
    .select(
      "id, user_id, image_path, image_order, is_primary, moderation_status, moderation_reason, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("image_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProfileImageRow[];
}

async function hasApprovedPrimaryImage(
  supabase: Awaited<ReturnType<typeof requireAuthenticatedProfileUser>>["supabase"],
  userId: string,
) {
  const { data, error } = await supabase
    .from("profile_images")
    .select("id")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .eq("moderation_status", "approved")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

async function upsertOwnProfileRow(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  user: CurrentProfileUserRow,
  input: z.infer<typeof communityProfileSchema>,
) {
  const payload = {
    id: user.id,
    display_name: input.displayName,
    bio: input.bio?.trim() ? input.bio.trim() : null,
    interests: input.interests,
    profile_visibility: input.profileVisibility,
    show_department: input.showDepartment,
    show_admission_year: input.showAdmissionYear,
  };

  const { data: existingProfile, error: existingProfileError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(existingProfileError.message);
  }

  if (existingProfile?.id) {
    const { error: updateError } = await admin
      .from("profiles")
      .update({
        display_name: payload.display_name,
        bio: payload.bio,
        interests: payload.interests,
        profile_visibility: payload.profile_visibility,
        show_department: payload.show_department,
        show_admission_year: payload.show_admission_year,
      })
      .eq("id", user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
    return;
  }

  const { error: insertError } = await admin.from("profiles").insert(payload);

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function saveProfileImageSlot(params: {
  supabase: Awaited<ReturnType<typeof requireAuthenticatedProfileUser>>["supabase"];
  admin: ReturnType<typeof createAdminSupabaseClient>;
  user: CurrentProfileUserRow;
  file: File;
  imageOrder: number;
  sensitiveDetected?: boolean;
  qrDetected?: boolean;
  processedImage?: boolean;
  allowFallbackPrimary?: boolean;
}) {
  const {
    supabase,
    admin,
    user,
    file,
    imageOrder,
    sensitiveDetected = false,
    qrDetected = false,
    processedImage = false,
    allowFallbackPrimary = true,
  } = params;

  validateCommunityProfileImageFile(file);

  const hasPrimaryImage = allowFallbackPrimary
    ? await hasApprovedPrimaryImage(supabase, user.id)
    : false;

  let moderation = await moderateCommunityProfileImage(file);
  if (processedImage && !sensitiveDetected && !qrDetected) {
    moderation = {
      status: "approved" as const,
      reason: undefined,
    };
  }
  if (moderation.status === "approved" && (sensitiveDetected || qrDetected)) {
    moderation = {
      status: "pending" as const,
      reason: "연락처, SNS, QR, 학생증 등 개인정보가 포함된 것으로 보여 검토 후 공개됩니다.",
    };
  }
  if (moderation.status === "rejected") {
    throw new Error(moderation.reason);
  }

  const { data: existingRow, error: existingError } = await supabase
    .from("profile_images")
    .select("id, image_path, is_primary")
    .eq("user_id", user.id)
    .eq("image_order", imageOrder)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const imagePath = buildCommunityProfileImagePath(user.id, file);
  const uploadResult = await admin.storage.from(PROFILE_IMAGE_BUCKET).upload(imagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const { data: savedRow, error: saveError } = await supabase
    .from("profile_images")
    .upsert(
      {
        user_id: user.id,
        image_path: imagePath,
        image_order: imageOrder,
        is_primary:
          moderation.status === "approved"
            ? Boolean(existingRow?.is_primary) || (allowFallbackPrimary && !hasPrimaryImage)
            : false,
        moderation_status: moderation.status,
        moderation_reason: moderation.reason ?? null,
      },
      { onConflict: "user_id,image_order" },
    )
    .select(
      "id, user_id, image_path, image_order, is_primary, moderation_status, moderation_reason, created_at, updated_at",
    )
    .single();

  if (saveError || !savedRow) {
    await admin.storage.from(PROFILE_IMAGE_BUCKET).remove([imagePath]).catch(() => null);
    throw new Error(saveError?.message ?? "프로필 사진을 저장하지 못했습니다.");
  }

  if (existingRow?.image_path && existingRow.image_path !== imagePath) {
    await admin.storage.from(PROFILE_IMAGE_BUCKET).remove([String(existingRow.image_path)]).catch(() => null);
  }

  return savedRow as ProfileImageRow;
}

async function assignNextPrimaryProfileImage(
  supabase: Awaited<ReturnType<typeof requireAuthenticatedProfileUser>>["supabase"],
  userId: string,
) {
  const { data: nextImage, error } = await supabase
    .from("profile_images")
    .select("id")
    .eq("user_id", userId)
    .eq("moderation_status", "approved")
    .order("image_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!nextImage) {
    return;
  }

  const { error: rpcError } = await supabase.rpc("set_primary_profile_image", {
    p_image_id: String(nextImage.id),
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }
}

async function hasProfileBlock(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  targetUserId: string,
) {
  const { data, error } = await admin
    .from("profile_blocks")
    .select("id")
    .or(`and(user_id.eq.${userId},blocked_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},blocked_user_id.eq.${userId})`)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.length ?? 0) > 0;
}

function mapCommunityProfile(params: {
  viewer: CurrentProfileUserRow;
  target: CurrentProfileUserRow;
  profile: ProfileRow | null;
  schoolName?: string;
  images: CommunityProfileImage[];
  owner: boolean;
}): CommunityProfile {
  const { viewer, target, profile, schoolName, images, owner } = params;

  return {
    userId: target.id,
    schoolId: target.school_id ?? undefined,
    schoolName,
    displayName:
      profile?.display_name?.trim() ||
      target.nickname?.trim() ||
      target.name?.trim() ||
      "익명",
    bio: profile?.bio?.trim() || undefined,
    interests: Array.isArray(profile?.interests) ? profile!.interests.filter(Boolean) : [],
    profileVisibility: profile?.profile_visibility ?? "university_only",
    showDepartment: Boolean(profile?.show_department),
    showAdmissionYear: Boolean(profile?.show_admission_year),
    department:
      owner || profile?.show_department ? target.department ?? undefined : undefined,
    admissionYear:
      owner || profile?.show_admission_year ? target.admission_year ?? undefined : undefined,
    verificationState: target.verification_state ?? undefined,
    images,
    isOwner: viewer.id === target.id,
  };
}

export async function getMyProfile() {
  const { admin, user } = await requireAuthenticatedProfileUser();
  requireVerifiedProfileFeature(user);
  await ensureOwnProfileRow(admin, user);

  const [profile, images, schoolName] = await Promise.all([
    getProfileRow(admin, user.id),
    listProfileImages(admin, user.id, true),
    getSchoolName(admin, user.school_id),
  ]);

  return mapCommunityProfile({
    viewer: user,
    target: user,
    profile,
    schoolName,
    images,
    owner: true,
  });
}

export async function updateMyProfile(input: z.infer<typeof communityProfileSchema>) {
  const parsedResult = communityProfileSchema.safeParse(input);
  if (!parsedResult.success) {
    throw new Error("닉네임과 한줄 소개, 관심사를 다시 확인해주세요.");
  }
  const parsed = parsedResult.data;
  const { admin, user } = await requireAuthenticatedProfileUser();
  requireVerifiedProfileFeature(user);
  await upsertOwnProfileRow(admin, user, parsed);

  revalidateCommunityProfileSurfaces(user.id);
}

export async function saveCommunityProfileDraft(formData: FormData) {
  const rawProfile = formData.get("profile");
  const rawImages = formData.get("images");

  if (typeof rawProfile !== "string" || typeof rawImages !== "string") {
    throw new Error("프로필 저장 정보를 다시 확인해주세요.");
  }

  let parsedPayload: z.infer<typeof saveCommunityProfileDraftSchema>;
  try {
    const payload = {
      profile: JSON.parse(rawProfile),
      images: JSON.parse(rawImages),
    };
    const parsedResult = saveCommunityProfileDraftSchema.safeParse(payload);
    if (!parsedResult.success) {
      throw new Error("프로필 저장 정보를 다시 확인해주세요.");
    }
    parsedPayload = parsedResult.data;
  } catch {
    throw new Error("프로필 저장 정보를 다시 확인해주세요.");
  }

  const { supabase, admin, user } = await requireAuthenticatedProfileUser();
  requireVerifiedProfileFeature(user);
  await ensureOwnProfileRow(admin, user);
  await upsertOwnProfileRow(admin, user, parsedPayload.profile);

  const existingRows = await listOwnProfileImageRows(supabase, user.id);
  const existingById = new Map(existingRows.map((row) => [String(row.id), row] as const));
  const resolvedImages: Array<{
    draft: z.infer<typeof profileDraftImageSchema>;
    row: ProfileImageRow;
  }> = [];

  for (const draftImage of [...parsedPayload.images].sort((a, b) => a.imageOrder - b.imageOrder)) {
    if (draftImage.localFileField) {
      const file = formData.get(draftImage.localFileField);
      if (!(file instanceof File)) {
        throw new Error("프로필 사진 파일을 다시 선택해주세요.");
      }

      const savedRow = await saveProfileImageSlot({
        supabase,
        admin,
        user,
        file,
        imageOrder: draftImage.imageOrder,
        sensitiveDetected: Boolean(draftImage.sensitiveTextDetected),
        qrDetected: Boolean(draftImage.qrDetected),
        processedImage: Boolean(draftImage.wasProcessed),
        allowFallbackPrimary: false,
      });

      resolvedImages.push({
        draft: draftImage,
        row: savedRow,
      });
      continue;
    }

    if (!draftImage.id) {
      throw new Error("프로필 사진 정보를 다시 확인해주세요.");
    }

    const existingRow = existingById.get(draftImage.id);
    if (!existingRow) {
      throw new Error("프로필 사진 정보를 다시 확인해주세요.");
    }

    resolvedImages.push({
      draft: draftImage,
      row: existingRow,
    });
  }

  const desiredImageIds = resolvedImages.map((item) => String(item.row.id));
  const removedRows = existingRows.filter((row) => !desiredImageIds.includes(String(row.id)));

  if (removedRows.length > 0) {
    const { error: deleteError } = await supabase
      .from("profile_images")
      .delete()
      .in(
        "id",
        removedRows.map((row) => String(row.id)),
      )
      .eq("user_id", user.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    await admin.storage
      .from(PROFILE_IMAGE_BUCKET)
      .remove(removedRows.map((row) => String(row.image_path)))
      .catch(() => null);
  }

  const currentOrderIds = [...resolvedImages]
    .sort((a, b) => a.row.image_order - b.row.image_order)
    .map((item) => String(item.row.id));

  if (
    desiredImageIds.length > 0 &&
    JSON.stringify(desiredImageIds) !== JSON.stringify(currentOrderIds)
  ) {
    const { error } = await supabase.rpc("reorder_profile_images", {
      p_image_ids: desiredImageIds,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  const desiredPrimaryId =
    resolvedImages.find(
      (item) => item.draft.isPrimary && item.row.moderation_status === "approved",
    )?.row.id ?? null;
  const currentPrimaryId =
    resolvedImages.find((item) => item.row.is_primary)?.row.id ?? null;

  if (desiredPrimaryId && currentPrimaryId !== desiredPrimaryId) {
    const { error } = await supabase.rpc("set_primary_profile_image", {
      p_image_id: String(desiredPrimaryId),
    });

    if (error) {
      throw new Error(error.message);
    }
  } else if (!desiredPrimaryId && resolvedImages.some((item) => item.row.moderation_status === "approved")) {
    await assignNextPrimaryProfileImage(supabase, user.id).catch(() => null);
  }

  const fallbackPrimaryId =
    resolvedImages.find((item) => item.row.moderation_status === "approved")?.row.id ?? null;
  const finalPrimaryId = desiredPrimaryId ?? fallbackPrimaryId;
  const images = await Promise.all(
    resolvedImages.map(async ({ row }, index) => ({
      id: String(row.id),
      userId: String(row.user_id),
      imagePath: String(row.image_path),
      imageOrder: (index + 1) as 1 | 2 | 3,
      isPrimary: finalPrimaryId ? String(row.id) === String(finalPrimaryId) : false,
      moderationStatus: row.moderation_status,
      moderationReason: row.moderation_reason ? String(row.moderation_reason) : undefined,
      imageUrl: await createSignedImageUrl(admin, String(row.image_path)),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    })),
  );
  const schoolName = await getSchoolName(admin, user.school_id);

  revalidateCommunityProfileSurfaces(user.id);

  return mapCommunityProfile({
    viewer: user,
    target: user,
    profile: {
      id: user.id,
      display_name: parsedPayload.profile.displayName,
      bio: parsedPayload.profile.bio?.trim() ? parsedPayload.profile.bio.trim() : null,
      interests: parsedPayload.profile.interests,
      profile_visibility: parsedPayload.profile.profileVisibility,
      show_department: parsedPayload.profile.showDepartment,
      show_admission_year: parsedPayload.profile.showAdmissionYear,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    schoolName,
    images,
    owner: true,
  });
}

export async function uploadProfileImage(formData: FormData) {
  const file = formData.get("file");
  const imageOrder = Number(formData.get("imageOrder"));
  const sensitiveDetected = String(formData.get("sensitiveDetected") ?? "") === "true";
  const qrDetected = String(formData.get("qrDetected") ?? "") === "true";
  const processedImage = String(formData.get("processedImage") ?? "") === "true";

  if (!(file instanceof File)) {
    throw new Error("이미지 파일을 선택해주세요.");
  }

  if (!Number.isInteger(imageOrder) || imageOrder < 1 || imageOrder > 3) {
    throw new Error("사진 슬롯은 1~3개만 사용할 수 있습니다.");
  }

  validateCommunityProfileImageFile(file);

  const { supabase, admin, user } = await requireAuthenticatedProfileUser();
  requireVerifiedProfileFeature(user);
  await ensureOwnProfileRow(admin, user);
  const savedRow = await saveProfileImageSlot({
    supabase,
    admin,
    user,
    file,
    imageOrder,
    sensitiveDetected,
    qrDetected,
    processedImage,
  });

  revalidateCommunityProfileSurfaces(user.id);

  return {
    id: String(savedRow.id),
    userId: String(savedRow.user_id),
    imagePath: String(savedRow.image_path),
    imageOrder: Number(savedRow.image_order) as 1 | 2 | 3,
    isPrimary: Boolean(savedRow.is_primary),
    moderationStatus: savedRow.moderation_status as ProfileImageModerationStatus,
    moderationReason: savedRow.moderation_reason ? String(savedRow.moderation_reason) : undefined,
    imageUrl: await createSignedImageUrl(admin, String(savedRow.image_path)),
    createdAt: String(savedRow.created_at),
    updatedAt: String(savedRow.updated_at),
  } satisfies CommunityProfileImage;
}

export async function deleteProfileImage(imageId: string) {
  const parsedImageIdResult = targetUserSchema.safeParse(imageId);
  if (!parsedImageIdResult.success) {
    throw new Error("삭제할 프로필 사진을 다시 선택해주세요.");
  }
  const parsedImageId = parsedImageIdResult.data;
  const { supabase, admin, user } = await requireAuthenticatedProfileUser();
  requireVerifiedProfileFeature(user);

  const { data: row, error } = await supabase
    .from("profile_images")
    .select("id, image_path")
    .eq("id", parsedImageId)
    .eq("user_id", user.id)
    .single();

  if (error || !row) {
    throw new Error("삭제할 프로필 사진을 찾을 수 없습니다.");
  }

  const { error: deleteError } = await supabase
    .from("profile_images")
    .delete()
    .eq("id", parsedImageId)
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await admin.storage.from(PROFILE_IMAGE_BUCKET).remove([String(row.image_path)]).catch(() => null);
  await assignNextPrimaryProfileImage(supabase, user.id).catch(() => null);
  revalidateCommunityProfileSurfaces(user.id);

  return { ok: true };
}

export async function reorderProfileImages(imageIds: string[]) {
  const parsedImageIdsResult = reorderProfileImagesSchema.safeParse(imageIds);
  if (!parsedImageIdsResult.success) {
    throw new Error("프로필 사진 순서를 다시 확인해주세요.");
  }
  const parsedImageIds = parsedImageIdsResult.data;
  const { supabase, user } = await requireAuthenticatedProfileUser();
  requireVerifiedProfileFeature(user);

  const { error } = await supabase.rpc("reorder_profile_images", {
    p_image_ids: parsedImageIds,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateCommunityProfileSurfaces(user.id);
}

export async function setPrimaryProfileImage(imageId: string) {
  const parsedImageIdResult = targetUserSchema.safeParse(imageId);
  if (!parsedImageIdResult.success) {
    throw new Error("대표 사진을 다시 선택해주세요.");
  }

  const parsedImageId = parsedImageIdResult.data;
  const { supabase, user } = await requireAuthenticatedProfileUser();
  requireVerifiedProfileFeature(user);

  const { data: imageRow, error: imageError } = await supabase
    .from("profile_images")
    .select(
      "id, user_id, moderation_status, is_primary",
    )
    .eq("id", parsedImageId)
    .eq("user_id", user.id)
    .single();

  if (imageError || !imageRow) {
    throw new Error("대표 사진으로 설정할 이미지를 찾을 수 없습니다.");
  }

  if (imageRow.moderation_status !== "approved") {
    throw new Error("승인된 사진만 대표 사진으로 설정할 수 있습니다.");
  }

  if (!imageRow.is_primary) {
    const { error } = await supabase.rpc("set_primary_profile_image", {
      p_image_id: parsedImageId,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidateCommunityProfileSurfaces(user.id);
}

export async function getPrimaryProfileImage(targetUserId: string) {
  const parsedTargetUserIdResult = targetUserSchema.safeParse(targetUserId);
  if (!parsedTargetUserIdResult.success) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  const parsedTargetUserId = parsedTargetUserIdResult.data;
  const { admin, user } = await requireAuthenticatedProfileUser();
  const targetUser = await getUserBaseRow(admin, parsedTargetUserId);

  if (!targetUser) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  const profile = await getProfileRow(admin, targetUser.id);
  const blocked = await hasProfileBlock(admin, user.id, targetUser.id);
  if (
    !canReadCommunityProfile(
      toCommunityProfileAccessUser(user),
      {
        ...toCommunityProfileAccessUser(targetUser),
        profileVisibility: profile?.profile_visibility ?? "university_only",
      },
      blocked,
    )
  ) {
    throw new Error(
      getCommunityProfileRestrictionMessage(
        toCommunityProfileAccessUser(user),
        {
          ...toCommunityProfileAccessUser(targetUser),
          profileVisibility: profile?.profile_visibility ?? "university_only",
        },
        blocked,
      ) ?? COMMUNITY_PROFILE_RESTRICTION_MESSAGE,
    );
  }

  const images = await listProfileImages(admin, targetUser.id, user.id === targetUser.id);
  return images.find((image) => image.isPrimary && image.moderationStatus === "approved") ?? null;
}

export async function getUserProfile(targetUserId: string) {
  const parsedTargetUserIdResult = targetUserSchema.safeParse(targetUserId);
  if (!parsedTargetUserIdResult.success) {
    return {
      ok: false as const,
      error: "프로필을 찾을 수 없습니다.",
    };
  }
  const parsedTargetUserId = parsedTargetUserIdResult.data;
  const { admin, user } = await requireAuthenticatedProfileUser();
  const targetUser = await getUserBaseRow(admin, parsedTargetUserId);

  if (!targetUser) {
    return {
      ok: false as const,
      error: "프로필을 찾을 수 없습니다.",
    };
  }

  const profile = await getProfileRow(admin, targetUser.id);
  const blocked = await hasProfileBlock(admin, user.id, targetUser.id);
  if (!canReadCommunityProfile(
    toCommunityProfileAccessUser(user),
    {
      ...toCommunityProfileAccessUser(targetUser),
      profileVisibility: profile?.profile_visibility ?? "university_only",
    },
    blocked,
  )) {
    return {
      ok: false as const,
      error:
        getCommunityProfileRestrictionMessage(
          toCommunityProfileAccessUser(user),
          {
            ...toCommunityProfileAccessUser(targetUser),
            profileVisibility: profile?.profile_visibility ?? "university_only",
          },
          blocked,
        ) ?? COMMUNITY_PROFILE_RESTRICTION_MESSAGE,
    };
  }

  const isOwner = user.id === targetUser.id;
  const [images, schoolName] = await Promise.all([
    listProfileImages(admin, targetUser.id, isOwner),
    getSchoolName(admin, targetUser.school_id),
  ]);

  return {
    ok: true as const,
    profile: mapCommunityProfile({
      viewer: user,
      target: targetUser,
      profile,
      schoolName,
      images,
      owner: isOwner,
    }),
  };
}

export async function getMyBlockedProfiles() {
  const { admin, user } = await requireAuthenticatedProfileUser();
  requireVerifiedProfileFeature(user);

  const { data, error } = await admin
    .from("profile_blocks")
    .select("id, blocked_user_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows =
    ((data ?? []) as Array<{
      id: string;
      blocked_user_id: string;
      created_at: string;
    }>) ?? [];

  if (rows.length === 0) {
    return [] satisfies BlockedProfileSummary[];
  }

  const blockedUserIds = rows.map((row) => row.blocked_user_id);
  const { data: blockedUsers, error: blockedUsersError } = await admin
    .from("users")
    .select("id, school_id, nickname, name")
    .in("id", blockedUserIds);

  if (blockedUsersError) {
    throw new Error(blockedUsersError.message);
  }

  const schoolIds = Array.from(
    new Set((blockedUsers ?? []).map((item) => item.school_id).filter(Boolean)),
  );

  const schoolNameMap = new Map<string, string>();

  if (schoolIds.length > 0) {
    const { data: schools, error: schoolsError } = await admin
      .from("schools")
      .select("id, name")
      .in("id", schoolIds);

    if (schoolsError) {
      throw new Error(schoolsError.message);
    }

    for (const school of schools ?? []) {
      if (school.id && school.name) {
        schoolNameMap.set(String(school.id), String(school.name));
      }
    }
  }

  const blockedUserMap = new Map(
    (blockedUsers ?? []).map((blockedUser) => [
      blockedUser.id,
      {
        displayName: blockedUser.nickname ?? blockedUser.name ?? "익명",
        schoolName: blockedUser.school_id
          ? schoolNameMap.get(String(blockedUser.school_id))
          : undefined,
      },
    ]),
  );

  return rows.map((row) => {
    const blockedUser = blockedUserMap.get(row.blocked_user_id);

    return {
      id: row.id,
      blockedUserId: row.blocked_user_id,
      displayName: blockedUser?.displayName ?? "사용자",
      schoolName: blockedUser?.schoolName,
      createdAt: row.created_at,
    } satisfies BlockedProfileSummary;
  });
}

export async function blockUser(targetUserId: string) {
  const parsedTargetUserIdResult = targetUserSchema.safeParse(targetUserId);
  if (!parsedTargetUserIdResult.success) {
    throw new Error("차단할 사용자를 다시 선택해주세요.");
  }
  const parsedTargetUserId = parsedTargetUserIdResult.data;
  const { supabase, admin, user } = await requireAuthenticatedProfileUser();
  requireVerifiedProfileFeature(user);

  if (parsedTargetUserId === user.id) {
    throw new Error("본인은 차단할 수 없습니다.");
  }

  const targetUser = await getUserBaseRow(admin, parsedTargetUserId);
  if (!targetUser) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  const profile = await getProfileRow(admin, targetUser.id);
  if (
    !canReadCommunityProfile(
      toCommunityProfileAccessUser(user),
      {
        ...toCommunityProfileAccessUser(targetUser),
        profileVisibility: profile?.profile_visibility ?? "university_only",
      },
    )
  ) {
    throw new Error(
      getCommunityProfileRestrictionMessage(
        toCommunityProfileAccessUser(user),
        {
          ...toCommunityProfileAccessUser(targetUser),
          profileVisibility: profile?.profile_visibility ?? "university_only",
        },
      ) ?? COMMUNITY_PROFILE_RESTRICTION_MESSAGE,
    );
  }

  const { error } = await supabase.from("profile_blocks").upsert(
    {
      user_id: user.id,
      blocked_user_id: parsedTargetUserId,
    },
    { onConflict: "user_id,blocked_user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidateCommunityProfileSurfaces(parsedTargetUserId);
  return { ok: true };
}

export async function unblockUser(targetUserId: string) {
  const parsedTargetUserId = targetUserSchema.parse(targetUserId);
  const { supabase, user } = await requireAuthenticatedProfileUser();
  requireVerifiedProfileFeature(user);

  const { error } = await supabase
    .from("profile_blocks")
    .delete()
    .eq("user_id", user.id)
    .eq("blocked_user_id", parsedTargetUserId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateCommunityProfileSurfaces(parsedTargetUserId);
  return { ok: true };
}

export async function reportProfile(
  targetUserId: string,
  reason: string,
  detail?: string,
) {
  const parsedTargetUserIdResult = targetUserSchema.safeParse(targetUserId);
  if (!parsedTargetUserIdResult.success) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }
  const parsedTargetUserId = parsedTargetUserIdResult.data;
  const parsedPayloadResult = profileReportSchema.safeParse({
    reason,
    detail,
  });
  if (!parsedPayloadResult.success) {
    throw new Error("신고 사유를 확인해주세요.");
  }
  const parsedPayload = parsedPayloadResult.data;
  const { supabase, admin, user } = await requireAuthenticatedProfileUser();
  requireVerifiedProfileFeature(user);

  if (parsedTargetUserId === user.id) {
    throw new Error("본인 프로필은 신고할 수 없습니다.");
  }

  const targetUser = await getUserBaseRow(admin, parsedTargetUserId);
  if (!targetUser) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  const profile = await getProfileRow(admin, targetUser.id);
  if (
    !canReadCommunityProfile(
      toCommunityProfileAccessUser(user),
      {
        ...toCommunityProfileAccessUser(targetUser),
        profileVisibility: profile?.profile_visibility ?? "university_only",
      },
    )
  ) {
    throw new Error(
      getCommunityProfileRestrictionMessage(
        toCommunityProfileAccessUser(user),
        {
          ...toCommunityProfileAccessUser(targetUser),
          profileVisibility: profile?.profile_visibility ?? "university_only",
        },
      ) ?? COMMUNITY_PROFILE_RESTRICTION_MESSAGE,
    );
  }

  const { error } = await supabase.from("profile_reports").insert({
    target_user_id: parsedTargetUserId,
    reporter_user_id: user.id,
    reason: parsedPayload.reason,
    detail: parsedPayload.detail?.trim() ? parsedPayload.detail.trim() : null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateCommunityProfileSurfaces(parsedTargetUserId);
  return { ok: true };
}
