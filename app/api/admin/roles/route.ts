import { NextResponse } from "next/server";
import { z } from "zod";

import { insertAdminAuditLog, requireAdminUser } from "@/app/api/admin/_utils";
import { logServerEvent } from "@/lib/ops";

export const runtime = "nodejs";

const patchSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "moderator", "none"]),
});

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdminUser(request);
    const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";

    const { data, error } = await admin
      .from("user_roles")
      .select(`
        user_id,
        role,
        created_at,
        users:user_id (
          email,
          nickname,
          school_id,
          department,
          schools:school_id ( name )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(120);

    if (error) {
      throw error;
    }

    const items = (data ?? [])
      .map((row) => {
        const user = Array.isArray(row.users) ? row.users[0] : row.users;
        const school = Array.isArray(user?.schools) ? user?.schools[0] : user?.schools;
        return {
          userId: String(row.user_id),
          role: row.role === "admin" ? "admin" : "moderator",
          createdAt: String(row.created_at),
          email: String(user?.email ?? ""),
          nickname: String(user?.nickname ?? "익명"),
          department: user?.department ? String(user.department) : undefined,
          schoolName: school?.name ? String(school.name) : undefined,
        };
      })
      .filter((item) => {
        if (!query) return true;
        return [item.email, item.nickname, item.department, item.schoolName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      });

    return NextResponse.json({ items });
  } catch (error) {
    logServerEvent("error", "admin_roles_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "권한 목록을 불러올 수 없습니다." },
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

    const { userId, role } = parsed.data;

    if (role === "none") {
      const { error } = await admin.from("user_roles").delete().eq("user_id", userId);
      if (error) {
        throw error;
      }
    } else {
      const { error } = await admin.from("user_roles").upsert({
        user_id: userId,
        role,
      });
      if (error) {
        throw error;
      }
    }

    await insertAdminAuditLog(admin, {
      adminUserId: user.id,
      action: "role_updated",
      targetType: "user",
      targetId: userId,
      summary:
        role === "none"
          ? "관리자 권한을 해제했습니다."
          : `${role} 권한으로 변경했습니다.`,
      metadata: {
        userId,
        role,
      },
    }).catch(() => null);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerEvent("error", "admin_roles_update_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "권한을 변경할 수 없습니다." },
      { status: 403 },
    );
  }
}
