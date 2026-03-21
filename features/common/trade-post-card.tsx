import { ReportBlockActions } from "@/components/shared/report-block-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PostAuthorRow } from "@/features/common/post-author-row";
import { TRADE_STATUS_LABELS } from "@/lib/constants";
import { getLectureById, getTradeMatchInsight } from "@/lib/mock-queries";
import type { ReportReason, TradePost } from "@/types";
import { ArrowRightLeft, BellRing, CheckCircle2, Clock3, Sparkles } from "lucide-react";

export function TradePostCard({
  tradePost,
  onDetail,
  onReport,
  onBlock,
  repeatedlyReported = false,
}: {
  tradePost: TradePost;
  onDetail?: () => void;
  onReport?: (input: { reason?: ReportReason; memo?: string }) => Promise<void> | void;
  onBlock?: () => Promise<void> | void;
  repeatedlyReported?: boolean;
}) {
  const haveLecture = getLectureById(tradePost.haveLectureId);
  const wantLecture = getLectureById(tradePost.wantLectureId);
  const match = getTradeMatchInsight(tradePost.id);
  const statusVariant =
    tradePost.status === "open"
      ? "success"
      : tradePost.status === "matching"
        ? "warning"
        : "outline";
  const statusCaption =
    tradePost.status === "open"
      ? "바로 교환 가능한 글"
      : tradePost.status === "matching"
        ? "후보와 조율 중"
        : "거래가 정리된 글";

  return (
    <Card className="overflow-hidden border-white/80 bg-white/94 transition-transform hover:-translate-y-0.5">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <PostAuthorRow
              authorId={tradePost.userId}
              createdAt={tradePost.createdAt}
              visibilityLevel={tradePost.visibilityLevel}
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant}>
                {tradePost.status === "closed" ? (
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                ) : tradePost.status === "matching" ? (
                  <Clock3 className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
                )}
                {TRADE_STATUS_LABELS[tradePost.status]}
              </Badge>
              <Badge
                variant={
                  match.strength === "high"
                    ? "success"
                    : match.strength === "medium"
                      ? "warning"
                      : "secondary"
                }
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                {match.label}
              </Badge>
              {match.count > 0 ? <Badge variant="outline">후보 {match.count}건</Badge> : null}
              {tradePost.status === "open" ? (
                <Badge variant="outline">
                  <BellRing className="mr-1 h-3.5 w-3.5" />
                  알림 대상
                </Badge>
              ) : null}
            </div>
            <CardTitle className="mt-3 text-[18px] leading-7">수강 교환 제안</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {tradePost.semester} · {statusCaption}
            </p>
          </div>
        </div>
        <div className="space-y-3 rounded-[24px] bg-secondary/80 p-4 text-sm">
          <div className="rounded-[18px] bg-white/80 px-3 py-3">
            <p className="text-[11px] text-muted-foreground">보유 강의</p>
            <p className="mt-1 font-semibold">
              {haveLecture?.courseName ?? tradePost.haveLectureId}
            </p>
          </div>
          <div className="flex justify-center text-primary">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
          <div className="rounded-[18px] bg-white/80 px-3 py-3">
            <p className="text-[11px] text-muted-foreground">원하는 강의</p>
            <p className="mt-1 font-semibold">
              {wantLecture?.courseName ?? tradePost.wantLectureId}
            </p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <p>시간대 {tradePost.timeRange}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="rounded-[20px] border border-dashed border-primary/20 bg-primary/5 px-4 py-3">
          <p className="line-clamp-2 text-sm text-muted-foreground">{tradePost.note}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          {onDetail ? (
            <Button variant="ghost" size="sm" onClick={onDetail}>
              상세 보기
            </Button>
          ) : null}
          <ReportBlockActions
            compact
            targetType="user"
            targetId={tradePost.userId}
            targetUserId={tradePost.userId}
            repeatedlyReported={repeatedlyReported}
            onReport={onReport ? async ({ reason, memo }) => onReport({ reason, memo }) : undefined}
            onBlock={onBlock ? async () => onBlock() : undefined}
          />
        </div>
      </CardContent>
    </Card>
  );
}
