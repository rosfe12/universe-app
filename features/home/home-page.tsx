"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Repeat2,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { FeedList } from "@/components/shared/feed-list";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FeedPostCard } from "@/features/common/feed-post-card";
import { LectureSummaryCard } from "@/features/common/lecture-summary-card";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  getCommunityPosts,
  getCareerPosts,
  getCurrentSchool,
  getLectureById,
  getLectureSummaries,
  getTradePosts,
} from "@/lib/mock-queries";
import type { AppRuntimeSnapshot } from "@/types";

export function HomePage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const { loading, currentUser: runtimeUser } = useAppRuntime(initialSnapshot);
  const currentUser = runtimeUser;
  const currentSchool = getCurrentSchool();
  const schoolName = currentSchool?.name ?? "우리학교";
  const schoolFeedPosts = [
    ...getCommunityPosts("freshman"),
    ...getCommunityPosts("club"),
    ...getCommunityPosts("food"),
  ]
    .filter((post) => !currentSchool?.id || post.schoolId === currentSchool.id)
    .sort((a, b) => b.likes + b.commentCount * 2 - (a.likes + a.commentCount * 2))
    .slice(0, 5);
  const lectureHighlights = getLectureSummaries().slice(0, 3);
  const tradeHighlights = getTradePosts()
    .filter((tradePost) => !currentSchool?.id || tradePost.schoolId === currentSchool.id)
    .slice(0, 3);
  const communityHighlights = [
    ...getCommunityPosts("free").slice(0, 2),
    ...getCommunityPosts("ask").slice(0, 2),
    ...getCareerPosts("careerInfo").slice(0, 2),
  ]
    .sort((a, b) => b.likes - a.likes || +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 4);
  const hasSchoolFeedPosts = schoolFeedPosts.length > 0;
  const hasLectureHighlights = lectureHighlights.length > 0;
  const hasTradeHighlights = tradeHighlights.length > 0;
  const hasCommunityHighlights = communityHighlights.length > 0;

  return (
    <AppShell
      title="홈"
    >
      {loading ? <LoadingState /> : null}

      <section className="space-y-3">
        <SectionHeader
          title={currentUser.userType === "applicant" ? "🎯 지망학교 지금" : "🏫 우리학교 지금"}
          href="/school"
        />
        <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_58%,#f5f3ff_130%)]">
          <CardContent className="space-y-4 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
                메인 피드
              </p>
              <p className="mt-2 text-lg font-bold text-foreground">
                {currentUser.userType === "applicant"
                  ? `${schoolName} 관련 질문과 새내기 글부터 확인해요`
                  : `${schoolName} 안에서 바로 반응 붙는 글부터 보여줘요`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">학교 전용</Badge>
              <Badge variant="outline">새내기</Badge>
              <Badge variant="outline">동아리</Badge>
              <Badge variant="outline">맛집</Badge>
            </div>
          </CardContent>
        </Card>
        {hasSchoolFeedPosts ? (
          <FeedList>
            {schoolFeedPosts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                href={
                  post.subcategory === "freshman"
                    ? "/school?tab=freshman"
                    : post.subcategory === "food"
                      ? "/school?tab=food"
                      : "/school?tab=club"
                }
              />
            ))}
          </FeedList>
        ) : (
          <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_100%)]">
            <CardContent className="space-y-3 py-5">
              <p className="text-base font-semibold text-foreground">학교 피드가 곧 채워집니다</p>
              <Link
                href="/school"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                우리학교 열기
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="🔁 수강신청 교환"
          href="/trade"
        />
        <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#f8f7ff_0%,#ffffff_58%,#ede9fe_130%)]">
          <CardContent className="space-y-3 py-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              <Repeat2 className="h-3.5 w-3.5" />
              실시간 교환
            </div>
          </CardContent>
        </Card>
        {hasTradeHighlights ? (
          <div className="space-y-3">
            {tradeHighlights.map((tradePost) => (
              <Card key={tradePost.id} className="overflow-hidden border-white/80">
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-gray-900">
                      {getLectureById(tradePost.wantLectureId)?.courseName ?? tradePost.wantLectureId}
                    </span>
                    <span className="text-gray-500">{tradePost.status}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span>보유 {getLectureById(tradePost.haveLectureId)?.courseName ?? tradePost.haveLectureId}</span>
                    <span>원함 {getLectureById(tradePost.wantLectureId)?.courseName ?? tradePost.wantLectureId}</span>
                    <span>{tradePost.semester}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_100%)]">
            <CardContent className="space-y-3 py-5">
              <p className="text-base font-semibold text-foreground">교환 글이 올라오면 바로 이어집니다</p>
              <Link
                href="/trade"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                교환 보러 가기
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
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
                강의 한눈에
              </p>
              <p className="mt-2 text-lg font-bold text-foreground">수강 전에 먼저 보는 강의평만 골랐어요</p>
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
          title="💬 커뮤니티"
          href="/community"
        />
        {hasCommunityHighlights ? (
          <FeedList>
            {communityHighlights.map((post) => (
              <FeedPostCard key={post.id} post={post} href="/community" />
            ))}
          </FeedList>
        ) : (
          <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_100%)]">
            <CardContent className="space-y-3 py-5">
              <p className="text-base font-semibold text-foreground">커뮤니티 글이 올라오면 여기서 바로 보여줘요</p>
              <Link
                href="/community"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                커뮤니티 보기
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        )}
      </section>
    </AppShell>
  );
}
