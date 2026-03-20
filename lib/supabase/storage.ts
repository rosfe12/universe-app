"use client";

import { createClient } from "@/lib/supabase/client";

export const MEDIA_BUCKET = "media";
export type UploadTarget = "post" | "profile";

function normalizeExtension(file: File) {
  const fromType = file.type.split("/")[1];
  const fromName = file.name.split(".").pop();
  return (fromName || fromType || "jpg").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function buildPostImagePath(userId: string, file: File) {
  return `posts/${userId}/${Date.now()}.${normalizeExtension(file)}`;
}

export function buildProfileImagePath(userId: string, file: File) {
  return `profiles/${userId}/profile.${normalizeExtension(file)}`;
}

export function getStoragePathFromPublicUrl(publicUrl: string) {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.slice(index + marker.length);
}

export async function uploadImage(
  file: File,
  userId: string,
  target: UploadTarget = "post",
) {
  if (!file) {
    throw new Error("이미지 파일을 선택해주세요.");
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("로그인 후 이미지를 업로드할 수 있습니다.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  if (user.id !== userId) {
    throw new Error("본인 계정으로만 이미지를 업로드할 수 있습니다.");
  }

  const path =
    target === "profile" ? buildProfileImagePath(userId, file) : buildPostImagePath(userId, file);

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  return publicUrl;
}

export async function deleteImageByPublicUrl(publicUrl?: string | null) {
  if (!publicUrl) return;

  const path = getStoragePathFromPublicUrl(publicUrl);
  if (!path) return;

  const supabase = createClient();
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}
