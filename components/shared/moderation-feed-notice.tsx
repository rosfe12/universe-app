import { Ban, EyeOff, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function ModerationFeedNotice({
  hiddenCount = 0,
  blockedCount = 0,
  hiddenLabel = "콘텐츠",
}: {
  hiddenCount?: number;
  blockedCount?: number;
  hiddenLabel?: string;
}) {
  if (hiddenCount <= 0 && blockedCount <= 0) {
    return null;
  }

  return (
    <Card className="border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))]">
      <CardContent className="space-y-3 py-4">
        {hiddenCount > 0 ? (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <EyeOff className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  신고 누적으로 숨김 처리된 {hiddenLabel}이 있습니다
                </p>
                <Badge variant="danger">{hiddenCount}건</Badge>
              </div>
              <p className="text-xs leading-5 text-slate-600">
                관리자 검토 전까지 일반 피드에서는 축소 또는 숨김 상태로 처리됩니다.
              </p>
            </div>
          </div>
        ) : null}

        {blockedCount > 0 ? (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <Ban className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  차단한 사용자 콘텐츠 숨김 중
                </p>
                <Badge variant="outline">{blockedCount}건</Badge>
              </div>
              <p className="text-xs leading-5 text-slate-600">
                차단한 상대의 글, 댓글, 프로필은 피드와 상세 화면에서 우선 제외됩니다.
              </p>
            </div>
          </div>
        ) : null}

        {hiddenCount > 0 || blockedCount > 0 ? (
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            <ShieldAlert className="h-3.5 w-3.5 text-primary" />
            신고 누적 또는 차단된 콘텐츠는 피드에서 우선 숨김 처리됩니다.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
