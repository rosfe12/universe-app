import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart, MessageCircle, Tags } from "lucide-react";

import { ReportBlockActions } from "@/components/shared/report-block-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { COMMUNITY_CATEGORY_LABELS } from "@/lib/constants";
import type { Post, ReportReason } from "@/types";

import { PostAuthorRow } from "./post-author-row";

function getPostBadge(post: Post) {
  if (post.category === "admission") return { label: "입시", variant: "secondary" as const };
  if (post.subcategory) {
    return {
      label: COMMUNITY_CATEGORY_LABELS[post.subcategory],
      variant:
        post.subcategory === "hot"
          ? ("danger" as const)
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
  showActions = false,
  onReport,
  onBlock,
  repeatedlyReported = false,
}: {
  post: Post;
  href?: string;
  showActions?: boolean;
  onReport?: (input: { reason?: ReportReason; memo?: string }) => Promise<void> | void;
  onBlock?: () => Promise<void> | void;
  repeatedlyReported?: boolean;
}) {
  const badge = getPostBadge(post);
  const content = (
    <div className="block space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badge.variant} className="font-semibold">
            {badge.label}
          </Badge>
          {post.subcategory === "hot" ? (
            <Badge variant="danger" className="bg-[linear-gradient(135deg,#f43f5e_0%,#fb7185_100%)] text-white shadow-[0_16px_30px_-18px_rgba(244,63,94,0.82)]">
              HOT
            </Badge>
          ) : null}
        </div>
        <div className="space-y-2 rounded-[26px] border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#fbfbff_100%)] px-4 py-4">
          <h3 className="text-[19px] font-bold leading-7 tracking-tight text-slate-950">{post.title}</h3>
          <p className="line-clamp-2 text-[14px] leading-6 text-muted-foreground">{post.content}</p>
        </div>
      </div>
      {post.imageUrl ? (
        <div className="overflow-hidden rounded-[24px] border border-slate-200/70">
          <Image
            src={post.imageUrl}
            alt={post.title}
            width={1200}
            height={720}
            className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <Card className="group overflow-hidden border-white/85 bg-[linear-gradient(180deg,#ffffff_0%,#fbfbff_100%)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_56px_-34px_rgba(79,70,229,0.24)]">
      <CardHeader className="space-y-4 pb-4">
        <PostAuthorRow
          authorId={post.authorId}
          createdAt={post.createdAt}
          visibilityLevel={post.visibilityLevel}
        />
        {href ? <Link href={href}>{content}</Link> : content}
      </CardHeader>
      <CardContent className="space-y-4 border-t border-border/70 pt-4">
        {post.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-secondary/80">
                <Tags className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
              <Heart className="h-4 w-4" />
              {post.likes}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
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
          ) : href ? (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              자세히 보기
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
