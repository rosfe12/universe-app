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
  onReport,
  onBlock,
  repeatedlyReported = false,
}: {
  post: Post;
  href?: string;
  onOpen?: () => void;
  showActions?: boolean;
  onReport?: (input: { reason?: ReportReason; memo?: string }) => Promise<void> | void;
  onBlock?: () => Promise<void> | void;
  repeatedlyReported?: boolean;
}) {
  const badge = getPostBadge(post);
  const content = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <span>{badge.label}</span>
        {post.subcategory === "hot" ? <span className="text-rose-500">19+</span> : null}
      </div>
      <div className="space-y-2">
        <h3 className="text-base font-semibold leading-6 text-gray-900">{post.title}</h3>
        <p className="line-clamp-2 text-sm leading-6 text-gray-500">{post.content}</p>
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
      <div className="space-y-4 px-4 py-4 transition-colors duration-150 hover:bg-gray-50">
        <PostAuthorRow
          authorId={post.authorId}
          createdAt={post.createdAt}
          visibilityLevel={post.visibilityLevel}
        />
        {interactiveContent}
        <div className="flex items-center justify-between gap-3 text-sm text-gray-500">
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
