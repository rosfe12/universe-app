import { NextResponse } from "next/server";
import { z } from "zod";

import {
  insertAdminAuditLog,
  listAdminAuditLogs,
  requireAdminUser,
} from "@/app/api/admin/_utils";
import { logServerEvent } from "@/lib/ops";

export const runtime = "nodejs";

const moderatedTargetTypeSchema = z.enum(["post", "comment", "review", "profile"]);

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("warn_user"),
    userId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("restrict_user"),
    userId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("unrestrict_user"),
    userId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("hide_content"),
    targetType: moderatedTargetTypeSchema,
    targetId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("restore_content"),
    targetType: moderatedTargetTypeSchema,
    targetId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("confirm_content"),
    targetType: moderatedTargetTypeSchema,
    targetId: z.string().uuid(),
  }),
]);

export async function PATCH(request: Request) {
  try {
    const { admin, user } = await requireAdminUser(request);
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    if (
      parsed.data.action === "warn_user" ||
      parsed.data.action === "restrict_user" ||
      parsed.data.action === "unrestrict_user"
    ) {
      const { userId } = parsed.data;
      const { data: targetUser, error: targetUserError } = await admin
        .from("users")
        .select("id, warning_count, is_restricted")
        .eq("id", userId)
        .single();

      if (targetUserError || !targetUser) {
        return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
      }

      const nextWarningCount =
        parsed.data.action === "warn_user"
          ? (targetUser.warning_count ?? 0) + 1
          : targetUser.warning_count ?? 0;
      const nextRestricted =
        parsed.data.action === "restrict_user"
          ? true
          : parsed.data.action === "unrestrict_user"
            ? false
            : Boolean(targetUser.is_restricted) || nextWarningCount >= 3;

      const { error: updateUserError } = await admin
        .from("users")
        .update({
          warning_count: nextWarningCount,
          is_restricted: nextRestricted,
        })
        .eq("id", userId);

      if (updateUserError) {
        return NextResponse.json({ error: updateUserError.message }, { status: 500 });
      }

      await insertAdminAuditLog(admin, {
        adminUserId: user.id,
        action:
          parsed.data.action === "warn_user"
            ? "user_warned"
            : parsed.data.action === "restrict_user"
              ? "user_restricted"
              : "user_unrestricted",
        targetType: "user",
        targetId: userId,
        summary:
          parsed.data.action === "warn_user"
            ? `사용자 경고를 ${nextWarningCount}회로 올렸습니다.`
            : parsed.data.action === "restrict_user"
              ? "사용자 활동을 정지했습니다."
              : "사용자 활동 정지를 해제했습니다.",
        metadata: {
          userId,
          warningCount: nextWarningCount,
          restricted: nextRestricted,
        },
      }).catch(() => null);
    } else {
      const { targetType, targetId } = parsed.data;
      const tableName =
        targetType === "post"
          ? "posts"
          : targetType === "comment"
            ? "comments"
            : targetType === "review"
              ? "lecture_reviews"
              : "dating_profiles";
      const nextStatus = parsed.data.action === "restore_content" ? "dismissed" : "confirmed";
      const statusFilter =
        parsed.data.action === "restore_content"
          ? ["pending", "reviewing", "confirmed"]
          : ["pending", "reviewing"];

      const { error: reportUpdateError } = await admin
        .from("reports")
        .update({ status: nextStatus })
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .in("status", statusFilter);

      if (reportUpdateError) {
        return NextResponse.json({ error: reportUpdateError.message }, { status: 500 });
      }

      if (parsed.data.action === "restore_content") {
        const { error: restoreError } = await admin
          .from(tableName)
          .update({ admin_hidden: false })
          .eq("id", targetId);

        if (restoreError) {
          return NextResponse.json({ error: restoreError.message }, { status: 500 });
        }

        const { error: refreshError } = await admin.rpc("refresh_target_report_state", {
          p_target_type: targetType,
          p_target_id: targetId,
        });

        if (refreshError) {
          return NextResponse.json({ error: refreshError.message }, { status: 500 });
        }
      } else {
        const { error: hideError } = await admin
          .from(tableName)
          .update({ admin_hidden: true, auto_hidden: true })
          .eq("id", targetId);

        if (hideError) {
          return NextResponse.json({ error: hideError.message }, { status: 500 });
        }
      }

      await insertAdminAuditLog(admin, {
        adminUserId: user.id,
        action: parsed.data.action,
        targetType,
        targetId,
        summary:
          parsed.data.action === "restore_content"
            ? "숨김 콘텐츠를 복구했습니다."
            : parsed.data.action === "hide_content"
              ? "콘텐츠를 빠르게 숨김 처리했습니다."
              : "콘텐츠 숨김을 유지 처리했습니다.",
        metadata: {
          targetType,
          targetId,
          reportStatus: nextStatus,
        },
      }).catch(() => null);
    }

    const auditLogs = await listAdminAuditLogs(admin).catch(() => []);
    return NextResponse.json({ ok: true, auditLogs });
  } catch (error) {
    logServerEvent("error", "admin_moderation_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "관리자 작업을 처리할 수 없습니다." },
      { status: 403 },
    );
  }
}
