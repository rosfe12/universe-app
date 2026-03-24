import { NextResponse } from "next/server";

import { requireAdminUser } from "@/app/api/admin/_utils";
import { logServerEvent } from "@/lib/ops";
import type { AdminMember } from "@/types";

export const runtime = "nodejs";

const PAGE_SIZE = 20;

function normalizeQuery(raw: string | null) {
  return (raw ?? "").trim().slice(0, 60);
}

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdminUser(request);
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
    const queryText = normalizeQuery(searchParams.get("q"));
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let usersQuery = admin
      .from("users")
      .select(
        "id, email, nickname, name, user_type, school_id, department, grade, verified, adult_verified, student_verification_status, school_email, trust_score, report_count, warning_count, is_restricted, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (queryText) {
      const escaped = queryText.replace(/[%_]/g, "");
      usersQuery = usersQuery.or(
        `email.ilike.%${escaped}%,nickname.ilike.%${escaped}%,name.ilike.%${escaped}%`,
      );
    }

    const { data: userRows, error: usersError, count } = await usersQuery;

    if (usersError) {
      throw usersError;
    }

    const rows = userRows ?? [];
    const userIds = rows.map((row) => String(row.id));
    const schoolIds = Array.from(
      new Set(rows.map((row) => row.school_id).filter((value): value is string => Boolean(value))),
    );

    const [rolesResult, schoolsResult] = await Promise.all([
      userIds.length > 0
        ? admin.from("user_roles").select("user_id, role").in("user_id", userIds)
        : Promise.resolve({ data: [], error: null }),
      schoolIds.length > 0
        ? admin.from("schools").select("id, name").in("id", schoolIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (rolesResult.error) {
      throw rolesResult.error;
    }

    if (schoolsResult.error) {
      throw schoolsResult.error;
    }

    const schoolNameById = new Map(
      (schoolsResult.data ?? []).map((school) => [String(school.id), String(school.name)]),
    );
    const roleByUserId = new Map(
      (rolesResult.data ?? []).map((role) => [
        String(role.user_id),
        role.role === "admin" || role.role === "moderator" ? role.role : undefined,
      ]),
    );

    const members: AdminMember[] = rows.map((row) => ({
      id: String(row.id),
      email: String(row.email ?? ""),
      nickname: String(row.nickname ?? "익명"),
      name: row.name ? String(row.name) : undefined,
      userType:
        row.user_type === "student" ||
        row.user_type === "applicant" ||
        row.user_type === "freshman"
          ? row.user_type
          : "student",
      schoolId: row.school_id ? String(row.school_id) : undefined,
      schoolName: row.school_id ? schoolNameById.get(String(row.school_id)) : undefined,
      department: row.department ? String(row.department) : undefined,
      grade: typeof row.grade === "number" ? row.grade : undefined,
      verified: Boolean(row.verified),
      adultVerified: Boolean(row.adult_verified),
      studentVerificationStatus:
        row.student_verification_status === "none" ||
        row.student_verification_status === "unverified" ||
        row.student_verification_status === "pending" ||
        row.student_verification_status === "verified" ||
        row.student_verification_status === "rejected"
          ? row.student_verification_status
          : "unverified",
      schoolEmail: row.school_email ? String(row.school_email) : undefined,
      trustScore: typeof row.trust_score === "number" ? row.trust_score : 0,
      reportCount: typeof row.report_count === "number" ? row.report_count : 0,
      warningCount: typeof row.warning_count === "number" ? row.warning_count : 0,
      isRestricted: Boolean(row.is_restricted),
      role: roleByUserId.get(String(row.id)),
      createdAt: String(row.created_at),
    }));

    return NextResponse.json({
      members,
      total: count ?? members.length,
      page,
      pageSize: PAGE_SIZE,
      hasNext: (count ?? 0) > to + 1,
      query: queryText,
    });
  } catch (error) {
    logServerEvent("error", "admin_members_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "회원 목록을 불러올 수 없습니다." },
      { status: 403 },
    );
  }
}
