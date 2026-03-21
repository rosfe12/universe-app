import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  buildPostImagePath,
  buildProfileImagePath,
  getStoragePathFromPublicUrl,
  MAX_IMAGE_UPLOAD_BYTES,
  MEDIA_BUCKET,
  type UploadTarget,
} from "@/lib/supabase/storage";

export const runtime = "nodejs";

function isOwnedPath(path: string, userId: string) {
  return path.startsWith(`posts/${userId}/`) || path.startsWith(`profiles/${userId}/`);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "로그인 후 이미지를 업로드할 수 있습니다." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const target = (formData.get("target") as UploadTarget | null) ?? "post";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "이미지 파일을 선택해주세요." }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    return NextResponse.json({ error: "JPG, PNG, WEBP 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return NextResponse.json({ error: "이미지는 5MB 이하만 업로드할 수 있습니다." }, { status: 400 });
  }

  const path =
    target === "profile" ? buildProfileImagePath(user.id, file) : buildPostImagePath(user.id, file);
  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage.from(MEDIA_BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  return NextResponse.json({ publicUrl, path });
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "로그인 후 이미지를 삭제할 수 있습니다." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { publicUrl?: string } | null;
  const publicUrl = payload?.publicUrl;

  if (!publicUrl) {
    return NextResponse.json({ error: "삭제할 이미지 URL이 필요합니다." }, { status: 400 });
  }

  const path = getStoragePathFromPublicUrl(publicUrl);
  if (!path || !isOwnedPath(path, user.id)) {
    return NextResponse.json({ error: "본인 이미지 경로만 삭제할 수 있습니다." }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
