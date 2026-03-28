import { NextResponse } from "next/server";
import { z } from "zod";

import { insertAdminAuditLog, listAdminAuditLogs, requireAdminUser } from "@/app/api/admin/_utils";
import { logServerEvent } from "@/lib/ops";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { AdminProfileImageItem, ProfileImageModerationStatus } from "@/types";

export const runtime = "nodejs";

const PROFILE_IMAGE_BUCKET = "profile-images";

const patchSchema = z.object({
  imageId: z.string().uuid(),
  action: z.enum(["approve", "reject", "delete"]),
  reason: z.string().trim().max(200).optional(),
});

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

async function listAdminProfileImages(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  status: "all" | ProfileImageModerationStatus = "pending",
) {
  let query = admin
    .from("profile_images")
    .select(
      "id, user_id, image_path, image_order, is_primary, moderation_status, moderation_reason, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(80);

  if (status !== "all") {
    query = query.eq("moderation_status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const userIds = Array.from(new Set(rows.map((row) => String(row.user_id))));

  const { data: users, error: usersError } =
    userIds.length > 0
      ? await admin
          .from("users")
          .select("id, nickname, email, school_id")
          .in("id", userIds)
      : { data: [], error: null };

  if (usersError) {
    throw usersError;
  }

  const schoolIds = Array.from(
    new Set((users ?? []).map((row) => (row.school_id ? String(row.school_id) : null)).filter(Boolean)),
  ) as string[];

  const { data: schools, error: schoolsError } =
    schoolIds.length > 0
      ? await admin.from("schools").select("id, name").in("id", schoolIds)
      : { data: [], error: null };

  if (schoolsError) {
    throw schoolsError;
  }

  const userById = new Map(
    (users ?? []).map((row) => [
      String(row.id),
      {
        nickname: row.nickname ? String(row.nickname) : "익명",
        email: row.email ? String(row.email) : undefined,
        schoolId: row.school_id ? String(row.school_id) : undefined,
      },
    ]),
  );
  const schoolNameById = new Map(
    (schools ?? []).map((row) => [String(row.id), String(row.name)]),
  );

  return Promise.all(
    rows.map(async (row): Promise<AdminProfileImageItem> => {
      const user = userById.get(String(row.user_id));
      const schoolId = user?.schoolId;

      return {
        id: String(row.id),
        userId: String(row.user_id),
        nickname: user?.nickname ?? "익명",
        email: user?.email,
        schoolId,
        schoolName: schoolId ? schoolNameById.get(schoolId) : undefined,
        imagePath: String(row.image_path),
        imageOrder: Number(row.image_order) as 1 | 2 | 3,
        isPrimary: Boolean(row.is_primary),
        moderationStatus:
          row.moderation_status === "approved" ||
          row.moderation_status === "pending" ||
          row.moderation_status === "rejected"
            ? row.moderation_status
            : "pending",
        moderationReason: row.moderation_reason ? String(row.moderation_reason) : undefined,
        imageUrl: await createSignedImageUrl(admin, String(row.image_path)),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
    }),
  );
}

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdminUser(request);
    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get("status")?.trim();
    const status: "all" | ProfileImageModerationStatus =
      rawStatus === "approved" || rawStatus === "rejected" || rawStatus === "pending"
        ? rawStatus
        : "all";

    const items = await listAdminProfileImages(admin, status);
    return NextResponse.json({ items });
  } catch (error) {
    logServerEvent("error", "admin_profile_images_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "프로필 사진 목록을 불러올 수 없습니다." },
      { status: 403 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { admin, user } = await requireAdminUser(request);
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const { imageId, action, reason } = parsed.data;
    const { data: row, error: rowError } = await admin
      .from("profile_images")
      .select("id, user_id, image_path, image_order, is_primary, moderation_status")
      .eq("id", imageId)
      .maybeSingle();

    if (rowError) {
      throw rowError;
    }

    if (!row) {
      return NextResponse.json({ error: "프로필 사진을 찾을 수 없습니다." }, { status: 404 });
    }

    if (action === "delete") {
      await admin.storage.from(PROFILE_IMAGE_BUCKET).remove([String(row.image_path)]).catch(() => null);
      const { error: deleteError } = await admin.from("profile_images").delete().eq("id", imageId);

      if (deleteError) {
        throw deleteError;
      }
    } else if (action === "approve") {
      const { error: updateError } = await admin
        .from("profile_images")
        .update({
          moderation_status: "approved",
          moderation_reason: null,
        })
        .eq("id", imageId);

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: updateError } = await admin
        .from("profile_images")
        .update({
          moderation_status: "rejected",
          moderation_reason: reason?.trim() || "관리자 검토에서 반려되었습니다.",
          is_primary: false,
        })
        .eq("id", imageId);

      if (updateError) {
        throw updateError;
      }
    }

    await insertAdminAuditLog(admin, {
      adminUserId: user.id,
      action:
        action === "approve"
          ? "profile_image_approved"
          : action === "reject"
            ? "profile_image_rejected"
            : "profile_image_deleted",
      targetType: "profile",
      targetId: String(row.user_id),
      summary:
        action === "approve"
          ? "프로필 사진을 승인했습니다."
          : action === "reject"
            ? "프로필 사진을 반려했습니다."
            : "프로필 사진을 삭제했습니다.",
      metadata: {
        imageId: String(row.id),
        imageOrder: Number(row.image_order),
        isPrimary: Boolean(row.is_primary),
        previousStatus: String(row.moderation_status),
        reason: reason?.trim() || undefined,
      },
    }).catch(() => null);

    const auditLogs = await listAdminAuditLogs(admin).catch(() => []);
    return NextResponse.json({ ok: true, auditLogs });
  } catch (error) {
    logServerEvent("error", "admin_profile_image_update_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "프로필 사진 검토를 처리할 수 없습니다." },
      { status: 403 },
    );
  }
}
