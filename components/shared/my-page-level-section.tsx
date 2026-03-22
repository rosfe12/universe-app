import { Info } from "lucide-react";

import { getAllUserLevels, getUserLevelProgress } from "@/lib/user-identity";

import { UserLevelText } from "./user-level-text";

export function MyPageLevelSection({ score }: { score: number }) {
  const progress = getUserLevelProgress(score);
  const levelGuide = getAllUserLevels();
  const scoreGuide = [
    { label: "글 작성", value: "+5" },
    { label: "댓글 작성", value: "+2" },
    { label: "강의평 작성", value: "+10" },
    { label: "수강신청 교환 완료", value: "+20" },
    { label: "신고 누적", value: "감점 가능" },
  ];

  return (
    <section className="space-y-5 border-b border-gray-100 pb-5">
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
      <div className="space-y-3 rounded-2xl bg-gray-50 px-4 py-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900">등급 안내</p>
          <p className="text-sm text-gray-500">
            점수는 보이지 않고, 활동 흐름에 따라 등급만 자연스럽게 바뀝니다.
          </p>
        </div>
        <div className="space-y-2">
          {levelGuide.map((level) => (
            <div
              key={level.level}
              className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {level.icon} {level.label}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-gray-500">{level.description}</p>
              </div>
              <p className="shrink-0 text-[11px] text-gray-400">
                {level.maxScore === null
                  ? `${level.minScore}+`
                  : level.level === 0
                    ? "0 미만"
                    : `${level.minScore}~${level.maxScore}`}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-gray-100 px-4 py-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900">등급 올리는 방법</p>
          <p className="text-sm text-gray-500">
            꾸준히 글을 남기고, 댓글과 강의평처럼 도움이 되는 활동을 쌓으면 자연스럽게 올라갑니다.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {scoreGuide.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
            >
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className="text-sm font-medium text-gray-900">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
