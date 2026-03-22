"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BriefcaseBusiness, Building2, FileText } from "lucide-react";

import { createPost } from "@/app/actions/content-actions";
import { AppShell } from "@/components/layout/app-shell";
import { AccountRequiredCard } from "@/components/shared/account-required-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FeedList } from "@/components/shared/feed-list";
import { FloatingComposeButton } from "@/components/shared/floating-compose-button";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeader } from "@/components/shared/section-header";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CommentThread } from "@/features/common/comment-thread";
import { FeedPostCard } from "@/features/common/feed-post-card";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { CAREER_BOARD_LABELS } from "@/lib/constants";
import { validatePostSubmission } from "@/lib/moderation";
import { canWriteCareer } from "@/lib/permissions";
import { addBlockToSnapshot, addPostToSnapshot, addReportToSnapshot } from "@/lib/runtime-mutations";
import {
  type CareerBoardKind,
  getCareerBoardKind,
  getCareerPosts,
  getLatestCommentPreview,
} from "@/lib/mock-queries";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import {
  createBlockRecord,
  createReportRecord,
  getAuthFlowHref,
  hasCompletedOnboarding,
} from "@/lib/supabase/app-data";
import { getDefaultVisibilityLevel } from "@/lib/user-identity";
import type { AppRuntimeSnapshot, Post, VisibilityLevel } from "@/types";

const boardSchema = z.object({
  board: z.enum(["careerInfo", "jobPosting"]),
  title: z.string().trim().min(4, "제목을 4자 이상 입력해주세요."),
  content: z.string().trim().min(10, "본문을 10자 이상 입력해주세요."),
  visibilityLevel: z.enum(["anonymous", "school", "schoolDepartment", "profile"]),
});

type CareerBoardFilter = "all" | CareerBoardKind;
type CareerFormValues = z.infer<typeof boardSchema>;

const BOARD_META = {
  careerInfo: {
    title: "취업정보",
    description: "자소서, 인턴, 면접, 합격 루틴처럼 직접 부딪힌 정보를 공유합니다.",
    icon: FileText,
  },
  jobPosting: {
    title: "채용공고",
    description: "학교 주변, 인턴, 공채, 추천 공고를 빠르게 모아봅니다.",
    icon: Building2,
  },
} satisfies Record<CareerBoardKind, { title: string; description: string; icon: typeof FileText }>;

export function CareerPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const router = useRouter();
  const {
    loading,
    isAuthenticated,
    source,
    currentUser: runtimeUser,
    refresh,
    setSnapshot,
  } = useAppRuntime(initialSnapshot);
  const currentUser = runtimeUser;
  const [activeBoard, setActiveBoard] = useState<CareerBoardFilter>("all");
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [isSubmitting, startSubmitTransition] = useTransition();

  const careerInfoPosts = getCareerPosts("careerInfo");
  const jobPostingPosts = getCareerPosts("jobPosting");
  const allPosts = [...jobPostingPosts, ...careerInfoPosts];
  const visiblePosts = activeBoard === "all" ? allPosts : activeBoard === "careerInfo" ? careerInfoPosts : jobPostingPosts;
  const detailPost = visiblePosts.find((post) => post.id === detailPostId) ?? allPosts.find((post) => post.id === detailPostId) ?? null;

  const canCompose = isAuthenticated && hasCompletedOnboarding(currentUser) && canWriteCareer(currentUser);
  const canComment = isAuthenticated && hasCompletedOnboarding(currentUser) && currentUser.userType !== "applicant";

  const form = useForm<CareerFormValues>({
    resolver: zodResolver(boardSchema),
    defaultValues: {
      board: activeBoard === "all" ? "careerInfo" : activeBoard,
      title: "",
      content: "",
      visibilityLevel: currentUser.defaultVisibilityLevel ?? getDefaultVisibilityLevel(currentUser),
    },
  });

  const openComposer = () => {
    if (!isAuthenticated || !hasCompletedOnboarding(currentUser)) {
      router.push(getAuthFlowHref({ isAuthenticated, user: currentUser, nextPath: "/career" }));
      return;
    }
    if (!canWriteCareer(currentUser)) {
      router.push("/profile");
      return;
    }
    setComposerOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");

    const createdAt = new Date().toISOString();
    const boardLabel = CAREER_BOARD_LABELS[values.board];
    const validationError = validatePostSubmission(getRuntimeSnapshot(), {
      authorId: currentUser.id,
      category: "community",
      title: values.title,
      content: values.content,
      createdAt,
    });

    if (validationError) {
      form.setError("root", { message: validationError });
      return;
    }

    const localPost: Post = {
      id: `career-local-${allPosts.length + 1}`,
      category: "community",
      authorId: currentUser.id,
      schoolId: currentUser.schoolId,
      visibilityLevel: values.visibilityLevel as VisibilityLevel,
      title: values.title,
      content: values.content,
      createdAt,
      likes: 0,
      commentCount: 0,
      tags: [boardLabel, values.board === "careerInfo" ? "합격루틴" : "인턴"],
    };

    if (source === "supabase" && isAuthenticated) {
      startSubmitTransition(() => {
        void (async () => {
          try {
            await createPost({
              category: "community",
              title: values.title,
              content: values.content,
              schoolId: currentUser.schoolId,
              visibilityLevel: values.visibilityLevel,
              tags: [boardLabel, values.board === "careerInfo" ? "합격루틴" : "인턴"],
            });
            await refresh();
            setComposerOpen(false);
            form.reset({
              board: values.board,
              title: "",
              content: "",
              visibilityLevel: values.visibilityLevel,
            });
          } catch (error) {
            form.setError("root", {
              message: error instanceof Error ? error.message : "취업 글 작성에 실패했습니다.",
            });
          }
        })();
      });
      return;
    }

    setSnapshot((current) => addPostToSnapshot(current, localPost));
    setComposerOpen(false);
    form.reset({
      board: values.board,
      title: "",
      content: "",
      visibilityLevel: values.visibilityLevel,
    });
  });

  return (
    <AppShell title="취업" subtitle="실전 정보와 채용 공고를 한 흐름으로 봅니다">
      {loading ? <LoadingState /> : null}

      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.18),_transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,244,255,0.92))]">
        <CardContent className="space-y-5 py-6">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="secondary">취업 루틴</Badge>
            <BriefcaseBusiness className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-[28px] font-semibold tracking-tight text-slate-950">채용공고부터 합격 후기까지</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">자소서</Badge>
            <Badge variant="outline">인턴</Badge>
            <Badge variant="outline">면접 후기</Badge>
            <Badge variant="outline">현직자 Q&A</Badge>
          </div>
        </CardContent>
      </Card>

      {!loading && isAuthenticated && hasCompletedOnboarding(currentUser) && currentUser.userType === "applicant" ? (
        <AccountRequiredCard
          isAuthenticated={isAuthenticated}
          user={currentUser}
          nextPath="/career"
          title="입시생 계정은 취업 게시판을 읽기만 할 수 있습니다"
          description="대학생 또는 예비입학생 계정에서 직접 글을 올리고 댓글에 참여할 수 있습니다."
          ctaLabel="프로필 상태 확인"
        />
      ) : null}

      <Tabs value={activeBoard} onValueChange={(value) => setActiveBoard(value as CareerBoardFilter)} className="space-y-4">
        <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-[28px] bg-secondary/75 p-1.5">
          <TabsTrigger value="all" className="h-11 text-[13px] font-semibold">전체</TabsTrigger>
          <TabsTrigger value="careerInfo" className="h-11 text-[13px] font-semibold">취업정보</TabsTrigger>
          <TabsTrigger value="jobPosting" className="h-11 text-[13px] font-semibold">채용공고</TabsTrigger>
        </TabsList>
      </Tabs>

      <SectionHeader
        title={activeBoard === "all" ? "취업 게시판" : BOARD_META[activeBoard].title}
        description={
          activeBoard === "all"
            ? "실전 후기와 채용 공고를 최근 흐름대로 모아봅니다."
            : BOARD_META[activeBoard].description
        }
      />

      <div className="space-y-4">
        {!loading && visiblePosts.length === 0 ? (
          <EmptyState
            title="첫 취업 글이 아직 없습니다"
            description="합격 후기, 자소서 루틴, 인턴 공고부터 먼저 올려보세요."
          />
        ) : null}

        {visiblePosts.length > 0 ? (
          <FeedList>
            {visiblePosts.map((post) => (
              <div key={post.id}>
                <FeedPostCard
                  post={post}
                  onOpen={() => setDetailPostId(post.id)}
                  showActions
                  onReport={async ({ reason, memo }) => {
                    if (source === "supabase" && isAuthenticated) {
                      await createReportRecord({
                        reporterId: currentUser.id,
                        targetType: "post",
                        targetId: post.id,
                        reason,
                        memo,
                      });
                      await refresh();
                      return;
                    }

                    setSnapshot((current) =>
                      addReportToSnapshot(current, {
                        targetType: "post",
                        targetId: post.id,
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
                        blockedUserId: post.authorId,
                      });
                      await refresh();
                      return;
                    }

                    setSnapshot((current) =>
                      addBlockToSnapshot(current, {
                        blockerId: currentUser.id,
                        blockedUserId: post.authorId,
                      }),
                    );
                  }}
                />
                <div className="border-b border-gray-100 px-4 py-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700">
                        {getLatestCommentPreview(post.id)?.content ?? "첫 댓글이 아직 없습니다."}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">댓글 {post.commentCount}개</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => setDetailPostId(post.id)}>
                      상세 보기
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </FeedList>
        ) : null}
      </div>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>취업 글 작성</DialogTitle>
            <DialogDescription>실전 정보 공유나 채용공고 업로드 중 하나를 선택해서 올려주세요.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>게시판</Label>
              <Tabs
                value={form.watch("board")}
                onValueChange={(value) =>
                  form.setValue("board", value as CareerBoardKind, { shouldValidate: true })
                }
                className="space-y-0"
              >
                <TabsList className="grid h-auto grid-cols-2 gap-1 rounded-[24px] bg-secondary/80 p-1.5">
                  <TabsTrigger value="careerInfo" className="h-10 text-[13px] font-semibold">취업정보</TabsTrigger>
                  <TabsTrigger value="jobPosting" className="h-10 text-[13px] font-semibold">채용공고</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label htmlFor="career-title">제목</Label>
              <Input id="career-title" placeholder="예: 서류 합격률 높였던 자소서 루틴 공유" {...form.register("title")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="career-content">내용</Label>
              <Textarea id="career-content" rows={5} placeholder="실제 경험 위주로 정리해주세요." {...form.register("content")} />
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
              <p className="text-sm text-rose-500">{form.formState.errors.root.message}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "등록 중" : "게시글 올리기"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailPost)} onOpenChange={(open) => !open && setDetailPostId(null)}>
        <DialogContent className="max-w-2xl">
          {detailPost ? (
            <>
              <DialogHeader>
                <DialogTitle>게시글 상세</DialogTitle>
                <DialogDescription>
                  {getCareerBoardKind(detailPost) === "jobPosting" ? "채용공고 보드" : "취업정보 보드"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <FeedPostCard post={detailPost} />
                <CommentThread
                  postId={detailPost.id}
                  canCommentOverride={canComment}
                  accountRequiredTitle="로그인 후 댓글에 참여할 수 있습니다"
                  accountRequiredDescription="입시생 계정은 취업 게시판을 읽기 전용으로 이용합니다."
                />
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <FloatingComposeButton onClick={openComposer} label="취업 글쓰기" disabled={loading || (isAuthenticated && hasCompletedOnboarding(currentUser) && !canCompose)} />
    </AppShell>
  );
}
