"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getNextUserLevel, getUserLevel } from "@/lib/user-identity";

import { UserLevelText } from "./user-level-text";

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

  const badge = <UserLevelText score={score} className={cn("ml-0", className)} />;

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
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <UserLevelText score={score} className="ml-0 text-sm font-medium" />
            </div>
            <DialogTitle className="text-left text-lg leading-7 text-gray-900">캠퍼스 진화론 등급</DialogTitle>
            <DialogDescription className="text-left text-sm leading-6 text-gray-500">
              {level.description}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-500">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
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
