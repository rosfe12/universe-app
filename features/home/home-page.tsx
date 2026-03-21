"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Flame,
  Heart,
  MessageCircle,
  Sparkles,
  ThumbsUp,
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
  getHotGalleryPosts,
  getLectureSummaries,
  getPublicIdentitySummary,
} from "@/lib/mock-queries";
import { cn, formatRelativeLabel } from "@/lib/utils";
import type { AppRuntimeSnapshot, Post } from "@/types";

function FeaturedHotCard({ post }: { post: Post }) {
  return (
    <Link href="/community?filter=hot">
      <Card className="group overflow-hidden border-white/85 bg-[linear-gradient(140deg,#1e1b4b_0%,#4338ca_45%,#7c3aed_100%)] text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_38px_88px_-38px_rgba(79,70,229,0.68)]">
        <CardContent className="space-y-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/10 bg-white/15 text-white">오늘 핫한 글</Badge>
              <Badge variant="danger" className="bg-[linear-gradient(135deg,#f43f5e_0%,#fb7185_100%)] text-white shadow-[0_14px_30px_-16px_rgba(244,63,94,0.84)]">
                HOT
              </Badge>
              <span className="text-xs text-white/75">{formatRelativeLabel(post.createdAt)}</span>
            </div>
            <div className="rounded-full bg-white/12 p-2 backdrop-blur">
              <Flame className="h-5 w-5 text-violet-100" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="line-clamp-3 text-[31px] font-bold leading-9 tracking-tight">
                  {post.title}
                </p>
                <p className="line-clamp-3 text-[15px] leading-7 text-white/78">{post.content}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur">
                  <p className="text-[11px] text-white/60">댓글</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-[32px] font-bold leading-none">{post.commentCount}</span>
                    <MessageCircle className="mb-1 h-5 w-5 text-violet-100" />
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur">
                  <p className="text-[11px] text-white/60">좋아요</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-[32px] font-bold leading-none">{post.likes}</span>
                    <ThumbsUp className="mb-1 h-5 w-5 text-violet-100" />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-2 text-sm font-semibold backdrop-blur">
                  <ThumbsUp className="h-4 w-4 text-violet-100" />
                  {post.likes}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-2 text-sm font-semibold backdrop-blur">
                  <MessageCircle className="h-4 w-4 text-violet-100" />
                  댓글 {post.commentCount}
                </div>
              </div>
              <div className="inline-flex items-center gap-3 rounded-full bg-white px-4 py-3 text-sm font-semibold text-indigo-700 shadow-[0_20px_44px_-28px_rgba(255,255,255,0.8)]">
                지금 들어가서 보기
                <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>

            <div className="relative min-h-[280px] overflow-hidden rounded-[32px] border border-white/12 bg-white/10">
              {post.imageUrl ? (
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(196,181,253,0.4),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 space-y-1 p-4">
                <div className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5 text-violet-100" />
                  핫갤 메인
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function HotCard({ post }: { post: Post }) {
  return (
    <Link href="/community?filter=hot">
      <Card className="group h-full overflow-hidden border-white/85 bg-[linear-gradient(180deg,#ffffff_0%,#f7f7ff_100%)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_54px_-34px_rgba(79,70,229,0.26)]">
        <CardContent className="space-y-4 py-5">
          {post.imageUrl ? (
            <div className="relative overflow-hidden rounded-[24px] border border-indigo-100 bg-indigo-50">
              <Image
                src={post.imageUrl}
                alt={post.title}
                width={1200}
                height={720}
                className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="danger" className="bg-[linear-gradient(135deg,#f43f5e_0%,#fb7185_100%)] font-semibold text-white">HOT</Badge>
              <span className="text-xs font-medium text-muted-foreground">
                {formatRelativeLabel(post.createdAt)}
              </span>
            </div>
            <p className="line-clamp-2 text-[20px] font-bold leading-7 tracking-tight">{post.title}</p>
            <p className="line-clamp-2 text-[14px] leading-6 text-muted-foreground">{post.content}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border/70 pt-3">
            <div className="rounded-[20px] bg-violet-50 px-3 py-3 text-sm font-semibold text-violet-700">
              <p className="text-[11px] text-violet-500">좋아요</p>
              <p className="mt-1 text-lg font-bold">{post.likes}</p>
            </div>
            <div className="rounded-[20px] bg-indigo-50 px-3 py-3 text-sm font-semibold text-indigo-700">
              <p className="text-[11px] text-indigo-500">댓글</p>
              <p className="mt-1 text-lg font-bold">{post.commentCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

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
  const schoolName = currentSchool?.name ?? "건국대학교";
  const hotPosts = getHotGalleryPosts().slice(0, 5);
  const heroHotPost = hotPosts[0];
  const secondaryHotPosts = hotPosts.slice(1, 5);
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
      subtitle="지금 반응이 큰 글과 학교 생활 정보를 한 화면에서 이어서 둘러보세요"
    >
      {loading ? <LoadingState /> : null}

      {heroHotPost ? (
        <section className="space-y-3">
          <SectionHeader
            title="🔥 지금 제일 뜨는 핫갤"
            href="/community?filter=hot"
          />
          <FeaturedHotCard post={heroHotPost} />
          <div className="grid grid-cols-2 gap-3">
            {secondaryHotPosts.map((post) => (
              <HotCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}

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
              <p className="text-sm leading-6 text-muted-foreground">
                우리학교 예비입학생 글이 올라오면 여기에서 바로 확인할 수 있어요.
              </p>
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
              <p className="text-sm leading-6 text-muted-foreground">
                강의 페이지에서 최신 리뷰와 평균 점수를 먼저 확인해보세요.
              </p>
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
          title="💬 캠퍼스 생활"
          href="/school"
        />
        <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_56%,#fff1f2_100%)]">
          <CardContent className="space-y-4 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
                  캠퍼스 믹스
                </p>
                <p className="mt-2 text-lg font-bold text-foreground">동아리, 맛집, 번개 글만 깔끔하게 모았어요</p>
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
              <FeedPostCard key={post.id} post={post} href="/school" />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#fffaf5_0%,#ffffff_100%)]">
            <CardContent className="space-y-3 py-5">
              <p className="text-base font-semibold text-foreground">학교 생활 글이 곧 이어집니다</p>
              <p className="text-sm leading-6 text-muted-foreground">
                동아리, 맛집, 모임 글이 올라오면 홈에서 바로 이어서 볼 수 있어요.
              </p>
              <Link
                href="/school"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                우리학교 둘러보기
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
