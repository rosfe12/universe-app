import { NextResponse } from "next/server";

import { requireAdminUser } from "@/app/api/admin/_utils";
import { logServerEvent } from "@/lib/ops";
import type { AdminMember } from "@/types";

export const runtime = "nodejs";

const PAGE_SIZE = 20;
const AUTH_PAGE_SIZE = 200;
const AUTH_MAX_USERS = 1000;

type MemberSort = "joined_desc" | "joined_asc" | "last_sign_in_desc" | "last_sign_in_asc";
type MemberStatusFilter = "all" | "restricted" | "verified" | "unverified";

function normalizeQuery(raw: string | null) {
  return (raw ?? "").trim().slice(0, 80);
}

function toTimestamp(value?: string) {
  return value ? new Date(value).getTime() : 0;
}

async function listAllAuthUsers(admin: Awaited<ReturnType<typeof requireAdminUser>>["admin"]) {
  const users: Array<{
    id: string;
    email: string;
    created_at?: string;
    last_sign_in_at?: string | null;
  }> = [];

  for (let page = 1; users.length < AUTH_MAX_USERS; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });

    if (error) {
      throw error;
    }

    const batch = data.users.map((item) => ({
      id: item.id,
      email: item.email ?? "",
      created_at: item.created_at,
      last_sign_in_at: item.last_sign_in_at,
    }));
    users.push(...batch);

    if (batch.length < AUTH_PAGE_SIZE) {
      break;
    }
  }

  return users.slice(0, AUTH_MAX_USERS);
}

function createCsvResponse(members: AdminMember[]) {
  const escapeCell = (value: string | number | boolean | undefined) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    [
      "이메일",
      "닉네임",
      "이름",
      "유형",
      "학교",
      "학과",
      "학년",
      "학교인증",
      "성인인증",
      "제한",
      "역할",
      "가입일",
      "최근로그인",
    ].join(","),
    ...members.map((member) =>
      [
        member.email,
        member.nickname,
        member.name,
        member.userType,
        member.schoolName,
        member.department,
        member.grade,
        member.verified,
        member.adultVerified,
        member.isRestricted,
        member.role,
        member.createdAt,
        member.lastSignInAt,
      ]
        .map(escapeCell)
        .join(","),
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="camverse-members.csv"',
    },
  });
}

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdminUser(request);
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
    const queryText = normalizeQuery(searchParams.get("q"));
    const schoolId = searchParams.get("schoolId")?.trim() || "";
    const sort = (searchParams.get("sort") as MemberSort | null) ?? "joined_desc";
    const status = (searchParams.get("status") as MemberStatusFilter | null) ?? "all";
    const format = searchParams.get("format");

    const authUsers = await listAllAuthUsers(admin);
    const userIds = authUsers.map((item) => item.id);

    if (userIds.length === 0) {
      return NextResponse.json({
        members: [],
        total: 0,
        page,
        pageSize: PAGE_SIZE,
        hasNext: false,
      });
    }

    const [{ data: profileRows, error: profilesError }, { data: roleRows, error: rolesError }] =
      await Promise.all([
        admin
          .from("users")
          .select(
            "id, email, nickname, name, user_type, school_id, department, grade, verified, adult_verified, student_verification_status, verification_state, verification_score, verification_rejection_reason, student_number, admission_year, school_email, trust_score, report_count, warning_count, is_restricted, created_at",
          )
          .in("id", userIds),
        admin
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds),
      ]);

    if (profilesError) {
      throw profilesError;
    }

    if (rolesError) {
      throw rolesError;
    }

    const profiles = profileRows ?? [];
    const schoolIds = Array.from(
      new Set(
        profiles
          .map((row) => row.school_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const { data: schoolRows, error: schoolsError } =
      schoolIds.length > 0
        ? await admin.from("schools").select("id, name").in("id", schoolIds)
        : { data: [], error: null };

    if (schoolsError) {
      throw schoolsError;
    }

    const authById = new Map(authUsers.map((item) => [item.id, item]));
    const schoolNameById = new Map(
      (schoolRows ?? []).map((school) => [String(school.id), String(school.name)]),
    );
    const roleByUserId = new Map(
      (roleRows ?? []).map((role) => [
        String(role.user_id),
        role.role === "admin" || role.role === "moderator" ? role.role : undefined,
      ]),
    );

    let members: AdminMember[] = profiles.map((row) => {
      const authUser = authById.get(String(row.id));
      return {
        id: String(row.id),
        email: authUser?.email ?? String(row.email ?? ""),
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
        verificationState:
          row.verification_state === "guest" ||
          row.verification_state === "email_verified" ||
          row.verification_state === "student_verified" ||
          row.verification_state === "manual_review" ||
          row.verification_state === "rejected"
            ? row.verification_state
            : undefined,
        verificationScore:
          typeof row.verification_score === "number" ? row.verification_score : undefined,
        studentNumber: row.student_number ? String(row.student_number) : undefined,
        admissionYear: typeof row.admission_year === "number" ? row.admission_year : undefined,
        verificationRejectionReason: row.verification_rejection_reason
          ? String(row.verification_rejection_reason)
          : undefined,
        schoolEmail: row.school_email ? String(row.school_email) : undefined,
        trustScore: typeof row.trust_score === "number" ? row.trust_score : 0,
        reportCount: typeof row.report_count === "number" ? row.report_count : 0,
        warningCount: typeof row.warning_count === "number" ? row.warning_count : 0,
        isRestricted: Boolean(row.is_restricted),
        role: roleByUserId.get(String(row.id)),
        createdAt: authUser?.created_at ?? String(row.created_at),
        lastSignInAt: authUser?.last_sign_in_at ?? undefined,
      };
    });

    if (queryText) {
      const q = queryText.toLowerCase();
      members = members.filter((member) =>
        [
          member.email,
          member.nickname,
          member.name,
          member.department,
          member.schoolName,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      );
    }

    if (schoolId) {
      members = members.filter((member) => member.schoolId === schoolId);
    }

    if (status === "restricted") {
      members = members.filter((member) => member.isRestricted);
    } else if (status === "verified") {
      members = members.filter((member) => member.verified);
    } else if (status === "unverified") {
      members = members.filter((member) => !member.verified);
    }

    members.sort((a, b) => {
      if (sort === "joined_asc") {
        return toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
      }
      if (sort === "last_sign_in_desc") {
        return toTimestamp(b.lastSignInAt) - toTimestamp(a.lastSignInAt);
      }
      if (sort === "last_sign_in_asc") {
        return toTimestamp(a.lastSignInAt) - toTimestamp(b.lastSignInAt);
      }
      return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
    });

    if (format === "csv") {
      return createCsvResponse(members);
    }

    const total = members.length;
    const from = (page - 1) * PAGE_SIZE;
    const items = members.slice(from, from + PAGE_SIZE);

    return NextResponse.json({
      members: items,
      total,
      page,
      pageSize: PAGE_SIZE,
      hasNext: from + PAGE_SIZE < total,
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
