"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Heart,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeader } from "@/components/shared/section-header";
import { TrustScoreBadge } from "@/components/shared/trust-score-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FeedPostCard } from "@/features/common/feed-post-card";
import { LectureSummaryCard } from "@/features/common/lecture-summary-card";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  getCommunityPosts,
  getCurrentSchool,
  getDatingPosts,
  getLectureSummaries,
  getPublicIdentitySummary,
} from "@/lib/mock-queries";
import { cn, formatRelativeLabel } from "@/lib/utils";
import type { AppRuntimeSnapshot, Post } from "@/types";

function SharedDatingCard({ post }: { post: Post }) {
  const identity = getPublicIdentitySummary(post.authorId, post.visibilityLevel ?? "profile");
  const badgeLabel = post.subcategory === "meeting" ? "미팅" : "연애";

  return (
    <Link href={`/community?filter=${post.subcategory ?? "dating"}`}>
      <Card className={cn(
        "overflow-hidden border-white/80 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_46px_-30px_rgba(15,23,42,0.35)]",
        post.subcategory === "meeting"
          ? "bg-[linear-gradient(135deg,#f8f7ff_0%,#ffffff_58%,#ede9fe_130%)]"
          : "bg-[linear-gradient(135deg,#fff7fb_0%,#ffffff_58%,#f5d0fe_130%)]",
      )}>
        <CardContent className="space-y-4 py-5">
          {post.imageUrl ? (
            <div className="relative overflow-hidden rounded-[26px] border border-white/80">
              <Image
                src={post.imageUrl}
                alt={post.title}
                width={1200}
                height={720}
                className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
          ) : (
            <div className={cn(
              "rounded-[26px] border border-white/80 px-5 py-5",
              post.subcategory === "meeting"
                ? "bg-[linear-gradient(135deg,#ede9fe_0%,#ffffff_100%)]"
                : "bg-[linear-gradient(135deg,#fdf2f8_0%,#ffffff_100%)]",
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">
                    프로필 카드
                  </p>
                  <p className="mt-2 text-lg font-bold text-foreground">{identity.label}</p>
                </div>
                <div className="rounded-full bg-white p-3 shadow-sm">
                  <Heart className="h-5 w-5 text-violet-500" />
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge
                variant={post.subcategory === "meeting" ? "warning" : "danger"}
                className="font-semibold"
              >
                {badgeLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatRelativeLabel(post.createdAt)}</span>
            </div>
            <div className="rounded-full bg-white/90 p-2 shadow-sm">
              <Heart className="h-4 w-4 text-violet-500" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="line-clamp-2 text-[20px] font-bold leading-7 tracking-tight">{post.title}</p>
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{post.content}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[18px] bg-white/80 px-3 py-3">
                <p className="text-[11px] text-muted-foreground">반응</p>
                <p className="mt-1 text-lg font-bold">{post.likes}개</p>
              </div>
              <div className="rounded-[18px] bg-white/80 px-3 py-3">
                <p className="text-[11px] text-muted-foreground">댓글</p>
                <p className="mt-1 text-lg font-bold">{post.commentCount}개</p>
              </div>
            </div>
          </div>
          <div className="space-y-3 border-t border-border/70 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground/85">{identity.label}</p>
              <TrustScoreBadge score={identity.trustScore} />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_22px_44px_-24px_rgba(99,102,241,0.62)]">
              지금 참여하기
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function HomePage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const { loading } = useAppRuntime(initialSnapshot);
  const currentSchool = getCurrentSchool();
  const schoolName = currentSchool?.name ?? "우리학교";
  const freshmanPosts = getCommunityPosts("freshman")
    .filter((post) => !currentSchool?.id || post.schoolId === currentSchool.id)
    .slice(0, 4);
  const datingPosts = [...getDatingPosts("meeting"), ...getDatingPosts("dating")]
    .sort((a, b) => b.likes - a.likes || +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 3);
  const lectureHighlights = getLectureSummaries().slice(0, 3);
  const campusLifePosts = [
    ...getCommunityPosts("club").slice(0, 2),
    ...getCommunityPosts("food").slice(0, 2),
    ...getCommunityPosts("meetup").slice(0, 2),
  ]
    .sort((a, b) => b.likes - a.likes || +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 4);
  const hasFreshmanPosts = freshmanPosts.length > 0;
  const hasLectureHighlights = lectureHighlights.length > 0;
  const hasCampusLifePosts = campusLifePosts.length > 0;
  const hasDatingPosts = datingPosts.length > 0;

  return (
    <AppShell
      title="홈"
    >
      {loading ? <LoadingState /> : null}

      <section className="space-y-3">
        <SectionHeader
          title="💬 커뮤니티"
          href="/community"
        />
        <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_56%,#fff1f2_100%)]">
          <CardContent className="space-y-4 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
                  캠퍼스 믹스
                </p>
                <p className="mt-2 text-lg font-bold text-foreground">동아리, 맛집, 모임 글부터 보여줘요</p>
              </div>
              <div className="rounded-[22px] bg-white px-4 py-3 text-right shadow-[0_20px_44px_-28px_rgba(251,146,60,0.28)]">
                <p className="text-[11px] text-muted-foreground">게시글</p>
                <p className="mt-1 text-2xl font-bold text-orange-500">{campusLifePosts.length}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="warning">
                <Users className="mr-1 h-3.5 w-3.5" />
                동아리
              </Badge>
              <Badge variant="outline">
                <UtensilsCrossed className="mr-1 h-3.5 w-3.5" />
                맛집
              </Badge>
              <Badge variant="outline">모임</Badge>
            </div>
          </CardContent>
        </Card>
        {hasCampusLifePosts ? (
          <div className="space-y-3">
            {campusLifePosts.map((post) => (
              <FeedPostCard key={post.id} post={post} href="/community" />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#fffaf5_0%,#ffffff_100%)]">
            <CardContent className="space-y-3 py-5">
              <p className="text-base font-semibold text-foreground">커뮤니티 글이 곧 이어집니다</p>
              <Link
                href="/community"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                커뮤니티 둘러보기
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader
          title={`🌱 ${schoolName.replace("대학교", "대")} 새내기존`}
          href="/school?tab=freshman"
        />
        <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#f3fbf4_0%,#ffffff_58%,#ecfccb_130%)]">
          <CardContent className="space-y-3 py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                우리학교 새내기
              </div>
              <Badge className="border-emerald-200 bg-white/90 text-emerald-700">
                글 {freshmanPosts.length}개
              </Badge>
            </div>
          </CardContent>
        </Card>
        {hasFreshmanPosts ? (
          <div className="space-y-3">
            {freshmanPosts.map((post) => (
              <FeedPostCard key={post.id} post={post} href="/school?tab=freshman" />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_100%)]">
            <CardContent className="space-y-3 py-5">
              <p className="text-base font-semibold text-foreground">새내기존 첫 글을 기다리고 있어요</p>
              <Link
                href="/school?tab=freshman"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                새내기존 바로 보기
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="📚 강의 정보"
          href="/lectures"
        />
        <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_56%,#f5f3ff_100%)]">
          <CardContent className="space-y-4 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
                  강의 한눈에
                </p>
                <p className="mt-2 text-lg font-bold text-foreground">수강 전에 먼저 보는 강의평만 골랐어요</p>
              </div>
              <div className="rounded-[22px] bg-white px-4 py-3 text-right shadow-[0_20px_44px_-28px_rgba(99,102,241,0.35)]">
                <p className="text-[11px] text-muted-foreground">강의 수</p>
                <p className="mt-1 text-2xl font-bold text-indigo-600">{lectureHighlights.length}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">
                <BookOpen className="mr-1 h-3.5 w-3.5" />
                꿀강 요약
              </Badge>
              <Badge variant="outline">평균 점수</Badge>
              <Badge variant="outline">후기 밀도</Badge>
            </div>
          </CardContent>
        </Card>
        {hasLectureHighlights ? (
          <div className="space-y-3">
            {lectureHighlights.map((lecture) => (
              <LectureSummaryCard key={lecture.id} lecture={lecture} href={`/lectures/${lecture.id}`} />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_100%)]">
            <CardContent className="space-y-3 py-5">
              <p className="text-base font-semibold text-foreground">강의 정보가 곧 채워집니다</p>
              <Link
                href="/lectures"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                강의 페이지 보기
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="💘 연애 / 미팅"
          href="/community?filter=meeting"
        />
        {hasDatingPosts ? (
          <div className="space-y-3">
            {datingPosts.map((post) => (
              <SharedDatingCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#faf5ff_0%,#ffffff_100%)]">
            <CardContent className="space-y-3 py-5">
              <p className="text-base font-semibold text-foreground">미팅 글이 올라오면 여기서 바로 보여줘요</p>
              <p className="text-sm leading-6 text-muted-foreground">
                학교 인증이 끝난 뒤 프로필 카드와 새 글을 홈 하단에서 바로 확인할 수 있어요.
              </p>
              <Link
                href="/community?filter=meeting"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                미팅 / 연애 보기
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}
      </section>
    </AppShell>
  );
}
