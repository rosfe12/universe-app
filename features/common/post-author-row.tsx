import Link from "next/link";

import {
  getPublicIdentitySummary,
  isRepeatedlyReportedUser,
} from "@/lib/mock-queries";
import { cn } from "@/lib/utils";
import type { VisibilityLevel } from "@/types";

import { RelativeTimeText } from "@/components/shared/relative-time-text";
import { UserLevelText } from "@/components/shared/user-level-text";

export function PostAuthorRow({
  authorId,
  createdAt,
  visibilityLevel,
  contentSchoolId,
  anonymousMode = false,
  trailing,
  minimal = false,
}: {
  authorId: string;
  createdAt: string;
  visibilityLevel?: VisibilityLevel;
  contentSchoolId?: string;
  anonymousMode?: boolean;
  trailing?: React.ReactNode;
  minimal?: boolean;
}) {
  const effectiveVisibilityLevel =
    !anonymousMode && visibilityLevel === "anonymous" ? "school" : visibilityLevel;
  const identity = getPublicIdentitySummary(authorId, effectiveVisibilityLevel, {
    contentSchoolId,
  });
  const repeatedlyReported = isRepeatedlyReportedUser(authorId);
  const canOpenProfile = !anonymousMode && identity.visibilityLevel !== "anonymous";

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
          {canOpenProfile ? (
            <Link
              href={`/profile/${authorId}`}
              className="min-w-0 max-w-full truncate font-semibold text-gray-900 transition-opacity hover:opacity-80 dark:text-gray-50"
            >
              {identity.nickname}
            </Link>
          ) : (
            <p className="min-w-0 max-w-full truncate font-semibold text-gray-900 dark:text-gray-50">
              {identity.nickname}
            </p>
          )}
          <UserLevelText score={identity.trustScore} />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          {identity.label !== identity.nickname ? (
            <>
              <p className="min-w-0 max-w-full truncate">{identity.label}</p>
              <span>·</span>
            </>
          ) : null}
          <RelativeTimeText dateString={createdAt} />
        </div>
        {!minimal && ((anonymousMode && identity.visibilityLevel === "anonymous") || repeatedlyReported) ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            {anonymousMode && identity.visibilityLevel === "anonymous" ? <span>익명 게시판</span> : null}
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
