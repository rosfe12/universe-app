"use client";

import { useMemo, useState } from "react";
import { Ban, Flag, ShieldAlert } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REPORT_REASON_LABELS } from "@/lib/constants";
import { currentUser, hasUserReportedTarget } from "@/lib/mock-queries";
import { cn } from "@/lib/utils";
import type { ReportReason, ReportTargetType } from "@/types";

export function ReportBlockActions({
  compact = false,
  targetType,
  targetId,
  targetUserId,
  repeatedlyReported = false,
  onReport,
  onBlock,
}: {
  compact?: boolean;
  targetType?: ReportTargetType;
  targetId?: string;
  targetUserId?: string;
  repeatedlyReported?: boolean;
  onReport?: (input: {
    targetType?: ReportTargetType;
    targetId?: string;
    targetUserId?: string;
    reason?: ReportReason;
    memo?: string;
  }) => Promise<void> | void;
  onBlock?: (input: { targetUserId?: string }) => Promise<void> | void;
}) {
  const [reported, setReported] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [pending, setPending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("misinformation");
  const [memo, setMemo] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const alreadyReported = useMemo(() => {
    if (!targetType || !targetId) return false;
    return hasUserReportedTarget(currentUser.id, targetType, targetId);
  }, [targetId, targetType]);

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", compact && "gap-1.5")}>
        {repeatedlyReported ? (
          <Badge variant="danger" className="px-2 py-1 text-[10px]">
            반복 신고
          </Badge>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || reported || alreadyReported}
          className={cn(compact && "h-9 rounded-[18px] px-3 text-[11px]")}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setErrorMessage("");
            setReportOpen(true);
          }}
        >
          <Flag className="h-4 w-4" />
          {reported || alreadyReported ? "신고 접수됨" : "신고"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending || blocked}
          className={cn(compact && "h-9 rounded-[18px] px-3 text-[11px]")}
          onClick={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            setPending(true);
            try {
              await onBlock?.({ targetUserId });
              setBlocked(true);
            } finally {
              setPending(false);
            }
          }}
        >
          <Ban className="h-4 w-4" />
          {blocked ? "차단됨" : "차단"}
        </Button>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>신고하기</DialogTitle>
            <DialogDescription>
              신고 사유를 선택하면 중복 신고 없이 접수됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-[22px] bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                신고 누적 3건 이상이면 자동 숨김 처리됩니다.
              </div>
            </div>
            <div className="space-y-2">
              <Label>신고 사유</Label>
              <Select value={reason} onValueChange={(value) => setReason(value as ReportReason)}>
                <SelectTrigger>
                  <SelectValue placeholder="신고 사유 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((item) => (
                    <SelectItem key={item} value={item}>
                      {REPORT_REASON_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                rows={4}
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="추가 메모가 있으면 적어주세요. 비워도 됩니다."
              />
            </div>
            {errorMessage ? (
              <p className="text-sm text-rose-600">{errorMessage}</p>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setReportOpen(false)}>
                닫기
              </Button>
              <Button
                type="button"
                disabled={pending || alreadyReported}
                onClick={async () => {
                  if (alreadyReported) {
                    setErrorMessage("이미 신고한 대상입니다.");
                    return;
                  }

                  setPending(true);
                  try {
                    await onReport?.({
                      targetType,
                      targetId,
                      targetUserId,
                      reason,
                      memo: memo.trim() || undefined,
                    });
                    setReported(true);
                    setReportOpen(false);
                  } catch {
                    setErrorMessage("신고를 처리하지 못했습니다.");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                신고 접수
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
