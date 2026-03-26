import Image from "next/image";
import Link from "next/link";

import {
  getCommunityProfilePreview,
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
  showPrimaryImage = false,
  showProfilePreview = false,
}: {
  authorId: string;
  createdAt: string;
  visibilityLevel?: VisibilityLevel;
  contentSchoolId?: string;
  anonymousMode?: boolean;
  trailing?: React.ReactNode;
  minimal?: boolean;
  showPrimaryImage?: boolean;
  showProfilePreview?: boolean;
}) {
  const effectiveVisibilityLevel =
    !anonymousMode && visibilityLevel === "anonymous" ? "school" : visibilityLevel;
  const identity = getPublicIdentitySummary(authorId, effectiveVisibilityLevel, {
    contentSchoolId,
  });
  const repeatedlyReported = isRepeatedlyReportedUser(authorId);
  const canOpenProfile = !anonymousMode && identity.visibilityLevel !== "anonymous";
  const profilePreview = canOpenProfile ? getCommunityProfilePreview(authorId) : null;
  const previewInterests = profilePreview?.interests?.slice(0, 2) ?? [];
  const canRenderExpandedPreview =
    showProfilePreview &&
    Boolean(profilePreview?.imageUrl || profilePreview?.bio || previewInterests.length > 0);
  const canRenderInlineThumbnail = showPrimaryImage && !canRenderExpandedPreview && Boolean(profilePreview?.imageUrl);

  const nameNode = canOpenProfile ? (
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
  );

  const metadataNode = (
    <div className="space-y-1">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
        {nameNode}
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
      {canRenderExpandedPreview && profilePreview?.bio ? (
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{profilePreview.bio}</p>
      ) : null}
      {canRenderExpandedPreview && previewInterests.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {previewInterests.map((interest) => (
            <span
              key={interest}
              className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted-foreground"
            >
              {interest}
            </span>
          ))}
        </div>
      ) : null}
      {!minimal && ((anonymousMode && identity.visibilityLevel === "anonymous") || repeatedlyReported) ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          {anonymousMode && identity.visibilityLevel === "anonymous" ? <span>익명 게시판</span> : null}
          {repeatedlyReported ? (
            <span className={cn("text-rose-400")}>반복 신고 이력</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex flex-1 items-start gap-3">
        {canRenderExpandedPreview && profilePreview?.imageUrl ? (
          <div className="relative h-16 w-16 overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.04]">
            <Image
              src={profilePreview.imageUrl}
              alt={`${identity.nickname} 대표 사진`}
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
        ) : canRenderInlineThumbnail && profilePreview?.imageUrl ? (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.04]">
            <Image
              src={profilePreview.imageUrl}
              alt={`${identity.nickname} 대표 사진`}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">{metadataNode}</div>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
