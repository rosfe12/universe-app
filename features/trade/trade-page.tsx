"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, ArrowRightLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { FloatingComposeButton } from "@/components/shared/floating-compose-button";
import { LoadingState } from "@/components/shared/loading-state";
import { ModerationFeedNotice } from "@/components/shared/moderation-feed-notice";
import { ReportBlockActions } from "@/components/shared/report-block-actions";
import { VisibilityLevelSelect } from "@/components/shared/visibility-level-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { createTradePost } from "@/app/actions/content-actions";
import { TradePostCard } from "@/features/common/trade-post-card";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { TRADE_STATUS_LABELS } from "@/lib/constants";
import { validateTradeSubmission } from "@/lib/moderation";
import {
  addBlockToSnapshot,
  addReportToSnapshot,
  addTradePostToSnapshot,
} from "@/lib/runtime-mutations";
import {
  getBlockedContentCount,
  getCurrentSchool,
  getHiddenTradePostCount,
  getLectureById,
  getLectures,
  getTradeMatchCandidates,
  getTradeMatchInsight,
  getTradePosts,
  isRepeatedlyReportedUser,
} from "@/lib/mock-queries";
import { canAccessTrade } from "@/lib/permissions";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import {
  createBlockRecord,
  createReportRecord,
  getAuthFlowHref,
  hasCompletedOnboarding,
} from "@/lib/supabase/app-data";
import { getDefaultVisibilityLevel } from "@/lib/user-identity";
import type { AppRuntimeSnapshot } from "@/types";

const tradeSchema = z.object({
  schoolId: z.string().min(1),
  semester: z.string().min(1),
  haveLectureId: z.string().min(1),
  wantLectureId: z.string().min(1),
  professor: z.string().optional(),
  section: z.string().optional(),
  timeRange: z.string().optional(),
  note: z.string().min(2),
  status: z.enum(["open", "matching", "closed"]),
  visibilityLevel: z.enum(["anonymous", "school", "schoolDepartment", "profile"]),
});

type TradeFormValues = z.infer<typeof tradeSchema>;

export function TradePage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    loading,
    tradePosts,
    reports,
    blocks,
    currentUser: runtimeUser,
    source,
    isAuthenticated,
    refresh,
    setSnapshot,
  } = useAppRuntime(initialSnapshot);
  const currentUser = runtimeUser;
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [tradeItems, setTradeItems] = useState(getTradePosts());
  const [isSubmitting, startSubmitTransition] = useTransition();
  const canCompose =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canAccessTrade(currentUser);
  const currentSchool = getCurrentSchool();
  const lectureOptions = getLectures().map(
    (lecture) => [lecture.id, lecture.courseName] as const,
  );
  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      schoolId: currentUser.schoolId ?? "school-konkuk",
      semester: "2026-1",
      haveLectureId: "lecture-1",
      wantLectureId: "lecture-3",
      professor: "",
      section: "",
      timeRange: "",
      note: "공강 맞는 분이면 바로 확인할게요.",
      status: "open",
      visibilityLevel: currentUser.defaultVisibilityLevel ?? getDefaultVisibilityLevel(currentUser),
    },
  });

  useEffect(() => {
    setTradeItems(getTradePosts());
  }, [blocks, reports, tradePosts]);

  const detailItem = tradeItems.find((item) => item.id === detailId) ?? null;
  const selectedHaveLecture = getLectureById(form.watch("haveLectureId"));
  const selectedWantLecture = getLectureById(form.watch("wantLectureId"));
  const detailMatches = useMemo(
    () => (detailItem ? getTradeMatchCandidates(detailItem.id) : []),
    [detailItem, tradePosts, reports, blocks],
  );

  const items = useMemo(
    () =>
      tradeItems.map((item) => ({
        ...item,
        match: getTradeMatchInsight(item.id),
      })),
    [tradeItems],
  );
  const hiddenTradeCount = useMemo(
    () => getHiddenTradePostCount(),
    [blocks, reports, tradePosts],
  );
  const blockedContentCount = useMemo(() => getBlockedContentCount(), [blocks, reports, tradePosts]);

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const createdAt = new Date().toISOString();
    const validationError = validateTradeSubmission(getRuntimeSnapshot(), {
      userId: currentUser.id,
      note: values.note,
      createdAt,
    });
    if (validationError) {
      form.setError("root", { message: validationError });
      return;
    }

    const selectedHave = getLectureById(values.haveLectureId);
    const selectedWant = getLectureById(values.wantLectureId);
    const resolvedTimeRange =
      values.timeRange?.trim() ||
      selectedHave?.dayTime ||
      selectedWant?.dayTime ||
      "시간 협의";
    const resolvedProfessor =
      values.professor?.trim() || selectedWant?.professor || selectedHave?.professor;
    const resolvedSection =
      values.section?.trim() || selectedWant?.section || selectedHave?.section;

    const localTrade = {
      id: `trade-local-${tradeItems.length + 1}`,
      ...values,
      professor: resolvedProfessor,
      section: resolvedSection,
      timeRange: resolvedTimeRange,
      userId: currentUser.id,
      createdAt,
    };

    if (source === "supabase" && isAuthenticated) {
      startSubmitTransition(() => {
        void (async () => {
          try {
            await createTradePost({
              schoolId: values.schoolId,
              semester: values.semester,
              haveLectureId: values.haveLectureId,
              wantLectureId: values.wantLectureId,
              professor: resolvedProfessor,
              section: resolvedSection,
              timeRange: resolvedTimeRange,
              note: values.note,
              status: values.status,
              visibilityLevel: values.visibilityLevel,
            });
            await refresh();
            setOpen(false);
            form.reset();
          } catch (error) {
            form.setError("root", {
              message: error instanceof Error ? error.message : "매칭 글 등록에 실패했습니다.",
            });
          }
        })();
      });
      return;
    } else {
      setTradeItems((current) => [localTrade, ...current]);
      setSnapshot((current) => addTradePostToSnapshot(current, localTrade));
    }

    setOpen(false);
    form.reset();
  });

  if (!canAccessTrade(currentUser)) {
    return (
      <AppShell title="수강신청 매칭" subtitle="대학생 전용 기능" showTabs>
        <EmptyState
          title="학교 메일 인증 후 이용 가능"
          description="수강신청 교환은 학교 메일 인증을 끝낸 대학생만 사용할 수 있습니다."
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="수강신청 매칭"
      subtitle={`${currentSchool?.name ?? "건국대학교"} 수강신청 정보 연결 중심 교환 게시판`}
    >
      {loading ? <LoadingState /> : null}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-none bg-secondary/60 shadow-none">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">모집중</p>
            <p className="mt-1 text-lg font-semibold">
              {items.filter((item) => item.status === "open").length}개
            </p>
          </CardContent>
        </Card>
        <Card className="border-none bg-secondary/60 shadow-none">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">매칭중</p>
            <p className="mt-1 text-lg font-semibold">
              {items.filter((item) => item.status === "matching").length}건
            </p>
          </CardContent>
        </Card>
        <Card className="border-none bg-secondary/60 shadow-none">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">후보 있음</p>
            <p className="mt-1 text-lg font-semibold">
              {items.filter((item) => item.match.count > 0).length}건
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50/90">
        <CardContent className="space-y-3 py-5">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            <p className="font-semibold">이용 안내</p>
          </div>
          <ul className="space-y-2 text-sm text-amber-800">
            <li>금전 거래 금지</li>
            <li>계정 공유 금지</li>
            <li>대리 수강신청 금지</li>
          </ul>
        </CardContent>
      </Card>

      <ModerationFeedNotice
        hiddenCount={hiddenTradeCount}
        blockedCount={blockedContentCount}
        hiddenLabel="매칭 글"
      />

      <section className="space-y-3">
        {items.length === 0 ? (
          <EmptyState
            title="아직 올라온 매칭 글이 없습니다"
            description="첫 번째 매칭 글을 등록해보세요."
          />
        ) : (
          items.map((item) => (
            <TradePostCard
              key={item.id}
              tradePost={item}
              onDetail={() => setDetailId(item.id)}
              repeatedlyReported={isRepeatedlyReportedUser(item.userId)}
              onReport={async ({ reason, memo }) => {
                if (source === "supabase" && isAuthenticated) {
                  await createReportRecord({
                    reporterId: currentUser.id,
                    targetType: "user",
                    targetId: item.userId,
                    reason,
                    memo,
                  });
                  await refresh();
                  return;
                }

                setSnapshot((current) =>
                  addReportToSnapshot(current, {
                    targetType: "user",
                    targetId: item.userId,
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
                    blockedUserId: item.userId,
                  });
                  await refresh();
                  return;
                }

                setSnapshot((current) =>
                  addBlockToSnapshot(current, {
                    blockerId: currentUser.id,
                    blockedUserId: item.userId,
                  }),
                );
              }}
            />
          ))
        )}
      </section>

      <FloatingComposeButton
        onClick={() => {
          if (!canCompose) {
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
        label="매칭 글 작성"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>매칭 글 작성</DialogTitle>
            <DialogDescription>
              직접 거래가 아닌 수강신청 정보 연결용 글입니다.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <TradeSelect
                label="학교"
                value={form.watch("schoolId")}
                onChange={(value) => form.setValue("schoolId", value)}
                options={[
                  [currentUser.schoolId ?? "school-konkuk", currentSchool?.name ?? "건국대학교"],
                ]}
              />
              <div className="space-y-2">
                <Label>학기</Label>
                <Input {...form.register("semester")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TradeSelect
                label="보유 강의"
                value={form.watch("haveLectureId")}
                onChange={(value) => form.setValue("haveLectureId", value)}
                options={lectureOptions}
              />
              <TradeSelect
                label="원하는 강의"
                value={form.watch("wantLectureId")}
                onChange={(value) => form.setValue("wantLectureId", value)}
                options={lectureOptions}
              />
            </div>
            <Card className="border-dashed bg-secondary/60 shadow-none">
              <CardContent className="space-y-3 py-4 text-sm">
                <p className="font-semibold">선택한 강의 기준으로 자동 반영</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] bg-white px-3 py-3">
                    <p className="text-[11px] text-muted-foreground">보유 강의</p>
                    <p className="mt-1 font-medium">
                      {selectedHaveLecture?.courseName ?? "선택 필요"}
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-white px-3 py-3">
                    <p className="text-[11px] text-muted-foreground">원하는 강의</p>
                    <p className="mt-1 font-medium">
                      {selectedWantLecture?.courseName ?? "선택 필요"}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  시간대는 {selectedHaveLecture?.dayTime ?? selectedWantLecture?.dayTime ?? "선택한 강의 정보"} 기준으로 자동 입력됩니다.
                </p>
              </CardContent>
            </Card>
            <div className="space-y-2">
              <Label>메모 한 줄</Label>
              <Textarea {...form.register("note")} />
            </div>
            <div className="space-y-2">
              <Label>공개 범위</Label>
              <VisibilityLevelSelect
                value={form.watch("visibilityLevel")}
                onChange={(value) =>
                  form.setValue("visibilityLevel", value, { shouldValidate: true })
                }
              />
            </div>
            {form.formState.errors.root?.message ? (
              <p className="text-sm text-rose-600">{form.formState.errors.root.message}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <ArrowRightLeft className="h-4 w-4" />
              등록하기
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailItem)} onOpenChange={(next) => !next && setDetailId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>매칭 글 상세</DialogTitle>
            <DialogDescription>간단한 매칭 가능성까지 함께 표시합니다.</DialogDescription>
          </DialogHeader>
          {detailItem ? (
            <div className="space-y-4">
              <Card className="shadow-none">
                <CardContent className="space-y-3 py-5">
                  <p className="text-sm text-muted-foreground">보유 강의</p>
                  <p className="font-semibold">
                    {getLectureById(detailItem.haveLectureId)?.courseName}
                  </p>
                  <p className="text-sm text-muted-foreground">원하는 강의</p>
                  <p className="font-semibold">
                    {getLectureById(detailItem.wantLectureId)?.courseName}
                  </p>
                  <p className="text-sm text-muted-foreground">{detailItem.note}</p>
                </CardContent>
              </Card>
              <div className="flex items-center justify-between">
                <Badge variant="success">{getTradeMatchInsight(detailItem.id).label}</Badge>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{TRADE_STATUS_LABELS[detailItem.status]}</Badge>
                  <ReportBlockActions
                    compact
                    targetType="user"
                    targetId={detailItem.userId}
                    targetUserId={detailItem.userId}
                    repeatedlyReported={isRepeatedlyReportedUser(detailItem.userId)}
                    onReport={async ({ reason, memo }) => {
                      if (source === "supabase" && isAuthenticated) {
                        await createReportRecord({
                          reporterId: currentUser.id,
                          targetType: "user",
                          targetId: detailItem.userId,
                          reason,
                          memo,
                        });
                        await refresh();
                        return;
                      }

                      setSnapshot((current) =>
                        addReportToSnapshot(current, {
                          targetType: "user",
                          targetId: detailItem.userId,
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
                          blockedUserId: detailItem.userId,
                        });
                        await refresh();
                        return;
                      }

                      setSnapshot((current) =>
                        addBlockToSnapshot(current, {
                          blockerId: currentUser.id,
                          blockedUserId: detailItem.userId,
                        }),
                      );
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">바로 맞물리는 후보</p>
                {detailMatches.length === 0 ? (
                  <Card className="shadow-none">
                    <CardContent className="py-4 text-sm text-muted-foreground">
                      아직 딱 맞는 교차 후보는 없습니다.
                    </CardContent>
                  </Card>
                ) : (
                  detailMatches.map((candidate) => (
                    <Card key={candidate.id} className="shadow-none">
                      <CardContent className="space-y-2 py-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">
                            {getLectureById(candidate.haveLectureId)?.courseName}
                          </p>
                          <Badge variant="outline">{candidate.status === "matching" ? "매칭중" : "모집중"}</Badge>
                        </div>
                        <p className="text-muted-foreground">{candidate.note}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function TradeSelect({
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
