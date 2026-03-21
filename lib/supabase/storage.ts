export const MEDIA_BUCKET = "media";
export type UploadTarget = "post" | "profile";
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

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

export function validateUploadImageFile(file: File) {
  if (!file) {
    throw new Error("이미지 파일을 선택해주세요.");
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    throw new Error("JPG, PNG, WEBP 파일만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("이미지는 5MB 이하만 업로드할 수 있습니다.");
  }
}

export async function uploadImage(
  file: File,
  _userId: string,
  target: UploadTarget = "post",
) {
  validateUploadImageFile(file);

  const formData = new FormData();
  formData.set("file", file);
  formData.set("target", target);

  const response = await fetch("/api/uploads/image", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.publicUrl) {
    throw new Error(payload?.error ?? "이미지 업로드에 실패했습니다.");
  }

  return payload.publicUrl as string;
}

export async function deleteImageByPublicUrl(publicUrl?: string | null) {
  if (!publicUrl) return;

  const response = await fetch("/api/uploads/image", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publicUrl }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "이미지 삭제에 실패했습니다.");
  }
}
