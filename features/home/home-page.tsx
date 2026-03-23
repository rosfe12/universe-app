"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Compass,
  GraduationCap,
  Repeat2,
  Users2,
  UtensilsCrossed,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { FeedList } from "@/components/shared/feed-list";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { FeedPostCard } from "@/features/common/feed-post-card";
import { LectureSummaryCard } from "@/features/common/lecture-summary-card";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { TRADE_STATUS_LABELS } from "@/lib/constants";
import {
  getCommunityPosts,
  getCareerPosts,
  getLectureById,
  getPostHref,
  getSchoolScopedAdmissionQuestions,
  getSchoolScopedCommunityPosts,
  getSchoolScopedLectureSummaries,
  getSchoolScopedTradePosts,
} from "@/lib/mock-queries";
import { getPostViewCount } from "@/lib/utils";
import type { AppRuntimeSnapshot, Post } from "@/types";

function getEngagementScore(post: Post) {
  return getPostViewCount(post) + post.likes * 4 + post.commentCount * 7;
}

export function HomePage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const { loading, currentUser: runtimeUser, schools } = useAppRuntime(initialSnapshot, "home");
  const currentUser = runtimeUser;
  const schoolId = currentUser.schoolId;
  const currentSchool = schools.find((school) => school.id === schoolId) ?? null;
  const hasSelectedSchool = Boolean(currentSchool?.id);
  const isApplicant = currentUser.userType === "applicant";

  const schoolBoardPosts = getSchoolScopedCommunityPosts(schoolId, "school");
  const schoolFreshmanPosts = getSchoolScopedCommunityPosts(schoolId, "freshman");
  const schoolClubPosts = getSchoolScopedCommunityPosts(schoolId, "club");
  const schoolFoodPosts = getSchoolScopedCommunityPosts(schoolId, "food");
  const schoolAdmissionPosts = getSchoolScopedAdmissionQuestions(schoolId);
  const schoolLectureHighlights = getSchoolScopedLectureSummaries(schoolId).slice(0, 3);
  const tradeHighlights = getSchoolScopedTradePosts(schoolId).slice(0, 3);
  const communityHighlights = [
    ...getCommunityPosts("free").slice(0, 4),
    ...getCommunityPosts("ask").slice(0, 4),
    ...getCareerPosts("careerInfo").slice(0, 2),
  ].sort((a, b) => getEngagementScore(b) - getEngagementScore(a));

  const schoolPopularPosts = [
    ...schoolBoardPosts,
    ...schoolFreshmanPosts,
    ...schoolAdmissionPosts,
  ]
    .sort((a, b) => getEngagementScore(b) - getEngagementScore(a))
    .slice(0, 5);

  const todayViewedPosts = [
    ...schoolPopularPosts,
    ...communityHighlights,
    ...schoolClubPosts.slice(0, 2),
    ...schoolFoodPosts.slice(0, 2),
  ]
    .sort((a, b) => getEngagementScore(b) - getEngagementScore(a))
    .slice(0, 6);

  const featuredPost = todayViewedPosts[0] ?? null;
  const realtimeReactionPosts = [...todayViewedPosts]
    .sort(
      (a, b) =>
        b.commentCount * 8 + b.likes * 3 - (a.commentCount * 8 + a.likes * 3) ||
        +new Date(b.createdAt) - +new Date(a.createdAt),
    )
    .slice(0, 4);

  const trendingTopics = Array.from(
    new Map(
      [...todayViewedPosts, ...schoolPopularPosts]
        .flatMap((post) => post.tags ?? [])
        .filter(Boolean)
        .slice(0, 8)
        .map((tag) => [tag, tag]),
    ).values(),
  ).slice(0, 6);

  const newcomerPosts = [...schoolFreshmanPosts, ...schoolAdmissionPosts]
    .sort((a, b) => getEngagementScore(b) - getEngagementScore(a))
    .slice(0, 4);

  const campusInfoCards = [
    {
      title: "동아리/모임 모집",
      description: schoolClubPosts[0]?.title ?? "",
      href: "/school?tab=club",
      icon: Users2,
      accent: "from-indigo-500/12 to-sky-500/5",
    },
    {
      title: "학교 주변 맛집/정보",
      description: schoolFoodPosts[0]?.title ?? "",
      href: "/school?tab=food",
      icon: UtensilsCrossed,
      accent: "from-amber-500/12 to-rose-500/5",
    },
  ] as const;

  const quickMenus = [
    {
      title: "강의정보",
      href: "/lectures",
      icon: BookOpen,
      count: schoolLectureHighlights.length,
    },
    {
      title: "수강신청 교환",
      href: "/trade",
      icon: Repeat2,
      count: tradeHighlights.length,
    },
    {
      title: isApplicant ? "입시 Q&A" : "학교 게시판",
      href: "/school",
      icon: GraduationCap,
      count: isApplicant ? schoolAdmissionPosts.length : schoolBoardPosts.length,
    },
    {
      title: "캠퍼스 탐색",
      href: "/school",
      icon: Compass,
      count: schoolClubPosts.length + schoolFoodPosts.length,
    },
  ] as const;

  return (
    <AppShell title="홈">
      {loading ? <LoadingState /> : null}

      <section className="space-y-4">
        <SectionHeader
          eyebrow="추천 피드"
          title="오늘 많이 보는 글"
        />
        {featuredPost ? (
          <FeedList className="rounded-[32px]">
            <FeedPostCard
              post={featuredPost}
              href={getPostHref(featuredPost.id)}
              variant="featured"
              emphasis={featuredPost.schoolId === schoolId ? "school" : "trending"}
            />
          </FeedList>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Card className="app-section-surface overflow-hidden rounded-[28px] border-white/10 shadow-none">
            <CardContent className="space-y-2 py-5">
              <p className="app-kicker">Our campus</p>
              <p className="text-lg font-semibold text-foreground">
                {hasSelectedSchool ? currentSchool?.name : isApplicant ? "지망학교 선택" : "학교 선택"}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {hasSelectedSchool ? `+${schoolPopularPosts.length}` : "선택 필요"}
              </p>
            </CardContent>
          </Card>
          <Card className="app-section-surface overflow-hidden rounded-[28px] border-white/10 shadow-none">
            <CardContent className="space-y-2 py-5">
              <p className="app-kicker">Live topics</p>
              <div className="flex flex-wrap gap-2">
                {trendingTopics.length ? (
                  trendingTopics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300"
                    >
                      {topic}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">주제 없음</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Campus"
          title={isApplicant ? "지금 지망학교는" : "지금 우리 학교는"}
          href="/school"
          actionLabel="학교 보기"
        />
        <div className="grid grid-cols-2 gap-3">
          {quickMenus.map((menu) => (
            <Link
              key={menu.title}
              href={menu.href}
              className="app-section-surface app-soft-hover rounded-[28px] border-white/10 p-4"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
                <menu.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-foreground">{menu.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {menu.count > 0 ? `+${menu.count}` : "준비 중"}
              </p>
            </Link>
          ))}
        </div>
        {schoolPopularPosts.length ? (
          <FeedList>
            {schoolPopularPosts.map((post, index) => (
              <FeedPostCard
                key={post.id}
                post={post}
                href={getPostHref(post.id)}
                emphasis="school"
                variant={index === 0 ? "featured" : "default"}
              />
            ))}
          </FeedList>
        ) : (
          <Card className="app-section-surface rounded-[28px] border-white/10 shadow-none">
            <CardContent className="space-y-3 py-5">
              <p className="text-base font-semibold text-foreground">
                {hasSelectedSchool ? "학교 피드 준비 중" : isApplicant ? "지망학교를 선택하세요" : "학교를 선택하세요"}
              </p>
              <Link href="/school" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                학교 열기
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="추천 큐레이션"
          title="새내기 많이 보는 글"
        />
        {newcomerPosts.length ? (
          <FeedList>
            {newcomerPosts.map((post, index) => (
              <FeedPostCard
                key={post.id}
                post={post}
                href={getPostHref(post.id)}
                variant={index === 0 ? "default" : "dense"}
                emphasis={post.schoolId === schoolId ? "school" : undefined}
              />
            ))}
          </FeedList>
        ) : (
          <Card className="app-section-surface rounded-[28px] border-white/10 shadow-none">
            <CardContent className="py-5">
              <p className="text-sm leading-6 text-muted-foreground">게시글 준비 중</p>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="탐색"
          title="동아리·모임과 학교 주변 정보"
        />
        <div className="space-y-3">
          {campusInfoCards.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="app-section-surface app-soft-hover block rounded-[30px] border-white/10"
            >
              <CardContent className="flex items-start justify-between gap-4 py-5">
                <div className="min-w-0">
                  <div className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${item.accent} px-3 py-1 text-xs font-semibold text-foreground`}>
                    <item.icon className="h-3.5 w-3.5" />
                    {item.title}
                  </div>
                  {item.description ? (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="실시간"
          title="실시간 반응 좋은 글"
          href="/community"
        />
        {realtimeReactionPosts.length ? (
          <FeedList>
            {realtimeReactionPosts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                href={getPostHref(post.id)}
                variant="dense"
                emphasis={post.schoolId === schoolId ? "school" : "trending"}
              />
            ))}
          </FeedList>
        ) : null}
      </section>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="핵심 도구"
          title="강의 정보와 수강신청 교환"
        />
        <div className="space-y-3">
          {tradeHighlights.length ? (
            <Card className="app-section-surface overflow-hidden rounded-[30px] border-white/10 shadow-none">
              <CardContent className="space-y-3 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600 dark:bg-violet-400/10 dark:text-violet-300">
                    <Repeat2 className="h-3.5 w-3.5" />
                    수강신청 교환
                  </div>
                  <Link href="/trade" className="text-sm font-semibold text-primary">
                    보기
                  </Link>
                </div>
                <div className="space-y-2">
                  {tradeHighlights.map((tradePost) => (
                    <Link
                      key={tradePost.id}
                      href="/trade"
                      className="app-muted-surface block rounded-[22px] px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-foreground">
                          {getLectureById(tradePost.wantLectureId)?.courseName ?? tradePost.wantLectureId}
                        </span>
                        <span className="text-muted-foreground">{TRADE_STATUS_LABELS[tradePost.status]}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        보유 {getLectureById(tradePost.haveLectureId)?.courseName ?? tradePost.haveLectureId} · 원함{" "}
                        {getLectureById(tradePost.wantLectureId)?.courseName ?? tradePost.wantLectureId}
                      </p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {schoolLectureHighlights.length ? (
            <div className="space-y-3">
              {schoolLectureHighlights.map((lecture) => (
                <LectureSummaryCard key={lecture.id} lecture={lecture} href={`/lectures/${lecture.id}`} />
              ))}
            </div>
          ) : (
            <Card className="app-section-surface rounded-[28px] border-white/10 shadow-none">
              <CardContent className="space-y-3 py-5">
                <p className="text-base font-semibold text-foreground">강의 정보 준비 중</p>
                <Link href="/lectures" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  강의 페이지 보기
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </AppShell>
  );
}
