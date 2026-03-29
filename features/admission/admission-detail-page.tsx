"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { ActionFeedbackBanner } from "@/components/shared/action-feedback-banner";
import { LoadingState } from "@/components/shared/loading-state";
import { ReportBlockActions } from "@/components/shared/report-block-actions";
import { ShareActionGroup } from "@/components/shared/share-action-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deletePost } from "@/app/actions/content-actions";
import { CommentThread } from "@/features/common/comment-thread";
import { PostAuthorRow } from "@/features/common/post-author-row";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  addBlockToSnapshot,
  addReportToSnapshot,
  removePostFromSnapshot,
} from "@/lib/runtime-mutations";
import {
  createBlockRecord,
  createReportRecord,
} from "@/lib/supabase/app-data";
import {
  getAdmissionQuestion,
  getSchoolName,
  isRepeatedlyReportedUser,
} from "@/lib/mock-queries";
import { createPostSharePayload } from "@/lib/share-utils";
import { getOfficialStarterMeta } from "@/lib/utils";
import type { AppRuntimeSnapshot } from "@/types";

export function AdmissionDetailPage({
  questionId,
  initialSnapshot,
}: {
  questionId: string;
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const {
    currentUser,
    loading,
    source,
    isAuthenticated,
    refresh,
    setSnapshot,
  } = useAppRuntime(initialSnapshot, "admission");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const question = getAdmissionQuestion(questionId);
  const officialStarter = getOfficialStarterMeta(question);

  if (!question) {
    return (
      <AppShell title="입시 질문 상세" subtitle="질문을 확인하고 있습니다.">
        <LoadingState />
      </AppShell>
    );
  }
  return (
    <AppShell
      title="입시 질문 상세"
      topAction={
        <Button asChild size="icon" variant="ghost">
          <Link href="/school?tab=admission" aria-label="뒤로">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      }
    >
      {successMessage ? (
        <ActionFeedbackBanner message={successMessage} onClose={() => setSuccessMessage(null)} />
      ) : null}
      {loading ? <LoadingState /> : null}
      <Card>
        <CardHeader className="space-y-4">
          <PostAuthorRow
            authorId={question.authorId}
            createdAt={question.createdAt}
            visibilityLevel={question.visibilityLevel}
            contentSchoolId={question.schoolId}
            showProfilePreview
            nameOverride={officialStarter?.name}
            labelOverride={officialStarter?.label}
            badgeLabel={officialStarter?.badge}
            disableProfileLink={Boolean(officialStarter)}
            hideUserLevel={Boolean(officialStarter)}
          />
          <div className="space-y-2">
            <CardTitle className="text-xl leading-snug">{question.title}</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">{question.content}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-[24px] bg-secondary/70 p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">지역</p>
              <p className="mt-1 font-medium">{question.meta?.region}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">계열</p>
              <p className="mt-1 font-medium">{question.meta?.track}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">성적</p>
              <p className="mt-1 font-medium">{question.meta?.scoreType}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">관심 학과</p>
              <p className="mt-1 font-medium">{question.meta?.interestDepartment}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{getSchoolName(question.schoolId)}</Badge>
              <Badge variant="secondary">{question.meta?.interestUniversity}</Badge>
              <Badge variant="success">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                대학생 답변 우선 노출
              </Badge>
            </div>
            <ShareActionGroup
              payload={createPostSharePayload(question)}
              onFeedback={setSuccessMessage}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {officialStarter ? null : (
              <ReportBlockActions
                compact
                targetType="post"
                targetId={question.id}
                targetUserId={question.authorId}
                repeatedlyReported={isRepeatedlyReportedUser(question.authorId)}
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
            )}
          </div>
          {isAuthenticated && currentUser.id === question.authorId ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  if (source === "supabase") {
                    await deletePost(question.id);
                    window.location.href = "/school?tab=admission";
                    return;
                  }

                  setSnapshot((current) => removePostFromSnapshot(current, question.id));
                  window.location.href = "/school?tab=admission";
                }}
              >
                글 삭제
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CommentThread
        postId={question.id}
        allowAccept
        initialSnapshot={initialSnapshot}
        runtimeScope="admission"
        onMutationComplete={refresh}
      />
    </AppShell>
  );
}
