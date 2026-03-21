import { Info } from "lucide-react";

import { getUserLevelProgress } from "@/lib/user-identity";

import { UserLevelText } from "./user-level-text";

export function MyPageLevelSection({ score }: { score: number }) {
  const progress = getUserLevelProgress(score);

  return (
    <section className="space-y-3 border-b border-gray-100 pb-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900">현재 등급</p>
        <div className="flex items-center gap-1.5">
          <UserLevelText score={score} className="ml-0 text-sm font-medium" />
          <span
            title={progress.currentLevel.description}
            className="inline-flex h-4 w-4 items-center justify-center text-gray-400"
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">
          {progress.nextLevel
            ? `다음 등급까지 ${progress.remaining}점 남음`
            : "현재 최고 등급입니다"}
        </p>
      </div>
    </section>
  );
}
