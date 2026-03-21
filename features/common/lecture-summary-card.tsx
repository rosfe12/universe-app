import Link from "next/link";
import { BookOpen, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {lecture.department}
              </span>
              <span>{lecture.semester}</span>
            </div>
            <h3 className="text-base font-semibold leading-6 text-gray-900">{lecture.courseName}</h3>
            <p className="text-sm leading-6 text-gray-500">
              {lecture.professor} · {lecture.section}분반 · {lecture.dayTime}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-gray-400">평균 점수</p>
            <p className="mt-1 text-2xl font-semibold text-indigo-600">
              {lecture.averageHoneyScore.toFixed(1)}
            </p>
          </div>
        </div>
        <p className="text-sm leading-6 text-gray-500">{reviewSummary}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{getSchoolName(lecture.schoolId)}</Badge>
          {highlights.slice(0, 3).map((highlight) => (
            <Badge key={highlight} variant="outline">
              {highlight}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            리뷰 {lecture.reviewCount}개
          </span>
          <span>{lecture.workloadLabel} · {lecture.attendanceLabel}</span>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
