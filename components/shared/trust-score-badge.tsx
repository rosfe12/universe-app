"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getNextUserLevel, getUserLevel } from "@/lib/user-identity";

export function TrustScoreBadge({
  score,
  className,
  interactive = false,
}: {
  score: number;
  className?: string;
  interactive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const level = getUserLevel(score);
  const nextLevel = getNextUserLevel(score);

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 px-2.5 py-1 text-[11px] font-semibold",
        level.badgeClassName,
        className,
      )}
    >
      <span aria-hidden>{level.icon}</span>
      <span>{level.label}</span>
    </Badge>
  );

  if (!interactive) {
    return badge;
  }

  return (
    <>
      <button
        type="button"
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
        onClick={() => setOpen(true)}
        aria-label={`${level.label} 등급 설명 보기`}
      >
        {badge}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-[28px]">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("gap-1.5 px-3 py-1.5 text-sm font-semibold", level.badgeClassName)}
              >
                <span aria-hidden>{level.icon}</span>
                <span>{level.label}</span>
              </Badge>
            </div>
            <DialogTitle className="text-left text-lg leading-7">캠퍼스 진화론 등급</DialogTitle>
            <DialogDescription className="text-left text-sm leading-6 text-muted-foreground">
              {level.description}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-[22px] bg-secondary/55 px-4 py-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                점수는 내부 계산에만 사용되고, 화면에는 등급만 참고 정보로 노출됩니다.
                {nextLevel ? ` 다음 단계는 ${nextLevel.icon} ${nextLevel.label}입니다.` : " 현재 최고 등급입니다."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
