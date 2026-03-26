"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowRightLeft,
  BellRing,
  CheckCircle2,
  Clock3,
  MessageCircle,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { AccountRequiredCard } from "@/components/shared/account-required-card";
import { ActionFeedbackBanner } from "@/components/shared/action-feedback-banner";
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
import { createTradeMessage, createTradePost } from "@/app/actions/content-actions";
import { TradePostCard } from "@/features/common/trade-post-card";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { STANDARD_VISIBILITY_LEVELS, TRADE_STATUS_LABELS } from "@/lib/constants";
import { validateTradeSubmission } from "@/lib/moderation";
import {
  addBlockToSnapshot,
  addReportToSnapshot,
  addTradePostToSnapshot,
} from "@/lib/runtime-mutations";
import {
  getBlockedContentCount,
  getAnonymousHandle,
  getHiddenTradePostCount,
  getLectureById,
  getLectures,
  getSchoolScopedLectureSummaries,
  getSchoolScopedTradePosts,
  getTradeMatchCandidates,
  getTradeMatchInsight,
  isRepeatedlyReportedUser,
} from "@/lib/mock-queries";
import { canAccessTrade } from "@/lib/permissions";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import { createClient } from "@/lib/supabase/client";
import {
  createBlockRecord,
  createReportRecord,
  getAuthFlowHref,
  hasCompletedOnboarding,
} from "@/lib/supabase/app-data";
import { getStandardVisibilityLevel } from "@/lib/user-identity";
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
  visibilityLevel: z.enum(["school", "schoolDepartment"]),
}).refine((value) => value.haveLectureId !== value.wantLectureId, {
  message: "보유 강의와 원하는 강의는 다르게 선택해주세요.",
  path: ["wantLectureId"],
});

type TradeFormValues = z.infer<typeof tradeSchema>;
type TradeMessage = {
  id: string;
  tradePostId: string;
  senderId: string;
  content: string;
  createdAt: string;
};

export function TradePage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    loading,
    tradePosts,
    reports,
    blocks,
    currentUser: runtimeUser,
    source,
    isAuthenticated,
    schools,
    refresh,
    setSnapshot,
  } = useAppRuntime(initialSnapshot, "trade");
  const currentUser = runtimeUser;
  const schoolId = currentUser.schoolId;
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [tradeItems, setTradeItems] = useState(
    getSchoolScopedTradePosts(schoolId),
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tradeMessages, setTradeMessages] = useState<TradeMessage[]>([]);
  const [tradeMessageInput, setTradeMessageInput] = useState("");
  const [tradeMessageError, setTradeMessageError] = useState<string | null>(null);
  const [tradeMessageLoading, setTradeMessageLoading] = useState(false);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isSendingMessage, startSendMessageTransition] = useTransition();
  const canCompose =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canAccessTrade(currentUser);
  const currentSchool = schools.find((school) => school.id === schoolId) ?? null;
  const schoolLectureIds = new Set(getSchoolScopedLectureSummaries(schoolId).map((lecture) => lecture.id));
  const schoolLectures = getLectures().filter((lecture) => schoolLectureIds.has(lecture.id));
  const lectureOptions = schoolLectures
    .map((lecture) => [lecture.id, lecture.courseName] as const);
  const defaultHaveLectureId = schoolLectures[0]?.id ?? getLectures()[0]?.id ?? "lecture-1";
  const defaultWantLectureId = schoolLectures[1]?.id ?? schoolLectures[0]?.id ?? getLectures()[1]?.id ?? "lecture-3";
  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      schoolId: currentUser.schoolId ?? "school-default",
      semester: "2026-1",
      haveLectureId: defaultHaveLectureId,
      wantLectureId: defaultWantLectureId,
      professor: "",
      section: "",
      timeRange: "",
      note: "공강 맞는 분이면 바로 확인할게요.",
      status: "open",
      visibilityLevel: getStandardVisibilityLevel(
        currentUser.defaultVisibilityLevel,
        currentUser,
      ),
    },
  });

  if (loading && source === "mock") {
    return (
      <AppShell title="수강신청 교환">
        <LoadingState />
      </AppShell>
    );
  }

  useEffect(() => {
    setTradeItems(getSchoolScopedTradePosts(schoolId));
  }, [blocks, reports, schoolId, tradePosts]);

  useEffect(() => {
    const queryPostId = searchParams.get("post");
    if (!queryPostId) {
      setDetailId(null);
      return;
    }

    setDetailId((current) => (current === queryPostId ? current : queryPostId));
  }, [searchParams]);

  useEffect(() => {
    if (!detailId) {
      setTradeMessages([]);
      setTradeMessageInput("");
      setTradeMessageError(null);
      setTradeMessageLoading(false);
      return;
    }

    if (source !== "supabase" || !isAuthenticated) {
      setTradeMessages([]);
      return;
    }

    const supabase = createClient();
    setTradeMessageLoading(true);
    setTradeMessageError(null);

    void supabase
      .from("trade_messages")
      .select("id, trade_post_id, sender_id, content, created_at")
      .eq("trade_post_id", detailId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setTradeMessageError("채팅을 불러오지 못했습니다.");
          setTradeMessageLoading(false);
          return;
        }

        setTradeMessages(
          (data ?? []).map((item) => ({
            id: String(item.id),
            tradePostId: String(item.trade_post_id),
            senderId: String(item.sender_id),
            content: String(item.content),
            createdAt: String(item.created_at),
          })),
        );
        setTradeMessageLoading(false);
      });
  }, [detailId, isAuthenticated, source]);

  const detailItem = tradeItems.find((item) => item.id === detailId) ?? null;
  const chatHighlighted = searchParams.get("chat") === "1";
  const selectedHaveLecture = getLectureById(form.watch("haveLectureId"));
  const selectedWantLecture = getLectureById(form.watch("wantLectureId"));
  const watchedNote = form.watch("note");
  const tradeSubmitBlockedReason =
    !selectedHaveLecture || !selectedWantLecture
      ? "교환할 강의를 모두 선택해주세요."
      : selectedHaveLecture.id === selectedWantLecture.id
        ? "보유 강의와 원하는 강의는 다르게 선택해주세요."
        : watchedNote.trim().length < 2
          ? "메모 한 줄을 2자 이상 입력해주세요."
          : null;
  const detailMatches = useMemo(
    () => (detailItem ? getTradeMatchCandidates(detailItem.id) : []),
    [detailItem],
  );
  const detailParticipants = useMemo(
    () =>
      detailItem
        ? new Set([detailItem.userId, ...tradeMessages.map((message) => message.senderId)]).size
        : 0,
    [detailItem, tradeMessages],
  );
  const quickReplies = [
    "시간표 먼저 맞춰볼까요?",
    "지금 바로 교환 가능해요.",
    "세부 조건 한 번 더 확인하고 싶어요.",
    "완료되면 상태도 같이 바꿔둘게요.",
  ];

  const items = useMemo(
    () =>
      tradeItems.map((item) => ({
        ...item,
        match: getTradeMatchInsight(item.id),
      })),
    [tradeItems],
  );
  const hiddenTradeCount = getHiddenTradePostCount();
  const blockedContentCount = getBlockedContentCount();

  const handleSendTradeMessage = () => {
    if (!detailItem) return;

    const content = tradeMessageInput.trim();
    if (!content) {
      setTradeMessageError("메시지를 입력해주세요.");
      return;
    }

    setTradeMessageError(null);

    if (source === "supabase" && isAuthenticated) {
      startSendMessageTransition(() => {
        void (async () => {
          try {
            const shouldPromoteToMatching = detailItem.status === "open";
            const result = await createTradeMessage({
              tradePostId: detailItem.id,
              content,
            });
            if (!result.ok) {
              setTradeMessageError(result.error);
              return;
            }
            const created = result.data;

            setTradeMessages((current) => [
              ...current,
              {
                id: String(created.id),
                tradePostId: String(created.trade_post_id),
                senderId: String(created.sender_id),
                content: String(created.content),
                createdAt: String(created.created_at),
              },
            ]);
            if (shouldPromoteToMatching) {
              setTradeItems((current) =>
                current.map((item) =>
                  item.id === detailItem.id ? { ...item, status: "matching" } : item,
                ),
              );
              setSnapshot((current) => ({
                ...current,
                tradePosts: current.tradePosts.map((item) =>
                  item.id === detailItem.id ? { ...item, status: "matching" } : item,
                ),
              }));
            }
            setTradeMessageInput("");
            await refresh();
          } catch (error) {
            setTradeMessageError(
              error instanceof Error ? error.message : "채팅 전송에 실패했습니다.",
            );
          }
        })();
      });
      return;
    }

    setTradeMessages((current) => [
      ...current,
      {
        id: `trade-message-local-${current.length + 1}`,
        tradePostId: detailItem.id,
        senderId: currentUser.id,
        content,
        createdAt: new Date().toISOString(),
      },
    ]);
    if (detailItem.status === "open") {
      setTradeItems((current) =>
        current.map((item) =>
          item.id === detailItem.id ? { ...item, status: "matching" } : item,
        ),
      );
      setSnapshot((current) => ({
        ...current,
        tradePosts: current.tradePosts.map((item) =>
          item.id === detailItem.id ? { ...item, status: "matching" } : item,
        ),
      }));
    }
    setTradeMessageInput("");
  };

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

    if (values.haveLectureId === values.wantLectureId) {
      form.setError("wantLectureId", {
        message: "보유 강의와 원하는 강의는 다르게 선택해주세요.",
      });
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
            const result = await createTradePost({
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
            if (!result.ok) {
              form.setError("root", { message: result.error });
              return;
            }
            setOpen(false);
            form.reset();
            setSuccessMessage("매칭 글이 등록되었습니다.");
            await refresh();
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
    setSuccessMessage("매칭 글이 등록되었습니다.");
  });

  if (!canAccessTrade(currentUser)) {
    if (!isAuthenticated || !hasCompletedOnboarding(currentUser)) {
      return (
        <AppShell title="수강신청 매칭" subtitle="학교 시간표 조정이 필요한 순간에 바로 쓰는 보드" showTabs>
          <AccountRequiredCard
            isAuthenticated={isAuthenticated}
            user={currentUser}
            nextPath={pathname}
            title={isAuthenticated ? "프로필 설정을 마치면 바로 이용할 수 있습니다" : "로그인 후 수강신청 매칭을 볼 수 있습니다"}
            description={
              isAuthenticated
                ? "학교와 기본 정보를 설정하면 우리학교 매칭 글을 바로 확인할 수 있습니다."
                : "로그인 후 우리학교 매칭 글을 보고, 필요한 순간에 바로 글을 올릴 수 있습니다."
            }
            ctaLabel={isAuthenticated ? "프로필 설정 이어가기" : "로그인하고 보기"}
          />
        </AppShell>
      );
    }

    if (currentUser.userType === "applicant") {
      return (
        <AppShell title="수강신청 매칭" subtitle="대학 생활 기능" showTabs>
          <EmptyState
            title="입시생 계정은 입시 탭부터 둘러보세요"
            description="수강신청 매칭은 대학생용 기능입니다. 지금은 입시 질문과 재학생 답변을 먼저 확인하면 충분합니다."
            actionLabel="지망학교 보기"
            href="/school?tab=admission"
          />
        </AppShell>
      );
    }

    if (currentUser.userType === "freshman") {
      return (
        <AppShell title="수강신청 매칭" subtitle="대학생 전용 기능" showTabs>
          <EmptyState
            title="예비입학생은 새내기존과 우리학교부터 이용할 수 있습니다"
            description="수강신청 매칭은 재학생 시간표가 열린 뒤 사용하게 됩니다. 지금은 우리학교 탭에서 새내기존과 생활 글을 먼저 둘러보세요."
            actionLabel="우리학교로 이동"
            href="/school?tab=freshman"
          />
        </AppShell>
      );
    }

    return (
      <AppShell title="수강신청 매칭" subtitle="대학생 전용 기능" showTabs>
        <EmptyState
          title="학교 메일 인증을 마치면 바로 열립니다"
          description="학교 메일 인증을 완료하면 우리학교 수강신청 매칭 글 작성과 댓글 참여가 바로 가능합니다."
          actionLabel="인증하러 가기"
          href="/onboarding?next=%2Ftrade&mode=verification"
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="수강신청 매칭"
      subtitle="수강신청 정보 연결 중심 교환 게시판"
    >
      {loading ? <LoadingState /> : null}
      {successMessage ? (
        <ActionFeedbackBanner
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      ) : null}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-none bg-secondary/60 shadow-none">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <ArrowRightLeft className="h-4 w-4" />
              <p className="text-xs font-semibold">교환 가능</p>
            </div>
            <p className="mt-1 text-lg font-semibold">
              {items.filter((item) => item.status === "open").length}개
            </p>
          </CardContent>
        </Card>
        <Card className="border-none bg-secondary/60 shadow-none">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-amber-700">
              <Clock3 className="h-4 w-4" />
              <p className="text-xs font-semibold">매칭 중</p>
            </div>
            <p className="mt-1 text-lg font-semibold">
              {items.filter((item) => item.status === "matching").length}건
            </p>
          </CardContent>
        </Card>
        <Card className="border-none bg-secondary/60 shadow-none">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-xs font-semibold">완료</p>
            </div>
            <p className="mt-1 text-lg font-semibold">
              {items.filter((item) => item.status === "closed").length}건
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/80 bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(255,255,255,0.94))] shadow-none">
        <CardContent className="flex items-start gap-3 py-5">
          <div className="rounded-[18px] bg-primary/10 p-3 text-primary">
            <BellRing className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold">원하는 강의가 올라오면 알림으로 바로 연결됩니다</p>
            <p className="text-sm text-muted-foreground">
              내가 찾는 강의를 가진 새 글이 올라오면 알림 탭에서 바로 확인할 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>

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
              onDetail={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("post", item.id);
                router.push(`${pathname}?${params.toString()}`);
              }}
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
                  [currentUser.schoolId ?? "school-default", currentSchool?.name ?? "내 학교"],
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
            {form.formState.errors.wantLectureId?.message ? (
              <p className="text-sm text-rose-600">{form.formState.errors.wantLectureId.message}</p>
            ) : null}
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
                  levels={STANDARD_VISIBILITY_LEVELS}
                  onChange={(value) =>
                    form.setValue("visibilityLevel", value as "school" | "schoolDepartment", {
                      shouldValidate: true,
                    })
                  }
                />
            </div>
            <div className="space-y-2">
              <Label>상태</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) =>
                  form.setValue("status", value as TradeFormValues["status"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">교환 가능</SelectItem>
                  <SelectItem value="matching">매칭 중</SelectItem>
                  <SelectItem value="closed">완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.formState.errors.root?.message ? (
              <p className="text-sm text-rose-600">{form.formState.errors.root.message}</p>
            ) : null}
            {!form.formState.errors.root?.message && tradeSubmitBlockedReason ? (
              <p className="text-sm text-amber-600">{tradeSubmitBlockedReason}</p>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || Boolean(tradeSubmitBlockedReason)}
            >
              <ArrowRightLeft className="h-4 w-4" />
              등록하기
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(detailItem)}
        onOpenChange={(next) => {
          if (!next) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("post");
            const query = params.toString();
            router.replace(query ? `${pathname}?${query}` : pathname);
            setDetailId(null);
          }
        }}
      >
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
              <Card className={`shadow-none ${chatHighlighted ? "ring-2 ring-primary/25" : ""}`}>
                <CardContent className="space-y-4 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold">교환 채팅</p>
                      <p className="text-sm text-muted-foreground">
                        이 교환 글을 기준으로 실제 교환 대화를 이어갑니다.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{TRADE_STATUS_LABELS[detailItem.status]}</Badge>
                      <span className="text-xs text-muted-foreground">참여 {detailParticipants}명</span>
                    </div>
                  </div>
                  <div className="max-h-64 space-y-3 overflow-y-auto rounded-[20px] bg-secondary/40 p-3">
                    {tradeMessageLoading ? (
                      <p className="text-sm text-muted-foreground">대화를 불러오는 중입니다.</p>
                    ) : tradeMessages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        아직 시작된 대화가 없습니다. 먼저 한 줄 남겨보세요.
                      </p>
                    ) : (
                      tradeMessages.map((message) => {
                        const mine = message.senderId === currentUser.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${mine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-[18px] px-3 py-2 ${
                                mine
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background text-foreground"
                              }`}
                            >
                              <p className="text-[11px] opacity-70">
                                {mine ? "나" : getAnonymousHandle(message.senderId)}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                                {message.content}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {quickReplies.map((reply) => (
                        <button
                          key={reply}
                          type="button"
                          onClick={() => setTradeMessageInput(reply)}
                          className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-50"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      rows={3}
                      value={tradeMessageInput}
                      onChange={(event) => setTradeMessageInput(event.target.value)}
                      placeholder="예: 원하는 시간대 확인 가능할까요?"
                    />
                    {tradeMessageError ? (
                      <p className="text-sm text-rose-600">{tradeMessageError}</p>
                    ) : null}
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleSendTradeMessage}
                      disabled={isSendingMessage}
                    >
                      <MessageCircle className="h-4 w-4" />
                      대화 보내기
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
                          <Badge variant="outline">
                            {candidate.status === "matching"
                              ? "매칭 중"
                              : candidate.status === "closed"
                                ? "완료"
                                : "교환 가능"}
                          </Badge>
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
