"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search, Repeat2, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LectureSummaryCard } from "@/features/common/lecture-summary-card";
import { TradePostCard } from "@/features/common/trade-post-card";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { getCurrentSchool, getLectureSummaries, getTradePosts } from "@/lib/mock-queries";
import { canAccessSchoolFeatures } from "@/lib/permissions";
import { hasCompletedOnboarding } from "@/lib/supabase/app-data";
import type { AppRuntimeSnapshot } from "@/types";

type LectureView = "reviews" | "trade";

const FILTER_OPTIONS = [
  { key: "lightWorkload", label: "과제 적은 강의" },
  { key: "flexibleAttendance", label: "출결 널널" },
  { key: "noTeamProject", label: "팀플 없음" },
  { key: "generousGrading", label: "학점 후함" },
] as const;

export function LecturesPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const searchParams = useSearchParams();
  const initialView = searchParams.get("view") === "trade" ? "trade" : "reviews";
  const {
    loading,
    lectures: runtimeLectures,
    lectureReviews,
    tradePosts: runtimeTradePosts,
    currentUser: runtimeUser,
    isAuthenticated,
  } = useAppRuntime(initialSnapshot);
  const currentUser = runtimeUser;
  const [activeView, setActiveView] = useState<LectureView>(initialView);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const currentSchool = getCurrentSchool();
  const [filters, setFilters] = useState({
    lightWorkload: false,
    flexibleAttendance: false,
    noTeamProject: false,
    generousGrading: false,
  });

  useEffect(() => {
    setActiveView(searchParams.get("view") === "trade" ? "trade" : "reviews");
  }, [searchParams]);

  const lectures = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return getLectureSummaries().filter((lecture) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        lecture.courseName.toLowerCase().includes(normalizedQuery) ||
        lecture.professor.toLowerCase().includes(normalizedQuery);

      const matchesWorkload = !filters.lightWorkload || lecture.isLightWorkload;
      const matchesAttendance = !filters.flexibleAttendance || lecture.isFlexibleAttendance;
      const matchesTeamProject = !filters.noTeamProject || lecture.hasNoTeamProject;
      const matchesGrading = !filters.generousGrading || lecture.isGenerousGrading;

      return (
        matchesQuery &&
        matchesWorkload &&
        matchesAttendance &&
        matchesTeamProject &&
        matchesGrading
      );
    });
  }, [deferredQuery, filters, lectureReviews, runtimeLectures]);

  const tradeItems = useMemo(() => getTradePosts(), [runtimeTradePosts]);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const lectureOverview = useMemo(() => {
    const reviewCount = lectures.reduce((sum, lecture) => sum + lecture.reviewCount, 0);
    const averageScore =
      lectures.length === 0
        ? 0
        : lectures.reduce((sum, lecture) => sum + lecture.averageHoneyScore, 0) / lectures.length;
    const topLecture = lectures[0];

    return {
      reviewCount,
      averageScore,
      topLecture,
    };
  }, [lectures]);
  const featuredLecture = lectureOverview.topLecture;

  if (
    !loading &&
    isAuthenticated &&
    hasCompletedOnboarding(currentUser) &&
    !canAccessSchoolFeatures(currentUser)
  ) {
    return (
      <AppShell title="강의" subtitle="대학생 전용 강의 정보">
        <Card className="border-dashed border-white/80 bg-white/92">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="space-y-1">
              <p className="font-semibold">입시생 계정은 입시 게시판만 사용할 수 있습니다</p>
              <p className="text-sm text-muted-foreground">
                강의평과 수강신청 교환은 대학생 계정에서만 열립니다.
              </p>
            </div>
            <Button asChild>
              <Link href="/admission">입시 게시판으로 이동</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="강의"
      subtitle={`${currentSchool?.name ?? "건국대학교"} 강의평 탐색과 수강신청 매칭을 한 메뉴에서 이어봅니다`}
    >
      {loading ? <LoadingState /> : null}

      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.18),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,244,0.92))]">
        <CardContent className="space-y-4 py-6">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-white/80">
              강의평 + 수강신청 매칭
            </Badge>
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[22px] border border-white/80 bg-white/80 px-4 py-4">
              <p className="text-xs text-muted-foreground">강의 수</p>
              <p className="mt-1 text-lg font-semibold">{lectures.length}개</p>
            </div>
            <div className="rounded-[22px] border border-white/80 bg-white/80 px-4 py-4">
              <p className="text-xs text-muted-foreground">리뷰 수</p>
              <p className="mt-1 text-lg font-semibold">{lectureReviews.length}개</p>
            </div>
            <div className="rounded-[22px] border border-white/80 bg-white/80 px-4 py-4">
              <p className="text-xs text-muted-foreground">매칭 글</p>
              <p className="mt-1 text-lg font-semibold">{tradeItems.length}개</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as LectureView)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reviews">강의평 / 교수평</TabsTrigger>
          <TabsTrigger value="trade">수강신청 매칭</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          <Card className="bg-secondary/60">
            <CardContent className="space-y-4 py-5">
              <SectionHeader
                title="강의 검색"
                description="강의명과 교수명만 입력하면 바로 결과가 좁혀집니다"
              />
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="예: 경영데이터분석, 김서현"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {FILTER_OPTIONS.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          [filter.key]: !current[filter.key],
                        }))
                      }
                      className={`rounded-[20px] px-4 py-2 text-sm font-medium transition-colors ${
                        filters[filter.key]
                          ? "bg-primary text-primary-foreground"
                          : "bg-background/90 text-muted-foreground"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                {activeFilterCount > 0 || query.trim() ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setFilters({
                        lightWorkload: false,
                        flexibleAttendance: false,
                        noTeamProject: false,
                        generousGrading: false,
                      });
                    }}
                  >
                    초기화
                  </Button>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[22px] bg-white/90 px-4 py-4">
                  <p className="text-xs text-muted-foreground">검색 결과</p>
                  <p className="mt-1 text-lg font-semibold">{lectures.length}개</p>
                </div>
                <div className="rounded-[22px] bg-white/90 px-4 py-4">
                  <p className="text-xs text-muted-foreground">리뷰 합계</p>
                  <p className="mt-1 text-lg font-semibold">{lectureOverview.reviewCount}개</p>
                </div>
                <div className="rounded-[22px] bg-white/90 px-4 py-4">
                  <p className="text-xs text-muted-foreground">평균 꿀점수</p>
                  <p className="mt-1 text-lg font-semibold">
                    {lectureOverview.averageScore.toFixed(1)}
                  </p>
                </div>
              </div>
              <div className="rounded-[22px] border border-white/80 bg-white/85 px-4 py-4 text-sm text-muted-foreground">
                {featuredLecture ? (
                  <>
                    지금 가장 많이 보는 강의는 <span className="font-semibold text-foreground">{featuredLecture.courseName}</span> ·{" "}
                    {featuredLecture.professor}입니다.
                  </>
                ) : (
                  "조건에 맞는 강의를 찾지 못했습니다."
                )}
              </div>
              {featuredLecture && deferredQuery.trim().length === 0 ? (
                <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/75 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        오늘 많이 보는 강의
                      </p>
                      <p className="text-base font-semibold text-slate-950">
                        {featuredLecture.courseName}
                      </p>
                      <p className="text-sm text-slate-600">
                        {featuredLecture.professor} · 리뷰 {featuredLecture.reviewCount}개
                      </p>
                    </div>
                    <Badge className="bg-emerald-600 text-white">
                      {featuredLecture.averageHoneyScore.toFixed(1)}
                    </Badge>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <section className="space-y-3">
            <SectionHeader
              title="리뷰 많은 강의"
              description={
                deferredQuery.trim().length > 0 || activeFilterCount > 0
                  ? `검색 ${lectures.length}개 · 필터 ${activeFilterCount}개 적용`
                  : "리뷰 수와 평균 점수를 기준으로 먼저 볼 강의를 정리했습니다"
              }
            />
            {lectures.length === 0 ? (
              <EmptyState
                title="조건에 맞는 강의가 없습니다"
                description="검색어를 줄이거나 필터를 하나씩 해제해보세요."
              />
            ) : (
              lectures.map((lecture) => (
                <LectureSummaryCard
                  key={lecture.id}
                  lecture={lecture}
                  href={`/lectures/${lecture.id}`}
                />
              ))
            )}
          </section>
        </TabsContent>

        <TabsContent value="trade" className="space-y-4">
          <Card className="bg-secondary/60">
            <CardContent className="flex items-start gap-3 py-5">
              <div className="rounded-[20px] bg-primary/10 p-3 text-primary">
                <Repeat2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">수강신청 매칭 게시판</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  강의 탐색 중 바로 매칭 글까지 확인하도록 연결했습니다.
                </p>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-3">
            {tradeItems.map((tradePost) => (
              <TradePostCard key={tradePost.id} tradePost={tradePost} />
            ))}
          </section>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
