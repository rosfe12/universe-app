import {
  getPublicIdentitySummary,
  isRepeatedlyReportedUser,
} from "@/lib/mock-queries";
import { cn, formatRelativeLabel } from "@/lib/utils";
import type { VisibilityLevel } from "@/types";

import { UserLevelText } from "@/components/shared/user-level-text";

export function PostAuthorRow({
  authorId,
  createdAt,
  visibilityLevel,
  trailing,
}: {
  authorId: string;
  createdAt: string;
  visibilityLevel?: VisibilityLevel;
  trailing?: React.ReactNode;
}) {
  const identity = getPublicIdentitySummary(authorId, visibilityLevel);
  const repeatedlyReported = isRepeatedlyReportedUser(authorId);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-gray-500">
          <p className="min-w-0 max-w-full truncate font-medium text-gray-700">
            {identity.label}
          </p>
          <UserLevelText score={identity.trustScore} />
          <span>·</span>
          <span>{formatRelativeLabel(createdAt)}</span>
        </div>
        {identity.visibilityLevel === "anonymous" || repeatedlyReported ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            {identity.visibilityLevel === "anonymous" ? <span>학교·학과 비공개</span> : null}
            {repeatedlyReported ? (
              <span className={cn("text-rose-400")}>반복 신고 이력</span>
            ) : null}
          </div>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
