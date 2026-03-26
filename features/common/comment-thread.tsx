"use client";

import { useMemo, useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { AccountRequiredCard } from "@/components/shared/account-required-card";
import { LegendAnswerTag } from "@/components/shared/legend-answer-tag";
import { ReportBlockActions } from "@/components/shared/report-block-actions";
import { VisibilityLevelSelect } from "@/components/shared/visibility-level-select";
import { PostAuthorRow } from "@/features/common/post-author-row";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { acceptAdmissionAnswer, createComment, deleteComment } from "@/app/actions/content-actions";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { validateCommentSubmission } from "@/lib/moderation";
import {
  createBlockRecord,
  createReportRecord,
} from "@/lib/supabase/app-data";
import {
  addBlockToSnapshot,
  addCommentToSnapshot,
  addReportToSnapshot,
  acceptCommentInSnapshot,
  removeCommentFromSnapshot,
} from "@/lib/runtime-mutations";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import { hasCompletedOnboarding } from "@/lib/supabase/app-data";
import { STANDARD_VISIBILITY_LEVELS } from "@/lib/constants";
import { isMasterAdminEmail } from "@/lib/admin/master-admin-shared";
import { getVerificationRestrictionMessage } from "@/lib/student-verification";
import {
  getStandardVisibilityLevel,
  isLegendarySenior,
  isReliabilityRestricted,
  isVerifiedStudent,
} from "@/lib/user-identity";
import {
  getCommentsByPostId,
  getPostById,
  getPublicIdentitySummary,
  isRepeatedlyReportedUser,
} from "@/lib/mock-queries";
import type { AppRuntimeSnapshot, VisibilityLevel } from "@/types";

const commentSchema = z.object({
  content: z.string().min(2, "댓글을 입력해주세요."),
  visibilityLevel: z.enum(["anonymous", "school", "schoolDepartment", "profile"]),
});
const INITIAL_VISIBLE_ROOT_COMMENTS = 24;
const ROOT_COMMENT_PAGE_SIZE = 24;
const INITIAL_VISIBLE_REPLIES = 3;

type CommentFormValues = z.infer<typeof commentSchema>;

export function CommentThread({
  postId,
  allowAccept = false,
  canCommentOverride,
  accountRequiredTitle,
  accountRequiredDescription,
  initialSnapshot,
}: {
  postId: string;
  allowAccept?: boolean;
  canCommentOverride?: boolean;
  accountRequiredTitle?: string;
  accountRequiredDescription?: string;
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const {
    currentUser: runtimeUser,
    loading,
    isAuthenticated,
    source,
    refresh,
    setSnapshot,
  } = useAppRuntime(initialSnapshot);
  const currentUser = runtimeUser;
  const pathname = usePathname();
  const isReliabilityBlocked = isAuthenticated && isReliabilityRestricted(currentUser.trustScore);
  const threadComments = useMemo(() => getCommentsByPostId(postId), [postId]);
  const targetPost = useMemo(() => getPostById(postId), [postId]);
  const isAnonymousBoard =
    targetPost?.category === "community" && targetPost.subcategory === "anonymous";
  const sortedComments = useMemo(
    () =>
      [...threadComments].sort((a, b) => {
        if (!allowAccept) {
          return +new Date(b.createdAt) - +new Date(a.createdAt);
        }

        const aScore =
          (a.accepted ? 20 : 0) +
          (isLegendarySenior(getAuthorTrustScore(a.authorId)) ? 6 : 0);
        const bScore =
          (b.accepted ? 20 : 0) +
          (isLegendarySenior(getAuthorTrustScore(b.authorId)) ? 6 : 0);

        return bScore - aScore || +new Date(b.createdAt) - +new Date(a.createdAt);
      }),
    [allowAccept, threadComments],
  );
  const rootComments = useMemo(
    () => sortedComments.filter((comment) => !comment.parentCommentId),
    [sortedComments],
  );
  const repliesByParentId = useMemo(() => {
    const map = new Map<string, typeof sortedComments>();
    sortedComments
      .filter((comment) => comment.parentCommentId)
      .forEach((comment) => {
        const parentId = comment.parentCommentId as string;
        const group = map.get(parentId) ?? [];
        group.push(comment);
        map.set(parentId, group);
      });

    for (const [key, value] of map.entries()) {
      map.set(
        key,
        [...value].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
      );
    }

    return map;
  }, [sortedComments]);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [visibleRootComments, setVisibleRootComments] = useState(INITIAL_VISIBLE_ROOT_COMMENTS);
  const [expandedReplyParents, setExpandedReplyParents] = useState<string[]>([]);
  const canUseStudentFeatures =
    isVerifiedStudent(runtimeUser) || isMasterAdminEmail(runtimeUser.email);
  const canComment =
    canCommentOverride ??
    (isAuthenticated &&
      hasCompletedOnboarding(runtimeUser) &&
      !isReliabilityBlocked &&
      canUseStudentFeatures);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
      visibilityLevel: isAnonymousBoard
        ? "anonymous"
        : getStandardVisibilityLevel(runtimeUser.defaultVisibilityLevel, runtimeUser),
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
      parentCommentId: replyTargetId ?? undefined,
      authorId: currentUser.id,
      visibilityLevel: isAnonymousBoard
        ? "anonymous"
        : (values.visibilityLevel as VisibilityLevel),
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
              parentCommentId: replyTargetId ?? undefined,
              content: values.content,
              visibilityLevel: isAnonymousBoard ? "anonymous" : values.visibilityLevel,
            });
            await refresh();
            form.reset();
            setReplyTargetId(null);
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
    setReplyTargetId(null);
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">댓글 {threadComments.length}</h3>
            </div>
            <p className="text-sm text-gray-500">
              {allowAccept ? "신뢰도 높은 답변이 먼저 보입니다." : "최신 댓글부터 이어서 볼 수 있습니다."}
            </p>
          </div>
          <span className="text-xs text-gray-400">{allowAccept ? "신뢰도 반영" : "최신순"}</span>
        </div>
      </div>

      {loading && threadComments.length === 0 ? <LoadingStateBlock /> : null}

      {!loading && threadComments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">아직 첫 댓글이 없습니다</p>
              <p className="text-sm text-gray-500">
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
          </div>
        </div>
      ) : null}

      {rootComments.length > 0 ? (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {rootComments.slice(0, visibleRootComments).map((comment) => {
            const replies = repliesByParentId.get(comment.id) ?? [];

            return (
              <div key={comment.id} className="space-y-3 py-4">
                <CommentRow
                  comment={comment}
                  postId={postId}
                  allowAccept={allowAccept}
                  canComment={canComment}
                  isAuthenticated={isAuthenticated}
                  currentUserId={currentUser.id}
                  source={source}
                  refresh={refresh}
                  setSnapshot={setSnapshot}
                  onReply={() => {
                    setReplyTargetId((current) => (current === comment.id ? null : comment.id));
                    form.setFocus("content");
                  }}
                />
                {replies.length ? (
                  <div className="space-y-3 border-l border-gray-100 pl-4 dark:border-white/10">
                    {replies
                      .slice(
                        0,
                        expandedReplyParents.includes(comment.id)
                          ? replies.length
                          : INITIAL_VISIBLE_REPLIES,
                      )
                      .map((reply) => (
                      <CommentRow
                        key={reply.id}
                        comment={reply}
                        postId={postId}
                        allowAccept={false}
                        canComment={canComment}
                        isAuthenticated={isAuthenticated}
                        currentUserId={currentUser.id}
                        source={source}
                        refresh={refresh}
                        setSnapshot={setSnapshot}
                        onReply={() => {
                          setReplyTargetId((current) => (current === comment.id ? null : comment.id));
                          form.setFocus("content");
                        }}
                        compact
                      />
                    ))}
                    {replies.length > INITIAL_VISIBLE_REPLIES &&
                    !expandedReplyParents.includes(comment.id) ? (
                      <div className="pl-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedReplyParents((current) => [...current, comment.id])
                          }
                        >
                          답글 {replies.length - INITIAL_VISIBLE_REPLIES}개 더 보기
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {rootComments.length > visibleRootComments ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVisibleRootComments((current) => current + ROOT_COMMENT_PAGE_SIZE)}
          >
            댓글 더 보기
          </Button>
        </div>
      ) : null}

      {canComment ? (
        <form className="space-y-3 border-t border-gray-100 pt-4" onSubmit={onSubmit}>
          {replyTargetId ? (
            <div className="flex items-center justify-between rounded-2xl border border-indigo-500/15 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">
              <span>답글 작성 중</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => setReplyTargetId(null)}>
                취소
              </Button>
            </div>
          ) : null}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
            <Textarea
              rows={2}
              placeholder={
                replyTargetId
                  ? "답글을 입력하세요"
                  : allowAccept
                    ? "질문에 바로 답변을 남겨보세요"
                    : "댓글을 입력하세요"
              }
              className="min-h-[88px] resize-none border-0 bg-transparent px-1 text-sm leading-6 shadow-none focus-visible:ring-0"
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
            {isAnonymousBoard ? (
              <div className="min-w-0 flex-1 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                익명 게시판에서는 댓글도 자동으로 익명 처리됩니다.
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <VisibilityLevelSelect
                  value={form.watch("visibilityLevel")}
                  levels={STANDARD_VISIBILITY_LEVELS}
                  onChange={(value) =>
                    form.setValue("visibilityLevel", value, { shouldValidate: true })
                  }
                />
              </div>
            )}
            <Button type="submit" size="sm" disabled={isSubmitting || !form.watch("content").trim()}>
              {isSubmitting ? "등록 중" : replyTargetId ? "답글 작성" : allowAccept ? "답변 등록" : "댓글 작성"}
            </Button>
          </div>
        </form>
      ) : isReliabilityBlocked ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
          <p className="mt-3 text-sm font-semibold text-rose-700">
            현재 계정은 글쓰기와 댓글 작성이 잠시 제한됩니다
          </p>
          <p className="mt-1 text-sm text-rose-600">
            신고 누적이나 제재 이력이 정리되면 다시 참여할 수 있습니다.
          </p>
        </div>
      ) : (
        <AccountRequiredCard
          isAuthenticated={isAuthenticated}
          user={runtimeUser}
          nextPath={pathname}
          title={
            accountRequiredTitle ??
            (isAuthenticated
              ? "대학생 인증을 완료하면 댓글을 남길 수 있습니다"
              : "로그인 후 댓글을 남길 수 있습니다")
          }
          description={
            accountRequiredDescription ??
            (isAuthenticated
              ? getVerificationRestrictionMessage(runtimeUser.verificationState)
              : "읽기는 자유롭게, 댓글은 로그인 후 바로 이어서 작성할 수 있습니다.")
          }
          ctaLabel={isAuthenticated ? "대학생 인증 진행" : "로그인하고 댓글 쓰기"}
        />
      )}
    </div>
  );
}

function CommentRow({
  comment,
  postId,
  allowAccept,
  canComment,
  isAuthenticated,
  currentUserId,
  source,
  refresh,
  setSnapshot,
  onReply,
  compact = false,
}: {
  comment: AppRuntimeSnapshot["comments"][number];
  postId: string;
  allowAccept: boolean;
  canComment: boolean;
  isAuthenticated: boolean;
  currentUserId: string;
  source: "mock" | "supabase";
  refresh: () => Promise<unknown>;
  setSnapshot: ReturnType<typeof useAppRuntime>["setSnapshot"];
  onReply: () => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"}>
      <PostAuthorRow
        authorId={comment.authorId}
        createdAt={comment.createdAt}
        visibilityLevel={comment.visibilityLevel}
        anonymousMode={getPostById(postId)?.subcategory === "anonymous"}
        minimal
      />
      <div className="space-y-2 pl-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {comment.accepted ? <span className="text-xs text-emerald-600">채택됨</span> : null}
          {allowAccept && isLegendarySenior(getAuthorTrustScore(comment.authorId)) ? (
            <LegendAnswerTag />
          ) : null}
        </div>
        <p className="text-sm leading-7 text-gray-700 dark:text-gray-200">{comment.content}</p>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1">
            {canComment ? (
              <Button size="sm" variant="ghost" type="button" onClick={onReply}>
                답글 달기
              </Button>
            ) : null}
            {allowAccept ? (
              <>
                {isAuthenticated && currentUserId === comment.authorId ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={async () => {
                      if (source === "supabase") {
                        await deleteComment(comment.id);
                        await refresh();
                        return;
                      }

                      setSnapshot((current) => removeCommentFromSnapshot(current, comment.id));
                    }}
                  >
                    댓글 삭제
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant={comment.accepted ? "secondary" : "outline"}
                  type="button"
                  onClick={async () => {
                    if (source === "supabase" && isAuthenticated) {
                      await acceptAdmissionAnswer(postId, comment.id);
                      await refresh();
                      return;
                    }

                    setSnapshot((current) => acceptCommentInSnapshot(current, postId, comment.id));
                  }}
                >
                  {comment.accepted ? "채택됨" : "답변 채택"}
                </Button>
              </>
            ) : isAuthenticated && currentUserId === comment.authorId ? (
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={async () => {
                  if (source === "supabase") {
                    await deleteComment(comment.id);
                    await refresh();
                    return;
                  }

                  setSnapshot((current) => removeCommentFromSnapshot(current, comment.id));
                }}
              >
                댓글 삭제
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
                  reporterId: currentUserId,
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
                  reporterId: currentUserId,
                  reason: reason ?? "other",
                  memo,
                }),
              );
            }}
            onBlock={async ({ targetUserId }) => {
              if (!targetUserId) return;

              if (source === "supabase" && isAuthenticated) {
                await createBlockRecord({
                  blockerId: currentUserId,
                  blockedUserId: targetUserId,
                });
                await refresh();
                return;
              }

              setSnapshot((current) =>
                addBlockToSnapshot(current, {
                  blockerId: currentUserId,
                  blockedUserId: targetUserId,
                }),
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}

function getAuthorTrustScore(authorId: string) {
  return getPublicIdentitySummary(authorId).trustScore;
}

function LoadingStateBlock() {
  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-white px-4 py-5">
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
    </div>
  );
}
