"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, Repeat2, School, UtensilsCrossed, Users } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { FeedPostCard } from "@/features/common/feed-post-card";
import { LectureSummaryCard } from "@/features/common/lecture-summary-card";
import { TradePostCard } from "@/features/common/trade-post-card";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  getCommunityPosts,
  getCurrentSchool,
  getLectureSummaries,
  getTradePosts,
} from "@/lib/mock-queries";
import type { AppRuntimeSnapshot } from "@/types";

type SchoolTab = "lectures" | "trade" | "club" | "food";

const SCHOOL_SECTIONS = [
  {
    value: "lectures",
    label: "강의 정보",
    icon: BookOpen,
    href: "/lectures",
  },
  {
    value: "trade",
    label: "수강신청 교환",
    icon: Repeat2,
    href: "/lectures?view=trade",
  },
  {
    value: "club",
    label: "동아리",
    icon: Users,
    href: "/school?tab=club",
  },
  {
    value: "food",
    label: "맛집",
    icon: UtensilsCrossed,
    href: "/school?tab=food",
  },
] as const satisfies ReadonlyArray<{
  value: SchoolTab;
  label: string;
  icon: typeof BookOpen;
  href: string;
}>;

function isSchoolTab(value: string | null): value is SchoolTab {
  return SCHOOL_SECTIONS.some((section) => section.value === value);
}

export function SchoolPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: SchoolTab = isSchoolTab(tabParam) ? tabParam : "lectures";
  const { loading, lectures: runtimeLectures, lectureReviews, tradePosts: runtimeTradePosts, posts } =
    useAppRuntime(initialSnapshot);
  const [activeTab, setActiveTab] = useState<SchoolTab>(initialTab);
  const currentSchool = getCurrentSchool();
  const schoolName = currentSchool?.name ?? "건국대학교";

  useEffect(() => {
    setActiveTab(isSchoolTab(tabParam) ? tabParam : "lectures");
  }, [tabParam]);

  const lectures = useMemo(() => getLectureSummaries().slice(0, 6), [runtimeLectures, lectureReviews]);
  const tradeItems = useMemo(() => getTradePosts().slice(0, 6), [runtimeTradePosts]);
  const clubPosts = useMemo(() => getCommunityPosts("club").slice(0, 6), [posts]);
  const foodPosts = useMemo(() => getCommunityPosts("food").slice(0, 6), [posts]);

  return (
    <AppShell
      title={schoolName}
      subtitle="우리 학교 이야기"
    >
      {loading ? <LoadingState /> : null}

      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.18),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,244,0.92))]">
        <CardContent className="space-y-5 py-6">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="secondary" className="bg-white/85 text-foreground">
              우리 학교 중심
            </Badge>
            <School className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-[28px] font-semibold tracking-tight text-slate-950">{schoolName}</h2>
            <p className="text-sm leading-6 text-slate-600">
              강의 정보, 수강신청 교환, 동아리, 맛집까지 학교 안에서 반복 사용되는 흐름만 모았습니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SCHOOL_SECTIONS.map((section) => (
              <Link key={section.value} href={`/school?tab=${section.value}`}>
                <Card className="h-full border-white/80 bg-white/86 shadow-none transition-transform hover:-translate-y-0.5">
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className="rounded-[20px] bg-primary/10 p-3 text-primary">
                      <section.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{section.label}</p>
                      <p className="text-xs text-muted-foreground">우리 학교 전용 흐름</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SchoolTab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          {SCHOOL_SECTIONS.map((section) => (
            <TabsTrigger key={section.value} value={section.value}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="lectures" className="space-y-3">
          <SectionHeader title="강의 정보" href="/lectures" />
          {lectures.map((lecture) => (
            <LectureSummaryCard key={lecture.id} lecture={lecture} href={`/lectures/${lecture.id}`} />
          ))}
          <Button asChild variant="outline" className="w-full">
            <Link href="/lectures">강의 정보 전체 보기</Link>
          </Button>
        </TabsContent>

        <TabsContent value="trade" className="space-y-3">
          <SectionHeader title="수강신청 교환" href="/lectures?view=trade" />
          {tradeItems.map((tradePost) => (
            <TradePostCard key={tradePost.id} tradePost={tradePost} />
          ))}
          <Button asChild variant="outline" className="w-full">
            <Link href="/lectures?view=trade">수강신청 교환 전체 보기</Link>
          </Button>
        </TabsContent>

        <TabsContent value="club" className="space-y-3">
          <SectionHeader title="동아리" />
          {clubPosts.map((post) => (
            <FeedPostCard key={post.id} post={post} />
          ))}
        </TabsContent>

        <TabsContent value="food" className="space-y-3">
          <SectionHeader title="맛집" />
          {foodPosts.map((post) => (
            <FeedPostCard key={post.id} post={post} />
          ))}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
