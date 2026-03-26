"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Flame,
  Compass,
  GraduationCap,
  MessageCircle,
  Repeat2,
  Users2,
  UtensilsCrossed,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { AdPlaceholderCard } from "@/components/ads/ad-placeholder-card";
import { FeedList } from "@/components/shared/feed-list";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeader } from "@/components/shared/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { FeedPostCard } from "@/features/common/feed-post-card";
import { LectureSummaryCard } from "@/features/common/lecture-summary-card";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { TRADE_STATUS_LABELS } from "@/lib/constants";
import { isAdPlacementEnabled } from "@/lib/ads";
import { isMasterAdminEmail } from "@/lib/admin/master-admin-shared";
import {
  getAllCommunityFeedPosts,
  getLectureById,
  getMostCommentedPosts,
  getMostVotedPosts,
  getPostHref,
  getSchoolCommunityFeedPosts,
  getSchoolScopedAdmissionQuestions,
  getSchoolScopedCommunityPosts,
  getSchoolScopedLectureSummaries,
  getSchoolScopedTradePosts,
  getTrendingCommunityPosts,
} from "@/lib/mock-queries";
import { canWriteCommunity } from "@/lib/permissions";
import { getAuthFlowHref, hasCompletedOnboarding } from "@/lib/supabase/app-data";
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
  const {
    loading,
    currentUser: runtimeUser,
    isAuthenticated,
    schools,
    source,
  } = useAppRuntime(initialSnapshot, "home");
  const [showDeferredSections, setShowDeferredSections] = useState(false);
  const currentUser = runtimeUser;
  const schoolId = currentUser.schoolId;
  const currentSchool = schools.find((school) => school.id === schoolId) ?? null;
  const hasSelectedSchool = Boolean(currentSchool?.id);
  const isApplicant = currentUser.userType === "applicant";
  const hasFinishedOnboarding = hasCompletedOnboarding(currentUser);
  const canPreviewSchoolSections = isAuthenticated && hasFinishedOnboarding && hasSelectedSchool;
  const canAccessAnonymousBoard =
    (isAuthenticated && hasFinishedOnboarding && canWriteCommunity(currentUser)) ||
    isMasterAdminEmail(currentUser.email);

  const accessibleCommunityFeed = getAllCommunityFeedPosts().filter(
    (post) => canAccessAnonymousBoard || post.subcategory !== "anonymous",
  );
  const accessibleTrendingPosts = getTrendingCommunityPosts().filter(
    (post) => canAccessAnonymousBoard || post.subcategory !== "anonymous",
  );
  const accessibleMostVotedPosts = getMostVotedPosts().filter(
    (post) => canAccessAnonymousBoard || post.subcategory !== "anonymous",
  );
  const accessibleMostCommentedPosts = getMostCommentedPosts().filter(
    (post) => canAccessAnonymousBoard || post.subcategory !== "anonymous",
  );

  const schoolBoardPosts = canPreviewSchoolSections
    ? getSchoolScopedCommunityPosts(schoolId, "school")
    : [];
  const schoolFreshmanPosts = canPreviewSchoolSections
    ? getSchoolScopedCommunityPosts(schoolId, "freshman")
    : [];
  const schoolClubPosts = canPreviewSchoolSections
    ? getSchoolScopedCommunityPosts(schoolId, "club")
    : [];
  const schoolFoodPosts = canPreviewSchoolSections
    ? getSchoolScopedCommunityPosts(schoolId, "food")
    : [];
  const schoolAdmissionPosts = canPreviewSchoolSections
    ? getSchoolScopedAdmissionQuestions(schoolId)
    : [];
  const schoolLectureHighlights = canPreviewSchoolSections
    ? getSchoolScopedLectureSummaries(schoolId).slice(0, 3)
    : [];
  const tradeHighlights = canPreviewSchoolSections
    ? getSchoolScopedTradePosts(schoolId).slice(0, 3)
    : [];
  const hotNowPosts = accessibleTrendingPosts.slice(0, 6);
  const allPopularPosts = accessibleCommunityFeed.slice(0, 6);
  const schoolCommunityPosts = canPreviewSchoolSections
    ? getSchoolCommunityFeedPosts(schoolId)
        .filter((post) => canAccessAnonymousBoard || post.subcategory !== "anonymous")
        .slice(0, 6)
    : [];
  const mostVotedPosts = accessibleMostVotedPosts.slice(0, 4);
  const mostCommentedPosts = accessibleMostCommentedPosts.slice(0, 4);

  const schoolPopularPosts = [
    ...schoolCommunityPosts,
    ...schoolAdmissionPosts,
  ]
    .sort((a, b) => getEngagementScore(b) - getEngagementScore(a))
    .slice(0, 5);

  const todayViewedPosts = [
    ...hotNowPosts,
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

  useEffect(() => {
    const timer = window.setTimeout(() => setShowDeferredSections(true), 180);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading && source === "mock") {
    return (
      <AppShell title="홈">
        <LoadingState />
      </AppShell>
    );
  }

  return (
    <AppShell title="홈">
      {loading ? <LoadingState /> : null}

      <section className="space-y-4">
        <SectionHeader
          eyebrow="추천 피드"
          title="🔥 지금 뜨는 글"
        />
        {hotNowPosts.length ? (
          <FeedList className="rounded-[32px]">
            <FeedPostCard
              post={hotNowPosts[0]}
              href={getPostHref(hotNowPosts[0].id)}
              variant="featured"
              emphasis={hotNowPosts[0].schoolId === schoolId ? "school" : "trending"}
            />
            {hotNowPosts.slice(1, 4).map((post) => (
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
          title={isApplicant ? "🏫 지망학교 인기글" : "🏫 우리학교 인기글"}
          href="/school"
          actionLabel="학교 보기"
        />
        {canPreviewSchoolSections ? (
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
                  {menu.count > 0 ? `+${menu.count}` : "바로 보기"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="app-section-surface rounded-[28px] border-white/10 shadow-none">
            <CardContent className="space-y-3 py-5">
              <p className="text-base font-semibold text-foreground">
                {!isAuthenticated
                  ? "로그인하면 우리학교 피드가 열립니다"
                  : isApplicant
                    ? "지망학교를 선택하면 학교 전용 글을 볼 수 있습니다"
                    : "학교를 선택하면 우리학교 피드가 열립니다"}
              </p>
              <Link
                href={
                  !isAuthenticated
                    ? getAuthFlowHref({
                        isAuthenticated,
                        user: currentUser,
                        nextPath: "/school",
                      })
                    : "/onboarding"
                }
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                {!isAuthenticated ? "로그인하기" : isApplicant ? "지망학교 선택" : "학교 선택"}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}
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
                {hasSelectedSchool ? "아직 새 글이 적어요" : isApplicant ? "지망학교를 선택하세요" : "학교를 선택하세요"}
              </p>
              <Link href="/school" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                학교 열기
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {showDeferredSections ? (
        <>
          <section className="space-y-4">
            <SectionHeader
              eyebrow="참여"
              title="🗳 가장 많이 참여한 투표"
            />
            {mostVotedPosts.length ? (
              <FeedList>
                {mostVotedPosts.map((post, index) => (
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
                  <p className="text-sm leading-6 text-muted-foreground">아직 참여가 많은 투표가 없어요</p>
                  <p className="text-xs text-muted-foreground">첫 투표가 올라오면 여기서 바로 이어서 볼 수 있습니다.</p>
                </CardContent>
              </Card>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeader
              eyebrow="대화"
              title="💬 댓글 반응 좋은 글"
            />
            {mostCommentedPosts.length ? (
              <FeedList>
                {mostCommentedPosts.map((post, index) => (
                  <FeedPostCard
                    key={post.id}
                    post={post}
                    href={getPostHref(post.id)}
                    variant={index === 0 ? "default" : "dense"}
                    emphasis={post.schoolId === schoolId ? "school" : undefined}
                  />
                ))}
              </FeedList>
            ) : null}
          </section>

          <section className="space-y-4">
            <SectionHeader
              eyebrow="전체"
              title="🌍 전체 인기글"
              href="/community"
            />
            {allPopularPosts.length ? (
              <FeedList>
                {allPopularPosts.map((post) => (
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
        </>
      ) : (
        <section className="space-y-3">
          <div className="app-section-surface rounded-[28px] border-white/10 px-4 py-5">
            <div className="space-y-3">
              <div className="h-4 w-24 rounded-full bg-white/8" />
              <div className="h-5 w-40 rounded-full bg-white/10" />
              <div className="grid grid-cols-1 gap-3">
                <div className="h-28 rounded-[22px] bg-white/[0.04]" />
                <div className="h-28 rounded-[22px] bg-white/[0.04]" />
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <SectionHeader
          eyebrow="탐색"
          title="동아리·모임과 학교 주변 정보"
        />
        <div className="space-y-3">
          {canPreviewSchoolSections
            ? campusInfoCards.map((item) => (
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
              ))
            : (
              <Card className="app-section-surface rounded-[28px] border-white/10 shadow-none">
                <CardContent className="space-y-3 py-5">
                  <p className="text-base font-semibold text-foreground">
                    학교를 선택하면 캠퍼스 정보가 열립니다
                  </p>
                  <p className="text-sm text-muted-foreground">
                    동아리 모집, 학교 주변 맛집, 생활 정보를 학교 기준으로 묶어 보여줍니다.
                  </p>
                </CardContent>
              </Card>
            )}
          {isAdPlacementEnabled("feedInline") ? <AdPlaceholderCard placement="feedInline" /> : null}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="핵심 도구"
          title="강의 정보와 수강신청 교환"
        />
        <div className="space-y-3">
          {canPreviewSchoolSections && tradeHighlights.length ? (
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

          {canPreviewSchoolSections && schoolLectureHighlights.length ? (
            <div className="space-y-3">
              {schoolLectureHighlights.map((lecture) => (
                <LectureSummaryCard key={lecture.id} lecture={lecture} href={`/lectures/${lecture.id}`} />
              ))}
            </div>
          ) : (
            <Card className="app-section-surface rounded-[28px] border-white/10 shadow-none">
              <CardContent className="space-y-3 py-5">
                <p className="text-base font-semibold text-foreground">아직 강의 리뷰가 많지 않아요</p>
                <p className="text-sm text-muted-foreground">강의 페이지에서 먼저 둘러보거나 직접 첫 리뷰를 남길 수 있습니다.</p>
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
