import { NextResponse } from "next/server";

import { listAdminAuditLogs, requireAdminUser } from "@/app/api/admin/_utils";
import { logServerEvent } from "@/lib/ops";
import type {
  AdminOpsEvent,
  AdminOverview,
  AdminSchoolStat,
  ReportReason,
  School,
} from "@/types";

export const runtime = "nodejs";

function mapOpsEvent(row: {
  id: string;
  level: string;
  event: string;
  source: string;
  metadata: unknown;
  created_at: string;
}): AdminOpsEvent {
  return {
    id: String(row.id),
    level:
      row.level === "warn" || row.level === "error" || row.level === "info"
        ? row.level
        : "info",
    event: String(row.event),
    source: String(row.source),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : undefined,
    createdAt: String(row.created_at),
  };
}

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdminUser(request);

    const [
      totalMembersResult,
      restrictedMembersResult,
      pendingVerificationResult,
      failedVerificationRowsResult,
      allReportsResult,
      reviewingReportsResult,
      postHiddenResult,
      commentHiddenResult,
      reviewHiddenResult,
      profileHiddenResult,
      roleRowsResult,
      schoolRowsResult,
      opsErrorRowsResult,
      opsWarnRowsResult,
      moderationHistoryResult,
      memberStatsResult,
      schoolPostRowsResult,
    ] = await Promise.all([
      admin.from("users").select("id", { count: "exact", head: true }),
      admin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("is_restricted", true),
      admin
        .from("student_verification_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      admin
        .from("student_verification_requests")
        .select("id, delivery_status")
        .eq("delivery_status", "failed")
        .limit(100),
      admin.from("reports").select("id, reason"),
      admin
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "reviewing"),
      admin
        .from("posts")
        .select("id", { count: "exact", head: true })
        .or("admin_hidden.eq.true,auto_hidden.eq.true"),
      admin
        .from("comments")
        .select("id", { count: "exact", head: true })
        .or("admin_hidden.eq.true,auto_hidden.eq.true"),
      admin
        .from("lecture_reviews")
        .select("id", { count: "exact", head: true })
        .or("admin_hidden.eq.true,auto_hidden.eq.true"),
      admin
        .from("dating_profiles")
        .select("id", { count: "exact", head: true })
        .or("admin_hidden.eq.true,auto_hidden.eq.true"),
      admin.from("user_roles").select("user_id, role").limit(200),
      admin.from("schools").select("id, name, domain, city").order("name"),
      admin
        .from("ops_events")
        .select("id, level, event, source, metadata, created_at")
        .eq("level", "error")
        .order("created_at", { ascending: false })
        .limit(12),
      admin
        .from("ops_events")
        .select("id, level, event, source, metadata, created_at")
        .eq("level", "warn")
        .order("created_at", { ascending: false })
        .limit(24),
      listAdminAuditLogs(admin),
      admin.from("users").select("school_id, verified, is_restricted, report_count"),
      admin.from("posts").select("school_id").not("school_id", "is", null),
    ]);

    if (
      totalMembersResult.error ||
      restrictedMembersResult.error ||
      pendingVerificationResult.error ||
      failedVerificationRowsResult.error ||
      allReportsResult.error ||
      reviewingReportsResult.error ||
      postHiddenResult.error ||
      commentHiddenResult.error ||
      reviewHiddenResult.error ||
      profileHiddenResult.error ||
      roleRowsResult.error ||
      schoolRowsResult.error ||
      opsErrorRowsResult.error ||
      opsWarnRowsResult.error
      || memberStatsResult.error
      || schoolPostRowsResult.error
    ) {
      throw (
        totalMembersResult.error ??
        restrictedMembersResult.error ??
        pendingVerificationResult.error ??
        failedVerificationRowsResult.error ??
        allReportsResult.error ??
        reviewingReportsResult.error ??
        postHiddenResult.error ??
        commentHiddenResult.error ??
        reviewHiddenResult.error ??
        profileHiddenResult.error ??
        roleRowsResult.error ??
        schoolRowsResult.error ??
        opsErrorRowsResult.error ??
        opsWarnRowsResult.error ??
        memberStatsResult.error ??
        schoolPostRowsResult.error
      );
    }

    const reportReasonMap = new Map<ReportReason, number>();
    for (const reason of [
      "misinformation",
      "abuse",
      "spam",
      "harassment",
      "fraud",
      "sexual_content",
      "other",
    ] as const) {
      reportReasonMap.set(reason, 0);
    }

    for (const report of allReportsResult.data ?? []) {
      const reason =
        report.reason === "misinformation" ||
        report.reason === "abuse" ||
        report.reason === "spam" ||
        report.reason === "harassment" ||
        report.reason === "fraud" ||
        report.reason === "sexual_content" ||
        report.reason === "other"
          ? report.reason
          : "other";
      reportReasonMap.set(reason, (reportReasonMap.get(reason) ?? 0) + 1);
    }

    const roleRows = roleRowsResult.data ?? [];
    const adminCount = roleRows.filter((item) => item.role === "admin").length;
    const moderatorCount = roleRows.filter((item) => item.role === "moderator").length;

    const recentSlowEvents = (opsWarnRowsResult.data ?? [])
      .map(mapOpsEvent)
      .filter((item) => typeof item.metadata?.durationMs === "number")
      .slice(0, 10);

    const schoolRows = schoolRowsResult.data ?? [];
    const schoolStatsMap = new Map<
      string,
      {
        schoolId: string;
        schoolName: string;
        memberCount: number;
        verifiedCount: number;
        restrictedCount: number;
        reportCount: number;
        postCount: number;
      }
    >(
      schoolRows.map((school) => [
        String(school.id),
        {
          schoolId: String(school.id),
          schoolName: String(school.name),
          memberCount: 0,
          verifiedCount: 0,
          restrictedCount: 0,
          reportCount: 0,
          postCount: 0,
        },
      ]),
    );

    for (const row of memberStatsResult.data ?? []) {
      if (!row.school_id) {
        continue;
      }

      const key = String(row.school_id);
      const stat = schoolStatsMap.get(key);
      if (!stat) {
        continue;
      }

      stat.memberCount += 1;
      if (row.verified) {
        stat.verifiedCount += 1;
      }
      if (row.is_restricted) {
        stat.restrictedCount += 1;
      }
      stat.reportCount += typeof row.report_count === "number" ? row.report_count : 0;
    }

    for (const row of schoolPostRowsResult.data ?? []) {
      if (!row.school_id) {
        continue;
      }

      const stat = schoolStatsMap.get(String(row.school_id));
      if (stat) {
        stat.postCount += 1;
      }
    }

    const schoolStats: AdminSchoolStat[] = Array.from(schoolStatsMap.values())
      .filter((item) => item.memberCount > 0 || item.postCount > 0)
      .sort(
        (a, b) =>
          b.memberCount - a.memberCount ||
          b.postCount - a.postCount ||
          a.schoolName.localeCompare(b.schoolName, "ko"),
      );

    const overview: AdminOverview = {
      totalMembers: totalMembersResult.count ?? 0,
      restrictedMembers: restrictedMembersResult.count ?? 0,
      adminCount,
      moderatorCount,
      pendingVerificationCount: pendingVerificationResult.count ?? 0,
      failedVerificationCount: (failedVerificationRowsResult.data ?? []).length,
      hiddenContentCount:
        (postHiddenResult.count ?? 0) +
        (commentHiddenResult.count ?? 0) +
        (reviewHiddenResult.count ?? 0) +
        (profileHiddenResult.count ?? 0),
      reportCount: (allReportsResult.data ?? []).length,
      reviewingReportCount: reviewingReportsResult.count ?? 0,
      reportReasonStats: Array.from(reportReasonMap.entries()).map(([reason, count]) => ({
        reason,
        count,
      })),
      moderationHistory: moderationHistoryResult.filter(
        (item) =>
          (item.action === "hide_content" ||
            item.action === "restore_content" ||
            item.action === "confirm_content") &&
          (item.targetType === "post" ||
            item.targetType === "comment" ||
            item.targetType === "review"),
      ),
      recentErrorEvents: (opsErrorRowsResult.data ?? []).map(mapOpsEvent),
      recentSlowEvents,
      schools: schoolRows.map(
        (school): School => ({
          id: String(school.id),
          name: String(school.name),
          domain: String(school.domain),
          city: String(school.city ?? ""),
        }),
      ),
      schoolStats,
    };

    return NextResponse.json(overview);
  } catch (error) {
    logServerEvent("error", "admin_overview_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "운영 현황을 불러올 수 없습니다." },
      { status: 403 },
    );
  }
}
