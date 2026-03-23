import Link from "next/link";
import { Eye, Heart, MessageCircle } from "lucide-react";

import { ReportBlockActions } from "@/components/shared/report-block-actions";
import { Badge } from "@/components/ui/badge";
import { CAREER_BOARD_LABELS, COMMUNITY_CATEGORY_LABELS } from "@/lib/constants";
import { getCareerBoardKind } from "@/lib/mock-queries";
import { cn, getPostViewCount } from "@/lib/utils";
import type { Post, ReportReason } from "@/types";

import { PostAuthorRow } from "./post-author-row";

function getPostBadge(post: Post) {
  if (post.category === "admission") return { label: "입시", variant: "secondary" as const };
  const careerBoard = getCareerBoardKind(post);
  if (careerBoard) {
    return {
      label: CAREER_BOARD_LABELS[careerBoard],
      variant: careerBoard === "jobPosting" ? ("warning" as const) : ("secondary" as const),
    };
  }
  if (post.subcategory) {
    return {
      label: COMMUNITY_CATEGORY_LABELS[post.subcategory],
      variant:
        post.subcategory === "hot"
          ? ("danger" as const)
          : post.subcategory === "ask"
            ? ("outline" as const)
          : post.subcategory === "freshman"
            ? ("success" as const)
          : post.subcategory === "meeting"
            ? ("warning" as const)
            : ("secondary" as const),
    };
  }

  return { label: "커뮤니티", variant: "secondary" as const };
}

export function FeedPostCard({
  post,
  href,
  onOpen,
  showActions = false,
  variant = "default",
  emphasis,
  onReport,
  onBlock,
  repeatedlyReported = false,
}: {
  post: Post;
  href?: string;
  onOpen?: () => void;
  showActions?: boolean;
  variant?: "default" | "featured" | "dense";
  emphasis?: "school" | "trending";
  onReport?: (input: { reason?: ReportReason; memo?: string }) => Promise<void> | void;
  onBlock?: () => Promise<void> | void;
  repeatedlyReported?: boolean;
}) {
  const badge = getPostBadge(post);
  const featured = variant === "featured";
  const dense = variant === "dense";
  const content = (
    <div className={cn("space-y-3", dense && "space-y-2")}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-slate-900/5 px-2.5 py-1 font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
          {badge.label}
        </span>
        {emphasis === "school" ? (
          <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 font-medium text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
            우리 학교
          </span>
        ) : null}
        {emphasis === "trending" ? (
          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-600 dark:bg-amber-400/10 dark:text-amber-300">
            급상승
          </span>
        ) : null}
        {post.subcategory === "hot" ? <span className="text-rose-500">19+</span> : null}
      </div>
      <div className={cn("space-y-2", dense && "space-y-1.5")}>
        <h3
          className={cn(
            "text-base font-semibold leading-6 text-foreground",
            featured && "text-[1.05rem] leading-7",
            dense && "text-[15px] leading-6",
          )}
        >
          {post.title}
        </h3>
        <p
          className={cn(
            "line-clamp-2 text-sm leading-6 text-muted-foreground",
            featured && "line-clamp-3 text-[15px]",
          )}
        >
          {post.content}
        </p>
      </div>
    </div>
  );

  const interactiveContent = href ? (
    <Link href={href}>{content}</Link>
  ) : onOpen ? (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
    >
      {content}
    </button>
  ) : (
    content
  );

  return (
    <article className="border-b border-gray-100 last:border-b-0">
      <div
        className={cn(
          "space-y-4 px-4 py-4 transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/5",
          featured && "px-5 py-5",
          dense && "space-y-3 py-3.5",
        )}
      >
        <PostAuthorRow
          authorId={post.authorId}
          createdAt={post.createdAt}
          visibilityLevel={post.visibilityLevel}
          minimal={dense}
        />
        {interactiveContent}
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {getPostViewCount(post)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {post.likes}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {post.commentCount}
            </span>
          </div>
          {showActions ? (
            <ReportBlockActions
              compact
              targetType="post"
              targetId={post.id}
              targetUserId={post.authorId}
              repeatedlyReported={repeatedlyReported}
              onReport={onReport ? async ({ reason, memo }) => onReport({ reason, memo }) : undefined}
              onBlock={onBlock ? async () => onBlock() : undefined}
            />
          ) : null}
        </div>
        {post.tags?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className={cn("text-[10px]")}>
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
