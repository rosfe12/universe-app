import Link from "next/link";
import { ArrowUpRight, BookOpen, MessageCircle, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSchoolName } from "@/lib/mock-queries";
import type { LectureSummary } from "@/types";

export function LectureSummaryCard({
  lecture,
  href,
}: {
  lecture: LectureSummary;
  href?: string;
}) {
  const highlights = [
    lecture.isLightWorkload ? "과제 적음" : null,
    lecture.isFlexibleAttendance ? "출결 널널" : null,
    lecture.hasNoTeamProject ? "팀플 없음" : null,
    lecture.isGenerousGrading ? "학점 후함" : null,
  ].filter(Boolean) as string[];
  const reviewSummary =
    highlights.length > 0
      ? highlights.slice(0, 3).join(" · ")
      : "리뷰 요약을 불러오는 중";

  const content = (
    <Card className="group overflow-hidden border-white/85 bg-[linear-gradient(180deg,#fbfbff_0%,#ffffff_52%,#f6f7ff_100%)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_26px_52px_-32px_rgba(79,70,229,0.26)]">
      <CardHeader className="space-y-4 pb-4">
        <div className="grid grid-cols-[minmax(0,1fr)_112px] items-start gap-3">
          <div className="min-w-0 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-indigo-50 font-semibold text-indigo-700">
                  <BookOpen className="mr-1 h-3 w-3" />
                  {lecture.department}
                </Badge>
                <Badge variant="outline">{lecture.semester}</Badge>
                <Badge variant="default">
                  <Sparkles className="mr-1 h-3 w-3" />
                  꿀정보
                </Badge>
              </div>
              <CardTitle className="mt-3 text-[20px] font-bold leading-7">{lecture.courseName}</CardTitle>
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {lecture.professor} · {lecture.section}분반 · {lecture.dayTime}
              </p>
            </div>
            <div className="rounded-[22px] border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-900">
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                요약
              </div>
              <p className="mt-2 text-sm leading-6 text-indigo-950/85">{reviewSummary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{getSchoolName(lecture.schoolId)}</Badge>
              {highlights.slice(0, 3).map((highlight) => (
                <Badge key={highlight} variant="outline">
                  {highlight}
                </Badge>
              ))}
            </div>
          </div>
          <div className="min-w-[112px] rounded-[26px] border border-violet-100 bg-[linear-gradient(180deg,#eef2ff_0%,#ffffff_100%)] px-3 py-4 text-center text-violet-700 shadow-[0_22px_36px_-24px_rgba(99,102,241,0.45)]">
            <p className="text-[10px] font-semibold tracking-[0.12em] whitespace-nowrap">평균 점수</p>
            <p className="mt-1 text-2xl font-semibold">{lecture.averageHoneyScore.toFixed(1)}</p>
            <p className="mt-1 text-[11px] leading-5 text-violet-700/70">리뷰 {lecture.reviewCount}개 기반</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 border-t border-border/60 pt-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[20px] border border-black/5 bg-white/80 px-3 py-3">
            <p className="text-[11px] text-muted-foreground">과제</p>
            <p className="mt-1 text-sm font-semibold">{lecture.workloadLabel}</p>
          </div>
          <div className="rounded-[20px] border border-black/5 bg-white/80 px-3 py-3">
            <p className="text-[11px] text-muted-foreground">출결</p>
            <p className="mt-1 text-sm font-semibold">{lecture.attendanceLabel}</p>
          </div>
          <div className="rounded-[20px] border border-black/5 bg-white/80 px-3 py-3">
            <p className="text-[11px] text-muted-foreground">리뷰</p>
            <p className="mt-1 text-sm font-semibold">{lecture.reviewCount}개</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            핵심 후기 빠르게 보기
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            상세 보기
            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
