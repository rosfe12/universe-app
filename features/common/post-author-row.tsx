import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TrustScoreBadge } from "@/components/shared/trust-score-badge";
import {
  getAnonymousAvatarGlyph,
  getAnonymousAvatarTone,
  getPublicIdentitySummary,
  isRepeatedlyReportedUser,
} from "@/lib/mock-queries";
import { cn, formatRelativeLabel } from "@/lib/utils";
import type { VisibilityLevel } from "@/types";

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
      <div className="flex min-w-0 items-start gap-3">
        <Avatar className="mt-0.5 h-10 w-10 shrink-0">
          <AvatarFallback
            className={cn(
              "text-sm font-semibold",
              getAnonymousAvatarTone(authorId),
            )}
          >
            {getAnonymousAvatarGlyph(authorId)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
              {identity.label}
            </p>
            <TrustScoreBadge score={identity.trustScore} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{formatRelativeLabel(createdAt)}</span>
            {identity.visibilityLevel === "anonymous" ? (
              <span>학교·학과 비공개</span>
            ) : null}
            {repeatedlyReported ? (
              <Badge variant="danger" className="px-2 py-0.5 text-[10px]">
                반복 신고 사용자
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
