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

type CurrentProfileUserRow = {
  id: string;
  email: string | null;
  school_id: string | null;
  department: string | null;
  admission_year: number | null;
  verification_state: VerificationState | null;
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
    .select("id, email, school_id, department, admission_year, verification_state, nickname, name")
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
  user: Pick<CurrentProfileUserRow, "verification_state" | "email">,
) {
  if (
    !canUseCommunityProfileFeature({
      verificationState: user.verification_state ?? undefined,
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
    .select("id, school_id, department, admission_year, verification_state, nickname, name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as CurrentProfileUserRow | null;
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

  const payload = {
    id: user.id,
    display_name: parsed.displayName,
    bio: parsed.bio?.trim() ? parsed.bio.trim() : null,
    interests: parsed.interests,
    profile_visibility: parsed.profileVisibility,
    show_department: parsed.showDepartment,
    show_admission_year: parsed.showAdmissionYear,
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
  } else {
    const { error: insertError } = await admin.from("profiles").insert(payload);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  revalidateCommunityProfileSurfaces(user.id);
  return getMyProfile();
}

export async function uploadProfileImage(formData: FormData) {
  const file = formData.get("file");
  const imageOrder = Number(formData.get("imageOrder"));
  const sensitiveDetected = String(formData.get("sensitiveDetected") ?? "") === "true";
  const qrDetected = String(formData.get("qrDetected") ?? "") === "true";

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

  let moderation = await moderateCommunityProfileImage(file);
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
        is_primary: moderation.status === "approved" ? Boolean(existingRow?.is_primary) : false,
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
  return getMyProfile();
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
  return getMyProfile();
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
      {
        id: user.id,
        schoolId: user.school_id ?? undefined,
        verificationState: user.verification_state ?? undefined,
      },
      {
        id: targetUser.id,
        profileVisibility: profile?.profile_visibility ?? "university_only",
        schoolId: targetUser.school_id ?? undefined,
        verificationState: targetUser.verification_state ?? undefined,
      },
      blocked,
    )
  ) {
    throw new Error(
      getCommunityProfileRestrictionMessage(
        {
          id: user.id,
          schoolId: user.school_id ?? undefined,
          verificationState: user.verification_state ?? undefined,
        },
        {
          id: targetUser.id,
          profileVisibility: profile?.profile_visibility ?? "university_only",
          schoolId: targetUser.school_id ?? undefined,
          verificationState: targetUser.verification_state ?? undefined,
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
    {
      id: user.id,
      schoolId: user.school_id ?? undefined,
      verificationState: user.verification_state ?? undefined,
    },
    {
      id: targetUser.id,
      profileVisibility: profile?.profile_visibility ?? "university_only",
      schoolId: targetUser.school_id ?? undefined,
      verificationState: targetUser.verification_state ?? undefined,
    },
    blocked,
  )) {
    return {
      ok: false as const,
      error:
        getCommunityProfileRestrictionMessage(
          {
            id: user.id,
            schoolId: user.school_id ?? undefined,
            verificationState: user.verification_state ?? undefined,
          },
          {
            id: targetUser.id,
            profileVisibility: profile?.profile_visibility ?? "university_only",
            schoolId: targetUser.school_id ?? undefined,
            verificationState: targetUser.verification_state ?? undefined,
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
      {
        id: user.id,
        schoolId: user.school_id ?? undefined,
        verificationState: user.verification_state ?? undefined,
      },
      {
        id: targetUser.id,
        profileVisibility: profile?.profile_visibility ?? "university_only",
        schoolId: targetUser.school_id ?? undefined,
        verificationState: targetUser.verification_state ?? undefined,
      },
    )
  ) {
    throw new Error(
      getCommunityProfileRestrictionMessage(
        {
          id: user.id,
          schoolId: user.school_id ?? undefined,
          verificationState: user.verification_state ?? undefined,
        },
        {
          id: targetUser.id,
          profileVisibility: profile?.profile_visibility ?? "university_only",
          schoolId: targetUser.school_id ?? undefined,
          verificationState: targetUser.verification_state ?? undefined,
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
      {
        id: user.id,
        schoolId: user.school_id ?? undefined,
        verificationState: user.verification_state ?? undefined,
      },
      {
        id: targetUser.id,
        profileVisibility: profile?.profile_visibility ?? "university_only",
        schoolId: targetUser.school_id ?? undefined,
        verificationState: targetUser.verification_state ?? undefined,
      },
    )
  ) {
    throw new Error(
      getCommunityProfileRestrictionMessage(
        {
          id: user.id,
          schoolId: user.school_id ?? undefined,
          verificationState: user.verification_state ?? undefined,
        },
        {
          id: targetUser.id,
          profileVisibility: profile?.profile_visibility ?? "university_only",
          schoolId: targetUser.school_id ?? undefined,
          verificationState: targetUser.verification_state ?? undefined,
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
