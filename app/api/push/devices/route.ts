import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const upsertPushDeviceSchema = z.object({
  token: z.string().trim().min(20).max(512),
  deviceId: z.string().trim().min(1).max(255),
  platform: z.enum(["ios", "android", "web"]),
  appVersion: z.string().trim().max(64).optional(),
  deviceModel: z.string().trim().max(120).optional(),
  locale: z.string().trim().max(32).optional(),
});

const deletePushDeviceSchema = z
  .object({
    token: z.string().trim().min(1).max(512).optional(),
    deviceId: z.string().trim().min(1).max(255).optional(),
    platform: z.enum(["ios", "android", "web"]).optional(),
  })
  .refine((value) => Boolean(value.token) || (Boolean(value.deviceId) && Boolean(value.platform)), {
    message: "삭제할 푸시 기기 정보를 확인할 수 없습니다.",
  });

async function requireAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  return {
    user,
    admin: createAdminSupabaseClient(),
  };
}

export async function POST(request: Request) {
  try {
    const payload = upsertPushDeviceSchema.parse(await request.json());
    const { user, admin } = await requireAuthenticatedUser();
    const timestamp = new Date().toISOString();

    const { error: cleanupError } = await admin
      .from("push_devices")
      .delete()
      .eq("token", payload.token)
      .neq("user_id", user.id);

    if (cleanupError) {
      throw cleanupError;
    }

    const { error } = await admin.from("push_devices").upsert(
      {
        user_id: user.id,
        device_id: payload.deviceId,
        platform: payload.platform,
        token: payload.token,
        app_version: payload.appVersion ?? null,
        device_model: payload.deviceModel ?? null,
        locale: payload.locale ?? null,
        last_seen_at: timestamp,
      },
      {
        onConflict: "user_id,device_id,platform",
      },
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "푸시 기기 정보를 확인하지 못했습니다."
        : error instanceof Error
          ? error.message
          : "푸시 기기 정보를 저장하지 못했습니다.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = deletePushDeviceSchema.parse(await request.json());
    const { user, admin } = await requireAuthenticatedUser();

    let query = admin.from("push_devices").delete().eq("user_id", user.id);

    if (payload.token) {
      query = query.eq("token", payload.token);
    } else {
      query = query.eq("device_id", payload.deviceId!).eq("platform", payload.platform!);
    }

    const { error } = await query;
    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "푸시 기기 정보를 확인하지 못했습니다."
        : error instanceof Error
          ? error.message
          : "푸시 기기 정보를 삭제하지 못했습니다.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
