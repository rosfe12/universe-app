"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MailCheck, RefreshCcw, ShieldAlert, ShieldMinus, TriangleAlert, UserRoundX } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { LoadingState } from "@/components/shared/loading-state";
import { TrustScoreBadge } from "@/components/shared/trust-score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  confirmReportsForTargetInSnapshot,
  dismissReportsForTargetInSnapshot,
  updateReportStatusInSnapshot,
  warnUserInSnapshot,
} from "@/lib/runtime-mutations";
import {
  getAdminSummary,
  getAnonymousHandle,
  getAutoHiddenContent,
  getBlockedContentCount,
  getLowTrustUsers,
  getReportedUsersForAdmin,
  getReports,
  getReportTargetLabel,
  getReportTargetUserId,
} from "@/lib/mock-queries";
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS } from "@/lib/constants";
import type { AdminAuditLog, AppRuntimeSnapshot, StudentVerificationRequest } from "@/types";

async function loadAdminVerificationRequests() {
  const response = await fetch("/api/admin/verification-requests", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { requests?: StudentVerificationRequest[]; error?: string }
    | null;

  if (!response.ok) {
    return {
      canManage: false,
      items: [] as StudentVerificationRequest[],
      error: payload?.error ?? "학생 인증 요청을 불러오지 못했습니다.",
    };
  }

  return {
    canManage: true,
    items: payload?.requests ?? [],
    error: "",
  };
}

async function updateAdminVerificationRequest(
  requestId: string,
  action: "approve" | "reject",
) {
  const response = await fetch("/api/admin/verification-requests", {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requestId,
      action,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        requests?: StudentVerificationRequest[];
        auditLogs?: AdminAuditLog[];
        error?: string;
      }
    | null;

  if (!response.ok) {
    return {
      canManage: false,
      items: [] as StudentVerificationRequest[],
      auditLogs: [] as AdminAuditLog[],
      error: payload?.error ?? "학생 인증 요청을 처리하지 못했습니다.",
    };
  }

  return {
    canManage: true,
    items: payload?.requests ?? [],
    auditLogs: payload?.auditLogs ?? [],
    error: "",
  };
}

async function loadAdminAuditLogs() {
  const response = await fetch("/api/admin/audit-logs", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { auditLogs?: AdminAuditLog[]; error?: string }
    | null;

  if (!response.ok) {
    return {
      items: [] as AdminAuditLog[],
      error: payload?.error ?? "운영 이력을 불러오지 못했습니다.",
    };
  }

  return {
    items: payload?.auditLogs ?? [],
    error: "",
  };
}

async function updateAdminReportStatus(
  reportId: string,
  status: "pending" | "reviewing" | "confirmed" | "dismissed",
) {
  const response = await fetch("/api/admin/reports", {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      reportId,
      status,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; auditLogs?: AdminAuditLog[]; error?: string }
    | null;

  if (!response.ok) {
    return {
      auditLogs: [] as AdminAuditLog[],
      error: payload?.error ?? "신고 상태를 변경하지 못했습니다.",
    };
  }

  return {
    auditLogs: payload?.auditLogs ?? [],
    error: "",
  };
}

async function updateAdminModerationAction(
  input:
    | {
        action: "warn_user";
        userId: string;
      }
    | {
        action: "restore_content" | "confirm_content";
        targetType: "post" | "comment" | "review" | "profile";
        targetId: string;
      },
) {
  const response = await fetch("/api/admin/moderation", {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; auditLogs?: AdminAuditLog[]; error?: string }
    | null;

  if (!response.ok) {
    return {
      auditLogs: [] as AdminAuditLog[],
      error: payload?.error ?? "관리자 작업을 처리하지 못했습니다.",
    };
  }

  return {
    auditLogs: payload?.auditLogs ?? [],
    error: "",
  };
}

export function AdminPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const {
    loading,
    refresh,
    setSnapshot,
    source,
    isAuthenticated,
  } = useAppRuntime(initialSnapshot);
  const summary = useMemo(() => getAdminSummary(), []);
  const reportItems = useMemo(() => getReports(), []);
  const autoHiddenItems = useMemo(() => getAutoHiddenContent(), []);
  const reportedUsers = useMemo(() => getReportedUsersForAdmin(), []);
  const lowTrustUsers = useMemo(() => getLowTrustUsers(), []);
  const [verificationItems, setVerificationItems] = useState<StudentVerificationRequest[]>([]);
  const [canManageVerifications, setCanManageVerifications] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [verificationPendingId, setVerificationPendingId] = useState<string | null>(null);
  const [reportPendingId, setReportPendingId] = useState<string | null>(null);
  const [moderationPendingKey, setModerationPendingKey] = useState<string | null>(null);
  const [adminDenied, setAdminDenied] = useState(false);
  const pendingVerificationCount = verificationItems.filter(
    (item) => item.status === "pending",
  ).length;
  const failedVerificationCount = verificationItems.filter(
    (item) => item.deliveryStatus === "failed",
  ).length;

  useEffect(() => {
    let active = true;

    async function loadVerificationRequests() {
      setVerificationLoading(true);
      if (!active) {
        return;
      }
      const result = await loadAdminVerificationRequests();

      if (!active) {
        return;
      }
      setVerificationItems(result.items);
      setCanManageVerifications(result.canManage);
      setVerificationError(result.error ?? "");
      setVerificationLoading(false);
      setAdminDenied(source === "supabase" && !result.canManage);
    }

    async function refreshAuditLogs() {
      setAuditLoading(true);
      const result = await loadAdminAuditLogs();

      if (!active) {
        return;
      }

      setAuditLogs(result.items);
      setAuditError(result.error);
      setAuditLoading(false);
    }

    void loadVerificationRequests();
    void refreshAuditLogs();

    return () => {
      active = false;
    };
  }, [source]);

  async function mutateVerificationRequest(
    requestId: string,
    action: "approve" | "reject",
  ) {
    setVerificationError("");
    setVerificationPendingId(requestId);
    try {
      const result = await updateAdminVerificationRequest(requestId, action);
      setVerificationItems(result.items);
      setCanManageVerifications(result.canManage);
      setVerificationError(result.error ?? "");
      if (result.auditLogs.length > 0) {
        setAuditLogs(result.auditLogs);
        setAuditError("");
      }
      if (!result.error) {
        await refresh();
      }
    } finally {
      setVerificationPendingId(null);
    }
  }

  async function mutateReportStatus(
    reportId: string,
    status: "pending" | "reviewing" | "confirmed" | "dismissed",
  ) {
    setAuditError("");
    setReportPendingId(reportId);
    try {
      const result = await updateAdminReportStatus(reportId, status);
      if (result.error) {
        setAuditError(result.error);
        return;
      }
      if (result.auditLogs.length > 0) {
        setAuditLogs(result.auditLogs);
        setAuditError("");
      }
      await refresh();
    } finally {
      setReportPendingId(null);
    }
  }

  async function mutateModerationAction(
    input:
      | { action: "warn_user"; userId: string }
      | {
          action: "restore_content" | "confirm_content";
          targetType: "post" | "comment" | "review" | "profile";
          targetId: string;
        },
  ) {
    setAuditError("");
    const pendingKey =
      input.action === "warn_user"
        ? `warn:${input.userId}`
        : `${input.action}:${input.targetType}:${input.targetId}`;
    setModerationPendingKey(pendingKey);

    try {
      const result = await updateAdminModerationAction(input);
      if (result.error) {
        setAuditError(result.error);
        return;
      }
      if (result.auditLogs.length > 0) {
        setAuditLogs(result.auditLogs);
        setAuditError("");
      }
      await refresh();
    } finally {
      setModerationPendingKey(null);
    }
  }

  return (
    <AppShell
      title="관리자"
      subtitle="신고, 숨김, 사용자 상태를 한 곳에서 관리합니다"
      showTabs={false}
    >
      {!loading && !isAuthenticated ? (
        <Card className="border-dashed border-white/80 bg-white/92">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="space-y-1">
              <p className="font-semibold">관리자 로그인 필요</p>
              <p className="text-sm text-muted-foreground">
                관리자 화면은 로그인 후 접근할 수 있습니다.
              </p>
            </div>
            <Button asChild className="min-w-[180px]">
              <Link href="/login?next=%2Fadmin">로그인하기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {!loading && isAuthenticated && adminDenied ? (
        <Card className="border-dashed border-white/80 bg-white/92">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="space-y-1">
              <p className="font-semibold">관리자 권한이 필요합니다</p>
              <p className="text-sm text-muted-foreground">
                현재 계정은 관리자 작업 권한이 없습니다.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAdminDenied(false);
                void refresh();
              }}
            >
              다시 확인
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {!loading && (!isAuthenticated || adminDenied) ? null : (
        <>
      {loading ? <LoadingState /> : null}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="전체 신고" value={`${summary.total}건`} icon={ShieldAlert} />
        <SummaryCard label="자동 숨김" value={`${summary.autoHidden}건`} icon={ShieldMinus} />
        <SummaryCard label="검토 중" value={`${summary.reviewing}건`} icon={TriangleAlert} />
        <SummaryCard label="저신뢰 사용자" value={`${summary.lowTrust}명`} icon={UserRoundX} />
      </div>

      <Card className="border-amber-200 bg-amber-50/90">
        <CardContent className="space-y-2 py-5 text-sm text-amber-900">
          <p className="font-semibold">운영 기준</p>
          <p>신고 3건 이상 콘텐츠는 자동 숨김 처리됩니다.</p>
          <p>허위 신고로 판단된 신고자는 경고가 누적되고, 3회 이상이면 제한 후보가 됩니다.</p>
          <p>차단한 사용자 콘텐츠는 일반 피드에서 숨김 처리됩니다. 현재 숨김 수 {getBlockedContentCount()}건.</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="verification">학생 인증</TabsTrigger>
          <TabsTrigger value="reports">신고 목록</TabsTrigger>
          <TabsTrigger value="audit">운영 이력</TabsTrigger>
          <TabsTrigger value="hidden">자동 숨김</TabsTrigger>
          <TabsTrigger value="reported-users">신고 많은 사용자</TabsTrigger>
          <TabsTrigger value="low-trust">낮은 신뢰도</TabsTrigger>
        </TabsList>

        <TabsContent value="verification" className="space-y-3">
          {verificationLoading ? <LoadingState /> : null}
          {verificationError ? (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="py-4 text-sm text-rose-700">
                {verificationError}
              </CardContent>
            </Card>
          ) : null}
          <Card className="border-sky-200 bg-sky-50/80">
            <CardContent className="flex items-center justify-between gap-3 py-5">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-sky-950">학교 메일 인증 대기</p>
                <p className="text-sm text-sky-900/70">
                  현재 확인이 필요한 요청 {pendingVerificationCount}건 · 발송 실패 {failedVerificationCount}건
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{verificationItems.length}건</Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={verificationLoading}
                  onClick={() => {
                    void refresh();
                    setVerificationLoading(true);
                    void loadAdminVerificationRequests().then((result) => {
                      setVerificationItems(result.items);
                      setCanManageVerifications(result.canManage);
                      setVerificationError(result.error ?? "");
                      setVerificationLoading(false);
                    });
                  }}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  새로고침
                </Button>
              </div>
            </CardContent>
          </Card>
          {verificationItems.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                아직 들어온 학교 메일 인증 요청이 없습니다.
              </CardContent>
            </Card>
          ) : null}
          {verificationItems.map((item) => (
            <VerificationRequestCard
              key={item.id}
              item={item}
              canManage={canManageVerifications}
              pendingAction={verificationPendingId === item.id ? "pending" : undefined}
              onApprove={() => {
                if (source === "supabase") {
                  void mutateVerificationRequest(item.id, "approve");
                  return;
                }

                setVerificationItems((current) =>
                  current.map((request) =>
                    request.id === item.id
                      ? {
                          ...request,
                          status: "verified",
                          verifiedAt: new Date().toISOString(),
                          studentVerificationStatus: "verified",
                        }
                      : request,
                  ),
                );
              }}
              onReject={() => {
                if (source === "supabase") {
                  void mutateVerificationRequest(item.id, "reject");
                  return;
                }

                setVerificationItems((current) =>
                  current.map((request) =>
                    request.id === item.id
                      ? {
                          ...request,
                          status: "cancelled",
                          verifiedAt: undefined,
                          studentVerificationStatus: "rejected",
                        }
                      : request,
                  ),
                );
              }}
            />
          ))}
        </TabsContent>

        <TabsContent value="reports" className="space-y-3">
          {reportItems.map((item) => {
            const targetUserId = getReportTargetUserId(item.targetType, item.targetId);

            return (
              <Card key={item.id}>
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {getReportTargetLabel(item.targetType, item.targetId)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        신고자 {getAnonymousHandle(item.reporterId)} · {item.createdAt.slice(0, 16)}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(item.status)}>
                      {REPORT_STATUS_LABELS[item.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{REPORT_REASON_LABELS[item.reason]}</Badge>
                    <Badge variant="secondary">{item.targetType}</Badge>
                    {targetUserId ? (
                      <TrustScoreBadge score={reportedUsers.find((user) => user.id === targetUserId)?.trustScore ?? 0} />
                    ) : null}
                  </div>
                  {item.memo ? (
                    <p className="rounded-[20px] bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
                      {item.memo}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {(["pending", "reviewing", "confirmed", "dismissed"] as const).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={item.status === status ? "default" : "outline"}
                      disabled={reportPendingId === item.id}
                      onClick={async () => {
                        if (source === "supabase") {
                          await mutateReportStatus(item.id, status);
                          return;
                        }

                        setSnapshot((snapshot) =>
                          updateReportStatusInSnapshot(snapshot, item.id, status),
                        );
                      }}
                    >
                      {REPORT_STATUS_LABELS[status]}
                    </Button>
                  ))}
                  {targetUserId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={moderationPendingKey === `warn:${targetUserId}`}
                      onClick={() => {
                        if (source === "supabase") {
                          void mutateModerationAction({
                            action: "warn_user",
                            userId: targetUserId,
                          });
                          return;
                        }

                        setSnapshot((snapshot) => warnUserInSnapshot(snapshot, targetUserId));
                      }}
                    >
                      경고 상태 표시
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="audit" className="space-y-3">
          {auditLoading ? <LoadingState /> : null}
          {auditError ? (
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="py-4 text-sm text-rose-700">{auditError}</CardContent>
            </Card>
          ) : null}
          {auditLogs.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                아직 기록된 운영 이력이 없습니다.
              </CardContent>
            </Card>
          ) : null}
          {auditLogs.map((log) => (
            <Card key={log.id}>
              <CardContent className="space-y-2 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold">{log.summary}</p>
                    <p className="text-sm text-muted-foreground">
                      {getAnonymousHandle(log.adminUserId)} · {log.createdAt.slice(0, 16)}
                    </p>
                  </div>
                  <Badge variant="outline">{log.action}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{log.targetType}</Badge>
                  {log.targetId ? <Badge variant="secondary">{log.targetId.slice(0, 8)}</Badge> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="hidden" className="space-y-3">
          {autoHiddenItems.map((item) => (
            <Card key={`${item.targetType}-${item.id}`}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      신고 누적으로 숨김 처리된 콘텐츠입니다. 현재 신고 {item.reportCount}건
                    </p>
                  </div>
                  <Badge variant="danger">auto_hidden</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={moderationPendingKey === `restore_content:${item.targetType}:${item.id}`}
                  onClick={() => {
                    if (source === "supabase") {
                      void mutateModerationAction({
                        action: "restore_content",
                        targetType: item.targetType,
                        targetId: item.id,
                      });
                      return;
                    }

                    setSnapshot((snapshot) =>
                      dismissReportsForTargetInSnapshot(snapshot, item.targetType, item.id),
                    );
                  }}
                >
                  숨김 해제
                </Button>
                <Button
                  size="sm"
                  disabled={moderationPendingKey === `confirm_content:${item.targetType}:${item.id}`}
                  onClick={() => {
                    if (source === "supabase") {
                      void mutateModerationAction({
                        action: "confirm_content",
                        targetType: item.targetType,
                        targetId: item.id,
                      });
                      return;
                    }

                    setSnapshot((snapshot) =>
                      confirmReportsForTargetInSnapshot(snapshot, item.targetType, item.id),
                    );
                  }}
                >
                  유지
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={moderationPendingKey === `warn:${item.authorId}`}
                  onClick={() => {
                    if (source === "supabase") {
                      void mutateModerationAction({
                        action: "warn_user",
                        userId: item.authorId,
                      });
                      return;
                    }

                    setSnapshot((snapshot) => warnUserInSnapshot(snapshot, item.authorId));
                  }}
                >
                  경고 상태 표시
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reported-users" className="space-y-3">
          {reportedUsers.map((user) => (
            <UserModerationCard
              key={user.id}
              title={getAnonymousHandle(user.id)}
              subtitle={`신고 ${user.reportCount ?? 0}건 · 경고 ${user.warningCount ?? 0}회`}
              trustScore={user.trustScore}
              restricted={Boolean(user.isRestricted)}
              warningPending={moderationPendingKey === `warn:${user.id}`}
              onWarn={() => {
                if (source === "supabase") {
                  void mutateModerationAction({
                    action: "warn_user",
                    userId: user.id,
                  });
                  return;
                }

                setSnapshot((snapshot) => warnUserInSnapshot(snapshot, user.id));
              }}
            />
          ))}
        </TabsContent>

        <TabsContent value="low-trust" className="space-y-3">
          {lowTrustUsers.map((user) => (
            <UserModerationCard
              key={user.id}
              title={getAnonymousHandle(user.id)}
              subtitle={`낮은 신뢰도 사용자 · 신고 ${user.reportCount ?? 0}건`}
              trustScore={user.trustScore}
              restricted={Boolean(user.isRestricted)}
              warningPending={moderationPendingKey === `warn:${user.id}`}
              onWarn={() => {
                if (source === "supabase") {
                  void mutateModerationAction({
                    action: "warn_user",
                    userId: user.id,
                  });
                  return;
                }

                setSnapshot((snapshot) => warnUserInSnapshot(snapshot, user.id));
              }}
            />
          ))}
        </TabsContent>
      </Tabs>
        </>
      )}
    </AppShell>
  );
}

function VerificationRequestCard({
  item,
  canManage,
  pendingAction,
  onApprove,
  onReject,
}: {
  item: StudentVerificationRequest;
  canManage: boolean;
  pendingAction?: "pending";
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{item.schoolName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {item.userNickname}
              {item.userDepartment ? ` · ${item.userDepartment}` : ""}
              {item.userGrade ? ` · ${item.userGrade}학년` : ""}
            </p>
          </div>
          <Badge variant={getVerificationStatusVariant(item.status)}>
            {getVerificationStatusLabel(item.status, item.studentVerificationStatus)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{item.schoolEmail}</Badge>
          <Badge variant={getDeliveryStatusVariant(item.deliveryStatus)}>
            {getDeliveryStatusLabel(item.deliveryMethod, item.deliveryStatus)}
          </Badge>
          <TrustScoreBadge score={item.trustScore} />
          <Badge variant="secondary">신고 {item.reportCount}건</Badge>
          <Badge variant="secondary">경고 {item.warningCount}회</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          요청 {item.requestedAt.slice(0, 16)} · 만료 {item.expiresAt.slice(0, 16)}
        </p>
        {item.deliveryError ? (
          <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            발송 오류 · {item.deliveryError}
          </div>
        ) : null}
        {item.deliveredAt ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MailCheck className="h-3.5 w-3.5" />
            {item.deliveredAt.slice(0, 16)} 발송 완료
          </div>
        ) : null}
      </CardHeader>
      {canManage ? (
        <CardContent className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={item.status === "verified" || pendingAction === "pending"}
          >
            승인
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={item.status !== "pending" || pendingAction === "pending"}
          >
            반려
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ShieldAlert;
}) {
  return (
    <Card className="border-none bg-secondary/60 shadow-none">
      <CardContent className="space-y-2 py-4">
        <div className="flex items-center gap-2 text-primary">
          <Icon className="h-4 w-4" />
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function UserModerationCard({
  title,
  subtitle,
  trustScore,
  restricted,
  warningPending,
  onWarn,
}: {
  title: string;
  subtitle: string;
  trustScore: number;
  restricted: boolean;
  warningPending?: boolean;
  onWarn: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-5">
        <div className="space-y-2">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          <div className="flex items-center gap-2">
            <TrustScoreBadge score={trustScore} />
            {restricted ? <Badge variant="danger">restricted</Badge> : null}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onWarn} disabled={warningPending}>
          경고 상태 표시
        </Button>
      </CardContent>
    </Card>
  );
}

function getStatusVariant(status: keyof typeof REPORT_STATUS_LABELS) {
  if (status === "pending") return "danger";
  if (status === "reviewing") return "warning";
  if (status === "confirmed") return "success";
  return "outline";
}

function getVerificationStatusLabel(
  status: StudentVerificationRequest["status"],
  studentVerificationStatus: StudentVerificationRequest["studentVerificationStatus"],
) {
  if (status === "verified") return "인증 완료";
  if (studentVerificationStatus === "rejected") return "반려";
  if (status === "expired") return "만료";
  if (status === "cancelled") return "취소";
  return "대기";
}

function getVerificationStatusVariant(status: StudentVerificationRequest["status"]) {
  if (status === "verified") return "success";
  if (status === "pending") return "warning";
  if (status === "expired") return "danger";
  return "outline";
}

function getDeliveryStatusLabel(
  deliveryMethod: StudentVerificationRequest["deliveryMethod"],
  deliveryStatus: StudentVerificationRequest["deliveryStatus"],
) {
  const methodLabel =
    deliveryMethod === "app_smtp"
      ? "앱 SMTP"
      : deliveryMethod === "supabase_auth"
        ? "Supabase 메일"
        : "발송 대기";

  if (deliveryStatus === "sent") return `${methodLabel} 발송 완료`;
  if (deliveryStatus === "failed") return `${methodLabel} 발송 실패`;
  if (deliveryStatus === "rate_limited") return `${methodLabel} 잠시 대기`;
  return methodLabel;
}

function getDeliveryStatusVariant(
  status: StudentVerificationRequest["deliveryStatus"],
) {
  if (status === "sent") return "success";
  if (status === "failed") return "danger";
  if (status === "rate_limited") return "warning";
  return "outline";
}
