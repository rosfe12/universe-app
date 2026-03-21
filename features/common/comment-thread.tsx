"use client";

import { useMemo, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { AccountRequiredCard } from "@/components/shared/account-required-card";
import { ReportBlockActions } from "@/components/shared/report-block-actions";
import { VisibilityLevelSelect } from "@/components/shared/visibility-level-select";
import { PostAuthorRow } from "@/features/common/post-author-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createComment } from "@/app/actions/content-actions";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { validateCommentSubmission } from "@/lib/moderation";
import {
  acceptCommentRecord,
  createBlockRecord,
  createReportRecord,
} from "@/lib/supabase/app-data";
import {
  addBlockToSnapshot,
  addCommentToSnapshot,
  addReportToSnapshot,
  acceptCommentInSnapshot,
} from "@/lib/runtime-mutations";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import { hasCompletedOnboarding } from "@/lib/supabase/app-data";
import { getDefaultVisibilityLevel } from "@/lib/user-identity";
import { getCommentsByPostId, isRepeatedlyReportedUser } from "@/lib/mock-queries";
import { formatRelativeLabel } from "@/lib/utils";
import type { VisibilityLevel } from "@/types";

const commentSchema = z.object({
  content: z.string().min(2, "댓글을 입력해주세요."),
  visibilityLevel: z.enum(["anonymous", "school", "schoolDepartment", "profile"]),
});

type CommentFormValues = z.infer<typeof commentSchema>;

export function CommentThread({
  postId,
  allowAccept = false,
  canCommentOverride,
  accountRequiredTitle,
  accountRequiredDescription,
}: {
  postId: string;
  allowAccept?: boolean;
  canCommentOverride?: boolean;
  accountRequiredTitle?: string;
  accountRequiredDescription?: string;
}) {
  const {
    comments,
    reports,
    blocks,
    currentUser: runtimeUser,
    loading,
    isAuthenticated,
    source,
    refresh,
    setSnapshot,
  } = useAppRuntime();
  const currentUser = runtimeUser;
  const pathname = usePathname();
  const threadComments = useMemo(
    () => getCommentsByPostId(postId),
    [blocks, comments, postId, reports],
  );
  const [isSubmitting, startSubmitTransition] = useTransition();
  const canComment =
    canCommentOverride ?? (isAuthenticated && hasCompletedOnboarding(runtimeUser));

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
      visibilityLevel:
        runtimeUser.defaultVisibilityLevel ?? getDefaultVisibilityLevel(runtimeUser),
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const createdAt = new Date().toISOString();
    const validationError = validateCommentSubmission(getRuntimeSnapshot(), {
      authorId: currentUser.id,
      postId,
      content: values.content,
      createdAt,
    });
    if (validationError) {
      form.setError("root", { message: validationError });
      return;
    }

    const localComment = {
      id: `comment-local-${threadComments.length + 1}`,
      postId,
      authorId: currentUser.id,
      visibilityLevel: values.visibilityLevel as VisibilityLevel,
      content: values.content,
      accepted: false,
      createdAt,
    };

    if (source === "supabase" && isAuthenticated) {
      startSubmitTransition(() => {
        void (async () => {
          try {
            await createComment({
              postId,
              content: values.content,
              visibilityLevel: values.visibilityLevel,
            });
            await refresh();
            form.reset();
          } catch (error) {
            form.setError("root", {
              message: error instanceof Error ? error.message : "댓글 작성에 실패했습니다.",
            });
          }
        })();
      });
      return;
    } else {
      setSnapshot((current) => addCommentToSnapshot(current, localComment));
    }

    form.reset();
  });

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-white/80 bg-white/94">
        <CardContent className="space-y-4 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <h3 className="font-semibold">댓글 {threadComments.length}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {allowAccept ? "답변은 채택 처리할 수 있습니다." : "최신 댓글부터 바로 이어서 볼 수 있습니다."}
              </p>
            </div>
            <Badge variant="secondary">최신순</Badge>
          </div>
          {canComment ? (
            <form className="space-y-3" onSubmit={onSubmit}>
              <div className="rounded-[22px] border border-white/80 bg-secondary/40 p-3">
                <Textarea
                  rows={2}
                  placeholder={allowAccept ? "질문에 바로 답변을 남겨보세요" : "댓글을 입력하세요"}
                  className="min-h-[88px] resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                  {...form.register("content")}
                />
              </div>
              {form.formState.errors.content ? (
                <p className="text-xs text-rose-500">{form.formState.errors.content.message}</p>
              ) : null}
              {form.formState.errors.root?.message ? (
                <p className="text-xs text-rose-500">{form.formState.errors.root.message}</p>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <VisibilityLevelSelect
                    value={form.watch("visibilityLevel")}
                    onChange={(value) =>
                      form.setValue("visibilityLevel", value, { shouldValidate: true })
                    }
                  />
                </div>
                <Button type="submit" size="sm" disabled={isSubmitting || !form.watch("content").trim()}>
                  {isSubmitting ? "등록 중" : allowAccept ? "답변 등록" : "댓글 작성"}
                </Button>
              </div>
            </form>
          ) : (
            <AccountRequiredCard
              isAuthenticated={isAuthenticated}
              user={runtimeUser}
              nextPath={pathname}
              title={
                accountRequiredTitle ??
                (isAuthenticated ? "프로필 설정을 마치면 댓글을 남길 수 있습니다" : "로그인 후 댓글을 남길 수 있습니다")
              }
              description={
                accountRequiredDescription ??
                (isAuthenticated ? "학교와 유저 타입을 먼저 정하면 대부분의 게시판에서 바로 참여할 수 있습니다." : "읽기는 자유롭게, 댓글은 로그인 후 바로 이어서 작성할 수 있습니다.")
              }
              ctaLabel={isAuthenticated ? "프로필 설정 이어가기" : "로그인하고 댓글 쓰기"}
            />
          )}
        </CardContent>
      </Card>

      {loading && threadComments.length === 0 ? <LoadingStateBlock /> : null}

      {!loading && threadComments.length === 0 ? (
        <Card className="border-dashed border-white/80 bg-white/80">
          <CardContent className="space-y-4 py-6 text-center">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">아직 첫 댓글이 없습니다</p>
              <p className="text-sm text-muted-foreground">
                {allowAccept
                  ? "답변을 남겨 질문 흐름을 먼저 열어보세요."
                  : "가볍게 첫 반응을 남기면 대화가 바로 시작됩니다."}
              </p>
            </div>
            {canComment ? (
              <Button type="button" size="sm" variant="outline" onClick={() => form.setFocus("content")}>
                {allowAccept ? "첫 답변 남기기" : "첫 댓글 남기기"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {threadComments.map((comment) => (
        <Card key={comment.id} className="overflow-hidden border-white/80 bg-white/92">
          <CardContent className="space-y-3 py-5">
            <PostAuthorRow
              authorId={comment.authorId}
              createdAt={comment.createdAt}
              visibilityLevel={comment.visibilityLevel}
            />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {comment.accepted ? <Badge variant="success">채택됨</Badge> : null}
              </div>
              <div className="rounded-[20px] bg-secondary/55 px-4 py-3">
                <p className="text-sm leading-6">{comment.content}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {formatRelativeLabel(comment.createdAt)}
                </p>
                {allowAccept ? (
                  <Button
                    size="sm"
                    variant={comment.accepted ? "secondary" : "outline"}
                    type="button"
                    onClick={async () => {
                      if (source === "supabase" && isAuthenticated) {
                        await acceptCommentRecord(postId, comment.id);
                        await refresh();
                        return;
                      }

                      setSnapshot((current) =>
                        acceptCommentInSnapshot(current, postId, comment.id),
                      );
                    }}
                  >
                    {comment.accepted ? "채택됨" : "답변 채택"}
                  </Button>
                ) : null}
              </div>
              <ReportBlockActions
                compact
                targetType="comment"
                targetId={comment.id}
                targetUserId={comment.authorId}
                repeatedlyReported={isRepeatedlyReportedUser(comment.authorId)}
                onReport={async ({ targetId, targetType, reason, memo }) => {
                  if (!targetId || !targetType) return;

                  if (source === "supabase" && isAuthenticated) {
                    await createReportRecord({
                      reporterId: currentUser.id,
                      targetType,
                      targetId,
                      reason,
                      memo,
                    });
                    await refresh();
                    return;
                  }

                  setSnapshot((current) =>
                    addReportToSnapshot(current, {
                      targetType,
                      targetId,
                      reporterId: currentUser.id,
                      reason: reason ?? "other",
                      memo,
                    }),
                  );
                }}
                onBlock={async ({ targetUserId }) => {
                  if (!targetUserId) return;

                  if (source === "supabase" && isAuthenticated) {
                    await createBlockRecord({
                      blockerId: currentUser.id,
                      blockedUserId: targetUserId,
                    });
                    await refresh();
                    return;
                  }

                  setSnapshot((current) =>
                    addBlockToSnapshot(current, {
                      blockerId: currentUser.id,
                      blockedUserId: targetUserId,
                    }),
                  );
                }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LoadingStateBlock() {
  return (
    <Card className="overflow-hidden border-white/80 bg-white/92">
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-10/12 animate-pulse rounded-full bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
