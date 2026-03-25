import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSetting, requireAdminUser, setAdminSetting } from "@/app/api/admin/_utils";
import { logServerEvent } from "@/lib/ops";
import type { AdminFeatureFlags, AdminNotice, AdminPromotion, AdminSettingsPayload } from "@/types";

export const runtime = "nodejs";

const featureFlagsSchema = z.object({
  premiumLimitsEnabled: z.boolean(),
  adsEnabled: z.boolean(),
  promotedPostsEnabled: z.boolean(),
  schoolTargetAdsEnabled: z.boolean(),
});

const noticeSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(1000),
  pinned: z.boolean().optional(),
  active: z.boolean().optional(),
  startsAt: z.string().datetime().optional().or(z.literal("")),
  endsAt: z.string().datetime().optional().or(z.literal("")),
});

const promotionSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(400),
  placement: z.string().trim().min(1).max(60),
  linkUrl: z.string().url().optional().or(z.literal("")),
  targetSchoolId: z.string().uuid().optional().or(z.literal("")),
  targetUserType: z.enum(["student", "applicant", "freshman"]).optional(),
  priority: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_flags"),
    featureFlags: featureFlagsSchema,
  }),
  z.object({
    action: z.literal("upsert_notice"),
    notice: noticeSchema,
  }),
  z.object({
    action: z.literal("delete_notice"),
    id: z.string().min(1),
  }),
  z.object({
    action: z.literal("upsert_promotion"),
    promotion: promotionSchema,
  }),
  z.object({
    action: z.literal("delete_promotion"),
    id: z.string().min(1),
  }),
]);

const defaultFlags: AdminFeatureFlags = {
  premiumLimitsEnabled: false,
  adsEnabled: false,
  promotedPostsEnabled: false,
  schoolTargetAdsEnabled: false,
};

async function loadSettings(
  admin: Awaited<ReturnType<typeof requireAdminUser>>["admin"],
): Promise<AdminSettingsPayload> {
  const [featureFlags, notices, promotions] = await Promise.all([
    getAdminSetting(admin, "feature_flags", defaultFlags),
    getAdminSetting<AdminNotice[]>(admin, "notices", []),
    getAdminSetting<AdminPromotion[]>(admin, "promotions", []),
  ]);

  return {
    featureFlags,
    notices,
    promotions,
  };
}

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdminUser(request);
    const settings = await loadSettings(admin);
    return NextResponse.json(settings);
  } catch (error) {
    logServerEvent("error", "admin_settings_read_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "운영 설정을 불러올 수 없습니다." },
      { status: 403 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { admin } = await requireAdminUser(request);
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    if (parsed.data.action === "set_flags") {
      await setAdminSetting(admin, "feature_flags", parsed.data.featureFlags);
    }

    if (parsed.data.action === "delete_notice") {
      const notices = await getAdminSetting<AdminNotice[]>(admin, "notices", []);
      const noticeId = parsed.data.id;
      const nextNotices = notices.filter((item) => item.id !== noticeId);
      await setAdminSetting(admin, "notices", nextNotices);
    }

    if (parsed.data.action === "upsert_notice") {
      const notices = await getAdminSetting<AdminNotice[]>(admin, "notices", []);
      const notice = parsed.data.notice;
      const nextNotices = [
        {
          id: notice.id ?? randomUUID(),
          title: notice.title,
          body: notice.body,
          pinned: Boolean(notice.pinned),
          active: notice.active ?? true,
          createdAt:
            notices.find((item) => item.id === notice.id)?.createdAt ?? new Date().toISOString(),
          startsAt: notice.startsAt || undefined,
          endsAt: notice.endsAt || undefined,
        },
        ...notices.filter((item) => item.id !== notice.id),
      ];

      await setAdminSetting(admin, "notices", nextNotices);
    }

    if (parsed.data.action === "delete_promotion") {
      const promotions = await getAdminSetting<AdminPromotion[]>(admin, "promotions", []);
      const promotionId = parsed.data.id;
      const nextPromotions = promotions.filter((item) => item.id !== promotionId);
      await setAdminSetting(admin, "promotions", nextPromotions);
    }

    if (parsed.data.action === "upsert_promotion") {
      const promotions = await getAdminSetting<AdminPromotion[]>(admin, "promotions", []);
      const promotion = parsed.data.promotion;
      const nextPromotions = [
        {
          id: promotion.id ?? randomUUID(),
          title: promotion.title,
          description: promotion.description,
          placement: promotion.placement,
          linkUrl: promotion.linkUrl || undefined,
          targetSchoolId: promotion.targetSchoolId || undefined,
          targetUserType: promotion.targetUserType,
          priority: promotion.priority ?? 0,
          active: promotion.active ?? true,
          pinned: Boolean(promotion.pinned),
          createdAt:
            promotions.find((item) => item.id === promotion.id)?.createdAt ??
            new Date().toISOString(),
        },
        ...promotions.filter((item) => item.id !== promotion.id),
      ].sort((a, b) => b.priority - a.priority);

      await setAdminSetting(admin, "promotions", nextPromotions);
    }

    const settings = await loadSettings(admin);
    return NextResponse.json({ ok: true, ...settings });
  } catch (error) {
    logServerEvent("error", "admin_settings_update_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "운영 설정을 저장할 수 없습니다." },
      { status: 403 },
    );
  }
}
