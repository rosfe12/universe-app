"use client";

import { useMemo } from "react";
import { ShieldAlert, ShieldMinus, TriangleAlert, UserRoundX } from "lucide-react";

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
import { updateReportStatusRecord } from "@/lib/supabase/app-data";

export function AdminPage() {
  const { loading, reports, source, isAuthenticated, setSnapshot } = useAppRuntime();
  const summary = useMemo(() => getAdminSummary(), [reports]);
  const reportItems = useMemo(() => getReports(), [reports]);
  const autoHiddenItems = useMemo(() => getAutoHiddenContent(), [reports]);
  const reportedUsers = useMemo(() => getReportedUsersForAdmin(), [reports]);
  const lowTrustUsers = useMemo(() => getLowTrustUsers(), [reports]);

  return (
    <AppShell
      title="관리자"
      subtitle="신고, 자동 숨김, 저신뢰 사용자 흐름을 한 번에 보는 운영 MVP"
      showTabs={false}
    >
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
          <TabsTrigger value="reports">신고 목록</TabsTrigger>
          <TabsTrigger value="hidden">자동 숨김</TabsTrigger>
          <TabsTrigger value="reported-users">신고 많은 사용자</TabsTrigger>
          <TabsTrigger value="low-trust">낮은 신뢰도</TabsTrigger>
        </TabsList>

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
                      onClick={async () => {
                        if (source === "supabase" && isAuthenticated) {
                          await updateReportStatusRecord(item.id, status);
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
                      onClick={() =>
                        setSnapshot((snapshot) => warnUserInSnapshot(snapshot, targetUserId))
                      }
                    >
                      경고 상태 표시
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
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
                  onClick={() =>
                    setSnapshot((snapshot) =>
                      dismissReportsForTargetInSnapshot(snapshot, item.targetType, item.id),
                    )
                  }
                >
                  숨김 해제
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setSnapshot((snapshot) =>
                      confirmReportsForTargetInSnapshot(snapshot, item.targetType, item.id),
                    )
                  }
                >
                  유지
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSnapshot((snapshot) => warnUserInSnapshot(snapshot, item.authorId))
                  }
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
              onWarn={() => setSnapshot((snapshot) => warnUserInSnapshot(snapshot, user.id))}
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
              onWarn={() => setSnapshot((snapshot) => warnUserInSnapshot(snapshot, user.id))}
            />
          ))}
        </TabsContent>
      </Tabs>
    </AppShell>
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
  onWarn,
}: {
  title: string;
  subtitle: string;
  trustScore: number;
  restricted: boolean;
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
        <Button size="sm" variant="outline" onClick={onWarn}>
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
