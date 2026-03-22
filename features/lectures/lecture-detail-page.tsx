"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, PenSquare, ThumbsUp } from "lucide-react";

import { AdPlaceholderCard } from "@/components/ads/ad-placeholder-card";
import { AppShell } from "@/components/layout/app-shell";
import { ActionFeedbackBanner } from "@/components/shared/action-feedback-banner";
import { LoadingState } from "@/components/shared/loading-state";
import { ReportBlockActions } from "@/components/shared/report-block-actions";
import { SectionHeader } from "@/components/shared/section-header";
import { VisibilityLevelSelect } from "@/components/shared/visibility-level-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createLectureReview } from "@/app/actions/content-actions";
import { PostAuthorRow } from "@/features/common/post-author-row";
import { TrustScoreBadge } from "@/components/shared/trust-score-badge";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { isAdPlacementEnabled } from "@/lib/ads";
import {
  ATTENDANCE_LABELS,
  DIFFICULTY_LABELS,
  EXAM_STYLE_LABELS,
  GRADING_STYLE_LABELS,
  STANDARD_VISIBILITY_LEVELS,
  WORKLOAD_LABELS,
} from "@/lib/constants";
import { getModerationSemesterRank, validateLectureReviewSubmission } from "@/lib/moderation";
import {
  addBlockToSnapshot,
  addLectureReviewToSnapshot,
  addReportToSnapshot,
} from "@/lib/runtime-mutations";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import {
  getLectureById,
  getLectureReviews,
  getSchoolName,
  getTrustScore,
  isRepeatedlyReportedUser,
} from "@/lib/mock-queries";
import { canAccessSchoolFeatures, canWriteLectureReview } from "@/lib/permissions";
import {
  createBlockRecord,
  createReportRecord,
  getAuthFlowHref,
  hasCompletedOnboarding,
} from "@/lib/supabase/app-data";
import { getStandardVisibilityLevel, getUserLevel } from "@/lib/user-identity";
import { average } from "@/lib/utils";
import type { AppRuntimeSnapshot, LectureReview, ReportReason } from "@/types";

const reviewSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]),
  workload: z.enum(["light", "medium", "heavy"]),
  attendance: z.enum(["flexible", "medium", "strict"]),
  examStyle: z.enum(["multipleChoice", "essay", "project", "mixed"]),
  teamProject: z.enum(["있음", "없음"]),
  presentation: z.enum(["있음", "없음"]),
  gradingStyle: z.enum(["tough", "medium", "generous"]),
  honeyScore: z.coerce.number().min(1).max(5),
  shortComment: z.string().min(4),
  longComment: z.string().min(10),
  visibilityLevel: z.enum(["school", "schoolDepartment"]),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

export function LectureDetailPage({
  lectureId,
  initialSnapshot,
}: {
  lectureId: string;
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    lectureReviews: runtimeLectureReviews,
    reports,
    blocks,
    currentUser: runtimeUser,
    loading,
    source,
    isAuthenticated,
    refresh,
    setSnapshot,
  } = useAppRuntime(initialSnapshot);
  const currentUser = runtimeUser;
  const lecture = getLectureById(lectureId);
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState(getLectureReviews(lectureId));
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const canWriteReview =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canWriteLectureReview(currentUser);

  useEffect(() => {
    setReviews(getLectureReviews(lectureId));
  }, [blocks, lectureId, reports, runtimeLectureReviews]);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      difficulty: "medium",
      workload: "medium",
      attendance: "medium",
      examStyle: "mixed",
      teamProject: "없음",
      presentation: "없음",
      gradingStyle: "medium",
      honeyScore: 4,
      shortComment: "",
      longComment: "",
      visibilityLevel: getStandardVisibilityLevel(
        currentUser.defaultVisibilityLevel,
        currentUser,
      ),
    },
  });

  const summary = useMemo(() => {
    const reviewCount = reviews.length;
    const easyCount = reviews.filter((review) => review.difficulty === "easy").length;
    const generousCount = reviews.filter((review) => review.gradingStyle === "generous").length;
    const noTeamProjectCount = reviews.filter((review) => !review.teamProject).length;
    const flexibleAttendanceCount = reviews.filter(
      (review) => review.attendance === "flexible",
    ).length;
    const totalHelpful = reviews.reduce(
      (sum, review) => sum + review.helpfulCount,
      0,
    );

    return {
      averageScore: average(reviews.map((review) => review.honeyScore)),
      reviewCount,
      easyRate: reviewCount ? Math.round((easyCount / reviewCount) * 100) : 0,
      generousRate: reviewCount ? Math.round((generousCount / reviewCount) * 100) : 0,
      noTeamProjectRate: reviewCount
        ? Math.round((noTeamProjectCount / reviewCount) * 100)
        : 0,
      flexibleAttendanceRate: reviewCount
        ? Math.round((flexibleAttendanceCount / reviewCount) * 100)
        : 0,
      totalHelpful,
      difficulty: {
        easy: easyCount,
        medium: reviews.filter((review) => review.difficulty === "medium").length,
        hard: reviews.filter((review) => review.difficulty === "hard").length,
      },
      workload: {
        light: reviews.filter((review) => review.workload === "light").length,
        medium: reviews.filter((review) => review.workload === "medium").length,
        heavy: reviews.filter((review) => review.workload === "heavy").length,
      },
      exam: {
        multipleChoice: reviews.filter((review) => review.examStyle === "multipleChoice").length,
        essay: reviews.filter((review) => review.examStyle === "essay").length,
        project: reviews.filter((review) => review.examStyle === "project").length,
        mixed: reviews.filter((review) => review.examStyle === "mixed").length,
      },
    };
  }, [reviews]);

  const recentReviews = useMemo(
    () =>
      [...reviews]
        .sort(
          (a, b) =>
            getModerationSemesterRank(b.semester) -
              getModerationSemesterRank(a.semester) ||
            +new Date(b.createdAt) - +new Date(a.createdAt),
        )
        .slice(0, 6),
    [reviews],
  );

  const popularReviews = useMemo(
    () =>
      [...reviews]
        .sort(
          (a, b) =>
            b.helpfulCount - a.helpfulCount ||
            b.honeyScore - a.honeyScore ||
            +new Date(b.createdAt) - +new Date(a.createdAt),
        )
        .slice(0, 6),
    [reviews],
  );
  if (!lecture) {
    return (
      <AppShell title="강의 상세" subtitle="강의를 불러오는 중입니다.">
        <LoadingState />
      </AppShell>
    );
  }

  if (
    !loading &&
    isAuthenticated &&
    hasCompletedOnboarding(currentUser) &&
    !canAccessSchoolFeatures(currentUser)
  ) {
    return (
      <AppShell title={lecture.courseName} subtitle="대학생 전용 강의 정보">
        <Card className="border-dashed border-white/80 bg-white/92">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="space-y-1">
              <p className="font-semibold">입시생 계정은 입시 게시판만 사용할 수 있습니다</p>
              <p className="text-sm text-muted-foreground">
                강의 상세와 강의평은 대학생 계정에서만 열립니다.
              </p>
            </div>
            <Button asChild>
              <Link href="/school?tab=admission">지망학교 보기</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const createdAt = new Date().toISOString();
    const validationError = validateLectureReviewSubmission(getRuntimeSnapshot(), {
      reviewerId: currentUser.id,
      lectureId,
      semester: lecture.semester,
      shortComment: values.shortComment,
      longComment: values.longComment,
    });
    if (validationError) {
      form.setError("root", { message: validationError });
      return;
    }

    const localReview = {
      id: `review-local-${reviews.length + 1}`,
      lectureId,
      reviewerId: currentUser.id,
      visibilityLevel: values.visibilityLevel,
      difficulty: values.difficulty,
      workload: values.workload,
      attendance: values.attendance,
      examStyle: values.examStyle,
      teamProject: values.teamProject === "있음",
      presentation: values.presentation === "있음",
      gradingStyle: values.gradingStyle,
      honeyScore: values.honeyScore,
      helpfulCount: 0,
      shortComment: values.shortComment,
      longComment: values.longComment,
      semester: lecture.semester,
      createdAt,
    };

    if (source === "supabase" && isAuthenticated) {
      startSubmitTransition(() => {
        void (async () => {
          try {
            await createLectureReview({
              lectureId,
              difficulty: values.difficulty,
              workload: values.workload,
              attendance: values.attendance,
              examStyle: values.examStyle,
              teamProject: values.teamProject === "있음",
              presentation: values.presentation === "있음",
              gradingStyle: values.gradingStyle,
              honeyScore: values.honeyScore,
              shortComment: values.shortComment,
              longComment: values.longComment,
              semester: lecture.semester,
              visibilityLevel: values.visibilityLevel,
            });
            setOpen(false);
            form.reset();
            setSuccessMessage("리뷰가 등록되었습니다.");
            await refresh();
          } catch (error) {
            form.setError("root", {
              message: error instanceof Error ? error.message : "리뷰 등록에 실패했습니다.",
            });
          }
        })();
      });
      return;
    } else {
      setReviews((current) => [localReview, ...current]);
      setSnapshot((current) => addLectureReviewToSnapshot(current, localReview));
    }

    setOpen(false);
    form.reset();
    setSuccessMessage("리뷰가 등록되었습니다.");
  });

  return (
    <AppShell
      title="강의 상세"
      subtitle={`${getSchoolName(lecture.schoolId)} 강의평`}
      topAction={
        <Button asChild size="icon" variant="ghost">
          <Link href="/lectures" aria-label="뒤로">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      }
    >
      {loading ? <LoadingState /> : null}
      {successMessage ? (
        <ActionFeedbackBanner
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      ) : null}
      <Card className="overflow-hidden bg-[linear-gradient(135deg,#173821_0%,#2d5a35_52%,#f4e3bb_100%)] text-white">
        <CardContent className="space-y-5 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge className="border-white/10 bg-white/15 text-white">
                {lecture.department}
              </Badge>
              <CardTitle className="mt-3 text-2xl">{lecture.courseName}</CardTitle>
              <p className="mt-2 text-sm text-white/80">
                {lecture.professor} · {getSchoolName(lecture.schoolId)} · {lecture.semester}
              </p>
              <p className="mt-1 text-sm text-white/70">
                {lecture.section}분반 · {lecture.dayTime}
              </p>
            </div>
            <div className="rounded-[24px] bg-white/12 px-4 py-3 text-center backdrop-blur">
              <p className="text-[11px] text-white/70">평균 꿀강 점수</p>
              <p className="text-3xl font-semibold">{summary.averageScore.toFixed(1)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HeroMiniStat label="리뷰 수" value={`${summary.reviewCount}개`} />
            <HeroMiniStat label="도움수" value={`${summary.totalHelpful}회`} />
            <HeroMiniStat label="후한 평가" value={`${summary.generousRate}%`} />
            <HeroMiniStat label="팀플 없음" value={`${summary.noTeamProjectRate}%`} />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <SectionHeader
          title="항목별 통계"
          description="리뷰를 바탕으로 많이 보는 항목을 정리했어요"
        />
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="쉬움 비율" value={`${summary.easyRate}%`} />
          <StatTile label="출결 널널" value={`${summary.flexibleAttendanceRate}%`} />
          <StatTile label="과제 적음" value={`${summary.workload.light}명`} />
          <StatTile label="객관식 비율" value={`${summary.exam.multipleChoice}명`} />
        </div>
        <Card>
          <CardContent className="space-y-4 py-5">
            <DistributionRow
              label="난이도"
              items={[
                { label: "쉬움", value: summary.difficulty.easy, total: summary.reviewCount, color: "bg-emerald-500" },
                { label: "보통", value: summary.difficulty.medium, total: summary.reviewCount, color: "bg-amber-500" },
                { label: "어려움", value: summary.difficulty.hard, total: summary.reviewCount, color: "bg-rose-500" },
              ]}
            />
            <DistributionRow
              label="과제량"
              items={[
                { label: "적음", value: summary.workload.light, total: summary.reviewCount, color: "bg-emerald-500" },
                { label: "보통", value: summary.workload.medium, total: summary.reviewCount, color: "bg-amber-500" },
                { label: "많음", value: summary.workload.heavy, total: summary.reviewCount, color: "bg-slate-500" },
              ]}
            />
            <DistributionRow
              label="시험 방식"
              items={[
                { label: "객관식", value: summary.exam.multipleChoice, total: summary.reviewCount, color: "bg-emerald-500" },
                { label: "서술형", value: summary.exam.essay, total: summary.reviewCount, color: "bg-amber-500" },
                { label: "과제 대체", value: summary.exam.project, total: summary.reviewCount, color: "bg-sky-500" },
                { label: "혼합", value: summary.exam.mixed, total: summary.reviewCount, color: "bg-violet-500" },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="리뷰 보기"
          description="최근 올라온 후기와 많이 도움받은 후기를 나눠봤습니다"
        />
        <Tabs defaultValue="recent" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="recent">최근 리뷰</TabsTrigger>
            <TabsTrigger value="popular">인기 리뷰</TabsTrigger>
          </TabsList>
          <TabsContent value="recent" className="space-y-3">
            {recentReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                latestSemester={lecture.semester}
                repeatedlyReported={isRepeatedlyReportedUser(review.reviewerId)}
                onReport={async ({ reason, memo }) => {
                  if (source === "supabase" && isAuthenticated) {
                    await createReportRecord({
                      reporterId: currentUser.id,
                      targetType: "review",
                      targetId: review.id,
                      reason,
                      memo,
                    });
                    await refresh();
                    return;
                  }

                  setSnapshot((current) =>
                    addReportToSnapshot(current, {
                      targetType: "review",
                      targetId: review.id,
                      reporterId: currentUser.id,
                      reason: reason ?? "other",
                      memo,
                    }),
                  );
                }}
                onBlock={async () => {
                  if (source === "supabase" && isAuthenticated) {
                    await createBlockRecord({
                      blockerId: currentUser.id,
                      blockedUserId: review.reviewerId,
                    });
                    await refresh();
                    return;
                  }

                  setSnapshot((current) =>
                    addBlockToSnapshot(current, {
                      blockerId: currentUser.id,
                      blockedUserId: review.reviewerId,
                    }),
                  );
                }}
              />
            ))}
          </TabsContent>
          <TabsContent value="popular" className="space-y-3">
            {popularReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                latestSemester={lecture.semester}
                highlightHelpful
                repeatedlyReported={isRepeatedlyReportedUser(review.reviewerId)}
                onReport={async ({ reason, memo }) => {
                  if (source === "supabase" && isAuthenticated) {
                    await createReportRecord({
                      reporterId: currentUser.id,
                      targetType: "review",
                      targetId: review.id,
                      reason,
                      memo,
                    });
                    await refresh();
                    return;
                  }

                  setSnapshot((current) =>
                    addReportToSnapshot(current, {
                      targetType: "review",
                      targetId: review.id,
                      reporterId: currentUser.id,
                      reason: reason ?? "other",
                      memo,
                    }),
                  );
                }}
                onBlock={async () => {
                  if (source === "supabase" && isAuthenticated) {
                    await createBlockRecord({
                      blockerId: currentUser.id,
                      blockedUserId: review.reviewerId,
                    });
                    await refresh();
                    return;
                  }

                  setSnapshot((current) =>
                    addBlockToSnapshot(current, {
                      blockerId: currentUser.id,
                      blockedUserId: review.reviewerId,
                    }),
                  );
                }}
              />
            ))}
          </TabsContent>
        </Tabs>
      </section>

      {isAdPlacementEnabled("lectureDetailFooter") ? (
        <AdPlaceholderCard placement="lectureDetailFooter" />
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-20 shadow-soft md:right-[calc(50%-215px+1rem)]"
          onClick={() => {
            if (!canWriteReview) {
              if (isAuthenticated && hasCompletedOnboarding(currentUser)) {
                router.push(`/onboarding?next=${encodeURIComponent(pathname)}`);
                return;
              }
              router.push(
                getAuthFlowHref({
                  isAuthenticated,
                  user: currentUser,
                  nextPath: pathname,
                }),
              );
              return;
            }

            setOpen(true);
          }}
        >
          <PenSquare className="h-4 w-4" />
          리뷰 작성
        </Button>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>강의평 작성</DialogTitle>
            <DialogDescription>
              강의 정보를 빠르게 남길 수 있도록 항목별로 작성해보세요.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <ReviewSelect
                label="난이도"
                value={form.watch("difficulty")}
                onChange={(value) => form.setValue("difficulty", value as ReviewFormValues["difficulty"])}
                options={[
                  ["easy", "쉬움"],
                  ["medium", "보통"],
                  ["hard", "어려움"],
                ]}
              />
              <ReviewSelect
                label="과제량"
                value={form.watch("workload")}
                onChange={(value) => form.setValue("workload", value as ReviewFormValues["workload"])}
                options={[
                  ["light", "적음"],
                  ["medium", "보통"],
                  ["heavy", "많음"],
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ReviewSelect
                label="출결"
                value={form.watch("attendance")}
                onChange={(value) => form.setValue("attendance", value as ReviewFormValues["attendance"])}
                options={[
                  ["flexible", "널널"],
                  ["medium", "보통"],
                  ["strict", "빡셈"],
                ]}
              />
              <ReviewSelect
                label="시험 스타일"
                value={form.watch("examStyle")}
                onChange={(value) => form.setValue("examStyle", value as ReviewFormValues["examStyle"])}
                options={[
                  ["multipleChoice", "객관식"],
                  ["essay", "서술형"],
                  ["project", "과제 대체"],
                  ["mixed", "혼합"],
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ReviewSelect
                label="팀플 여부"
                value={form.watch("teamProject")}
                onChange={(value) => form.setValue("teamProject", value as "있음" | "없음")}
                options={[
                  ["있음", "있음"],
                  ["없음", "없음"],
                ]}
              />
              <ReviewSelect
                label="발표 여부"
                value={form.watch("presentation")}
                onChange={(value) => form.setValue("presentation", value as "있음" | "없음")}
                options={[
                  ["있음", "있음"],
                  ["없음", "없음"],
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ReviewSelect
                label="학점 후함 정도"
                value={form.watch("gradingStyle")}
                onChange={(value) => form.setValue("gradingStyle", value as ReviewFormValues["gradingStyle"])}
                options={[
                  ["tough", "짜다"],
                  ["medium", "보통"],
                  ["generous", "후하다"],
                ]}
              />
              <div className="space-y-2">
                <Label htmlFor="honeyScore">꿀강 점수</Label>
                <Input id="honeyScore" type="number" min={1} max={5} {...form.register("honeyScore")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortComment">한줄평</Label>
              <Input id="shortComment" {...form.register("shortComment")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longComment">자세한 후기</Label>
              <Textarea id="longComment" {...form.register("longComment")} />
            </div>
            <div className="space-y-2">
              <Label>공개 범위</Label>
                <VisibilityLevelSelect
                  value={form.watch("visibilityLevel")}
                  levels={STANDARD_VISIBILITY_LEVELS}
                  onChange={(value) =>
                    form.setValue("visibilityLevel", value as "school" | "schoolDepartment", {
                      shouldValidate: true,
                    })
                  }
                />
            </div>
            {form.formState.errors.root?.message ? (
              <p className="text-sm text-rose-600">{form.formState.errors.root.message}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              리뷰 등록
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function HeroMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-[11px] text-white/70">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-none bg-secondary/70 shadow-none">
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function DistributionRow({
  label,
  items,
}: {
  label: string;
  items: {
    label: string;
    value: number;
    total: number;
    color: string;
  }[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{label}</p>
      <div className="space-y-2">
        {items.map((item) => {
          const width = item.total === 0 ? 0 : (item.value / item.total) * 100;

          return (
            <div key={`${label}-${item.label}`} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.label}</span>
                <span>{item.value}명</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div
                  className={`h-2 rounded-full ${item.color}`}
                  style={{ width: `${Math.max(width, item.value > 0 ? 12 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  latestSemester,
  highlightHelpful = false,
  repeatedlyReported,
  onReport,
  onBlock,
}: {
  review: LectureReview;
  latestSemester: string;
  highlightHelpful?: boolean;
  repeatedlyReported: boolean;
  onReport: (input: { reason?: ReportReason; memo?: string }) => Promise<void> | void;
  onBlock: () => Promise<void> | void;
}) {
  const userLevel = getUserLevel(getTrustScore(review.reviewerId));
  const isTrustedReviewer = userLevel.level >= 5;
  const isLatestSemester = review.semester === latestSemester;

  return (
    <Card key={review.id} className="overflow-hidden border-white/80 bg-white/94">
      <CardHeader className="space-y-4">
        <PostAuthorRow
          authorId={review.reviewerId}
          createdAt={review.createdAt}
          visibilityLevel={review.visibilityLevel}
        />
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{review.semester}</Badge>
            {isLatestSemester ? <Badge variant="success">최신 학기</Badge> : null}
            {isTrustedReviewer ? <Badge variant="secondary">신뢰 리뷰어</Badge> : null}
          </div>
          <div className="flex items-start justify-between gap-3 rounded-[22px] bg-secondary/60 px-4 py-4">
            <div className="min-w-0">
              <p className="font-semibold">{review.shortComment}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {review.longComment}
              </p>
            </div>
            <div className="shrink-0 rounded-[18px] bg-white px-3 py-3 text-center shadow-sm">
              <p className="text-[11px] text-muted-foreground">꿀점수</p>
              <p className="text-lg font-semibold">{review.honeyScore}/5</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-secondary px-3 py-1">
              난이도 {DIFFICULTY_LABELS[review.difficulty]}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1">
              과제 {WORKLOAD_LABELS[review.workload]}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1">
              출결 {ATTENDANCE_LABELS[review.attendance]}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1">
              시험 {EXAM_STYLE_LABELS[review.examStyle]}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1">
              팀플 {review.teamProject ? "있음" : "없음"}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1">
              발표 {review.presentation ? "있음" : "없음"}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1">
              학점 {GRADING_STYLE_LABELS[review.gradingStyle]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={highlightHelpful ? "success" : "secondary"}>
              <ThumbsUp className="mr-1 h-3 w-3" />
              도움 {review.helpfulCount}
            </Badge>
            {isTrustedReviewer ? (
              <TrustScoreBadge score={getTrustScore(review.reviewerId)} interactive={false} />
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
        <span>꿀강 점수 {review.honeyScore}/5</span>
        <ReportBlockActions
          compact
          targetType="review"
          targetId={review.id}
          targetUserId={review.reviewerId}
          repeatedlyReported={repeatedlyReported}
          onReport={async ({ reason, memo }) => onReport({ reason, memo })}
          onBlock={async () => onBlock()}
        />
      </CardContent>
    </Card>
  );
}

function ReviewSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`${label} 선택`} />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, labelText]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {labelText}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
