"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Flame,
  Heart,
  MessageCircle,
  Repeat2,
  School,
  Sparkles,
  ThumbsUp,
  UtensilsCrossed,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeader } from "@/components/shared/section-header";
import { TrustScoreBadge } from "@/components/shared/trust-score-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FeedPostCard } from "@/features/common/feed-post-card";
import { LectureSummaryCard } from "@/features/common/lecture-summary-card";
import { TradePostCard } from "@/features/common/trade-post-card";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  getAdmissionQuestions,
  getCommunityPosts,
  getCurrentSchool,
  getDatingPosts,
  getHotGalleryPosts,
  getLectureSummaries,
  getPublicIdentitySummary,
  getTradePosts,
} from "@/lib/mock-queries";
import { cn, formatRelativeLabel } from "@/lib/utils";
import type { AppRuntimeSnapshot, Post } from "@/types";

const SCHOOL_PREVIEW_SECTIONS = [
  {
    key: "lectures",
    title: "강의 정보",
    href: "/school?tab=lectures",
    icon: BookOpen,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "trade",
    title: "수강신청 교환",
    href: "/school?tab=trade",
    icon: Repeat2,
    tone: "bg-sky-50 text-sky-700",
  },
  {
    key: "club",
    title: "동아리",
    href: "/school?tab=club",
    icon: Users,
    tone: "bg-amber-50 text-amber-700",
  },
  {
    key: "food",
    title: "맛집",
    href: "/school?tab=food",
    icon: UtensilsCrossed,
    tone: "bg-rose-50 text-rose-700",
  },
] as const;

function FeaturedHotCard({ post, schoolName }: { post: Post; schoolName: string }) {
  return (
    <Link href="/community?filter=hot">
      <Card className="group overflow-hidden border-white/80 bg-[linear-gradient(135deg,#171717_0%,#1f2937_58%,#f97316_130%)] text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_60px_-28px_rgba(15,23,42,0.45)]">
        <CardContent className="space-y-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="danger" className="bg-rose-500 text-white shadow-[0_10px_25px_-14px_rgba(244,63,94,0.85)]">
                HOT
              </Badge>
              <Badge className="border-white/10 bg-white/15 text-white">실시간 인기글</Badge>
              <span className="text-xs text-white/75">{formatRelativeLabel(post.createdAt)}</span>
            </div>
            <Flame className="h-5 w-5 text-orange-300" />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.35fr,0.95fr]">
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-200/90">
                  {schoolName}에서 지금 제일 뜨는 이야기
                </p>
                <p className="line-clamp-3 text-[24px] font-semibold leading-8 tracking-tight">
                  {post.title}
                </p>
                <p className="line-clamp-3 text-sm leading-6 text-white/78">{post.content}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-2 text-sm font-semibold">
                  <ThumbsUp className="h-4 w-4 text-orange-200" />
                  {post.likes}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-2 text-sm font-semibold">
                  <MessageCircle className="h-4 w-4 text-orange-200" />
                  댓글 {post.commentCount}
                </div>
              </div>
              <div className="inline-flex items-center gap-1 text-sm font-semibold text-orange-200">
                지금 들어가서 보기
                <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>

            <div className="relative min-h-[220px] overflow-hidden rounded-[26px] border border-white/12 bg-white/10">
              {post.imageUrl ? (
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.36),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 space-y-1 p-4">
                <div className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5 text-orange-200" />
                  지금 커뮤니티 메인
                </div>
                <p className="line-clamp-2 text-sm font-medium text-white/92">
                  반응이 빠르게 붙는 핫갤 글을 가장 먼저 보여줍니다.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[20px] border border-white/12 bg-white/10 px-4 py-3">
              <p className="text-[11px] text-white/65">좋아요</p>
              <p className="mt-1 text-base font-semibold">{post.likes}</p>
            </div>
            <div className="rounded-[20px] border border-white/12 bg-white/10 px-4 py-3">
              <p className="text-[11px] text-white/65">댓글</p>
              <p className="mt-1 text-base font-semibold">{post.commentCount}</p>
            </div>
            <div className="rounded-[20px] border border-white/12 bg-white/10 px-4 py-3">
              <p className="text-[11px] text-white/65">태그</p>
              <p className="mt-1 line-clamp-1 text-sm font-semibold">
                {post.tags?.[0] ?? "실시간"}
              </p>
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
      <Card className="group h-full overflow-hidden border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#fff7f3_100%)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_46px_-30px_rgba(15,23,42,0.35)]">
        <CardContent className="space-y-4 py-5">
          {post.imageUrl ? (
            <div className="relative overflow-hidden rounded-[22px] border border-rose-100 bg-rose-50">
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
              <Badge variant="danger" className="font-semibold">HOT</Badge>
              <span className="text-xs font-medium text-muted-foreground">
                {formatRelativeLabel(post.createdAt)}
              </span>
            </div>
            <p className="line-clamp-2 text-[18px] font-semibold leading-7 tracking-tight">{post.title}</p>
            <p className="line-clamp-3 text-[14px] leading-6 text-muted-foreground">{post.content}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border/70 pt-3">
            <div className="rounded-[18px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              좋아요 {post.likes}
            </div>
            <div className="rounded-[18px] bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
              댓글 {post.commentCount}
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
          ? "bg-[linear-gradient(135deg,#fff8e7_0%,#ffffff_58%,#fde68a_130%)]"
          : "bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_58%,#fbcfe8_130%)]",
      )}>
        <CardContent className="space-y-4 py-5">
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
              <Heart className="h-4 w-4 text-rose-500" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="line-clamp-2 text-[18px] font-semibold leading-7 tracking-tight">{post.title}</p>
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{post.content}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[18px] bg-white/80 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">반응</p>
                <p className="mt-1 text-sm font-semibold">{post.likes}개</p>
              </div>
              <div className="rounded-[18px] bg-white/80 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">댓글</p>
                <p className="mt-1 text-sm font-semibold">{post.commentCount}개</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
            <p className="text-sm font-medium text-foreground/85">{identity.label}</p>
            <TrustScoreBadge score={identity.trustScore} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MiniCampusCard({
  title,
  description,
  href,
  icon: Icon,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  icon: typeof BookOpen;
  badge: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full overflow-hidden border-white/80 bg-white/92 transition-transform hover:-translate-y-0.5">
        <CardContent className="space-y-3 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="rounded-[18px] bg-primary/10 p-3 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <Badge variant="outline">{badge}</Badge>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">{title}</p>
            <p className="line-clamp-2 text-[13px] leading-5 text-muted-foreground">{description}</p>
          </div>
          <div className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            바로 보기
            <ArrowUpRight className="h-4 w-4" />
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
  const { loading, lectureReviews, tradePosts } = useAppRuntime(initialSnapshot);
  const currentSchool = getCurrentSchool();
  const schoolName = currentSchool?.name ?? "건국대학교";
  const hotPosts = getHotGalleryPosts().slice(0, 5);
  const heroHotPost = hotPosts[0];
  const secondaryHotPosts = hotPosts.slice(1, 5);
  const datingPosts = [...getDatingPosts("meeting"), ...getDatingPosts("dating")]
    .sort((a, b) => b.likes - a.likes || +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 4);
  const admissionPosts = getAdmissionQuestions().slice(0, 4);
  const lectureHighlights = getLectureSummaries().slice(0, 3);
  const campusLifePosts = [
    ...getCommunityPosts("club").slice(0, 2),
    ...getCommunityPosts("food").slice(0, 2),
    ...getCommunityPosts("meetup").slice(0, 2),
  ]
    .sort((a, b) => b.likes - a.likes || +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 4);
  const tradeHighlights = getTradePosts().slice(0, 2);
  const latestStream = [...hotPosts, ...campusLifePosts, ...admissionPosts, ...datingPosts]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  const schoolPreview = {
    lectures: getLectureSummaries().slice(0, 1)[0],
    trade: getTradePosts().slice(0, 1)[0],
    club: getCommunityPosts("club").slice(0, 1)[0],
    food: getCommunityPosts("food").slice(0, 1)[0],
  };

  return (
    <AppShell
      title="홈"
      subtitle={`${schoolName} 안팎에서 지금 제일 반응 좋은 콘텐츠를 먼저 보여줍니다`}
    >
      {loading ? <LoadingState /> : null}

      <Card className="overflow-hidden bg-[linear-gradient(135deg,#121826_0%,#1b4332_48%,#f59e0b_145%)] text-white">
        <CardContent className="space-y-4 py-5">
          <div className="flex items-center justify-between gap-3">
            <Badge className="border-white/10 bg-white/15 text-white">유니버스 라이브</Badge>
            <School className="h-5 w-5 text-amber-200" />
          </div>
          <div className="space-y-2">
            <p className="text-[28px] font-semibold tracking-tight">첫 화면에서 바로 스크롤이 시작되는 캠퍼스 홈</p>
            <p className="text-sm leading-6 text-white/80">
              핫갤, 강의, 미팅이 자연스럽게 이어져서 앱이 살아 있는 느낌이 들도록 구성했습니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[22px] border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-[11px] text-white/70">핫갤 흐름</p>
              <p className="mt-1 text-base font-semibold">{hotPosts.length}개 바로 탐색</p>
            </div>
            <div className="rounded-[22px] border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-[11px] text-white/70">강의 정보</p>
              <p className="mt-1 text-base font-semibold">리뷰 {lectureReviews.length}개</p>
            </div>
            <div className="rounded-[22px] border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-[11px] text-white/70">관계형 콘텐츠</p>
              <p className="mt-1 text-base font-semibold">연애/미팅 {datingPosts.length}개</p>
            </div>
            <div className="rounded-[22px] border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-[11px] text-white/70">우리학교 교환</p>
              <p className="mt-1 text-base font-semibold">매칭 글 {tradePosts.length}개</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {heroHotPost ? (
        <section className="space-y-3">
          <SectionHeader
            title="🔥 지금 제일 뜨는 핫갤"
            description="첫 방문에 가장 재밌는 글부터 보이도록 크게 배치했습니다"
            href="/community?filter=hot"
          />
          <FeaturedHotCard post={heroHotPost} schoolName={schoolName} />
          <div className="grid grid-cols-2 gap-3">
            {secondaryHotPosts.map((post) => (
              <HotCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <SectionHeader
          title="💘 미팅 / 연애"
          description="지금 반응 붙는 관계형 글을 눈에 띄게 보여줍니다"
          href="/community?filter=meeting"
        />
        <div className="space-y-3">
          {datingPosts.map((post) => (
            <SharedDatingCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="✨ 지금 이어보는 흐름"
          description="핫갤, 학교 생활, 입시 글이 끊기지 않고 이어집니다"
          href="/community"
        />
        <div className="space-y-3">
          {latestStream.slice(0, 3).map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              href={
                post.category === "admission"
                  ? `/admission/${post.id}`
                  : post.category === "dating"
                    ? `/community?filter=${post.subcategory ?? "dating"}`
                    : post.subcategory === "hot"
                      ? "/community?filter=hot"
                      : "/school"
              }
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="📚 강의 꿀정보"
          description="평균 점수와 핵심 후기만 봐도 강의 성격이 바로 들어오게 정리했습니다"
          href="/lectures"
        />
        <div className="space-y-3">
          {lectureHighlights.map((lecture) => (
            <LectureSummaryCard key={lecture.id} lecture={lecture} href={`/lectures/${lecture.id}`} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="🏫 우리학교 미리보기" href="/school" />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {SCHOOL_PREVIEW_SECTIONS.map((section) => {
              const preview =
                section.key === "lectures"
                  ? schoolPreview.lectures?.courseName
                  : section.key === "trade"
                    ? schoolPreview.trade?.note
                    : section.key === "club"
                      ? schoolPreview.club?.title
                      : schoolPreview.food?.title;

              return (
                <MiniCampusCard
                  key={section.key}
                  title={section.title}
                  description={preview ?? `${section.title} 바로 보기`}
                  href={section.href}
                  icon={section.icon}
                  badge={section.key === "trade" ? "실시간" : "추천"}
                />
              );
            })}
          </div>
          <div className="space-y-3">
            {tradeHighlights.map((tradePost) => (
              <TradePostCard key={tradePost.id} tradePost={tradePost} />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="💬 캠퍼스 생활"
          description="동아리, 번개, 맛집 글이 끊기지 않게 이어집니다"
          href="/school"
        />
        {campusLifePosts.map((post) => (
          <FeedPostCard key={post.id} post={post} href="/school" />
        ))}
      </section>

      <section className="space-y-3">
        <SectionHeader title="🎯 입시" href="/admission" />
        {admissionPosts.map((post) => (
          <FeedPostCard key={post.id} post={post} href={`/admission/${post.id}`} />
        ))}
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="✨ 최근 올라온 흐름"
          description="핫갤, 입시, 학교 생활 글을 시간순으로 이어서 봅니다"
          href="/community"
        />
        <div className="space-y-3">
          {latestStream.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              href={
                post.category === "admission"
                  ? `/admission/${post.id}`
                  : post.category === "dating"
                    ? "/community?filter=dating"
                    : post.subcategory === "hot"
                      ? "/community?filter=hot"
                      : "/school"
              }
            />
          ))}
        </div>
        <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#f3f9f4_0%,#ffffff_62%,#fff6e7_100%)]">
          <CardContent className="flex items-center justify-between gap-3 py-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">스크롤이 끊기지 않게 구성했습니다</span>
              </div>
              <p className="text-[13px] leading-5 text-muted-foreground">
                핫갤에서 시작해 강의, 우리학교, 연애까지 자연스럽게 탐색할 수 있습니다.
              </p>
            </div>
            <Link href="/community" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              더 탐색하기
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
