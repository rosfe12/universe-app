"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { BarChart3, CheckCircle2 } from "lucide-react";

import { votePoll } from "@/app/actions/content-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Poll, Post } from "@/types";

function getPollBadgeLabel(post?: Pick<Post, "postType"> | null) {
  if (post?.postType === "balance") return "밸런스게임";
  return "투표";
}

export function PollCard({
  poll,
  post,
  compact = false,
  canVote = true,
  onVoted,
  onRequireAuth,
}: {
  poll: Poll;
  post?: Pick<Post, "id" | "postType"> | null;
  compact?: boolean;
  canVote?: boolean;
  onVoted?: () => Promise<unknown> | void;
  onRequireAuth?: () => void;
}) {
  const [localPoll, setLocalPoll] = useState(poll);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLocalPoll(poll);
  }, [poll]);

  const totalVotes = useMemo(
    () => localPoll.options.reduce((sum, option) => sum + option.voteCount, 0),
    [localPoll.options],
  );
  const hasVoted = Boolean(localPoll.votedOptionId);

  const handleVote = (optionId: string) => {
    if (!canVote) {
      onRequireAuth?.();
      return;
    }

    if (hasVoted || isPending) {
      return;
    }

    setErrorMessage(null);
    const previousPoll = localPoll;
    const optimisticOptions = localPoll.options.map((option) =>
      option.id === optionId
        ? { ...option, voteCount: option.voteCount + 1, selected: true }
        : { ...option, selected: false },
    );
    const optimisticTotal = optimisticOptions.reduce((sum, option) => sum + option.voteCount, 0);
    setLocalPoll({
      ...localPoll,
      votedOptionId: optionId,
      totalVotes: optimisticTotal,
      options: optimisticOptions.map((option) => ({
        ...option,
        percentage:
          optimisticTotal > 0
            ? Math.round((option.voteCount / optimisticTotal) * 100)
            : 0,
      })),
    });
    startTransition(() => {
      void (async () => {
        try {
          await votePoll({ postId: localPoll.postId, optionId });
          await onVoted?.();
        } catch (error) {
          setLocalPoll(previousPoll);
          setErrorMessage(error instanceof Error ? error.message : "투표에 실패했습니다.");
        }
      })();
    });
  };

  return (
    <div className={cn("space-y-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4", compact && "rounded-[20px] p-3")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-300">
          {getPollBadgeLabel(post)}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" />
          총 {totalVotes}명 참여
        </span>
      </div>
      <div className="space-y-1">
        <p className={cn("text-sm font-semibold leading-6 text-foreground", compact && "text-[13px]")}>
          {localPoll.question}
        </p>
      </div>
      <div className="space-y-2">
        {localPoll.options.map((option) => {
          const showResult = hasVoted;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleVote(option.id)}
              disabled={showResult || isPending}
              className={cn(
                "relative block w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.06]",
                showResult ? "cursor-default" : "cursor-pointer",
              )}
            >
              {showResult ? (
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 bg-violet-500/15"
                  style={{ width: `${option.percentage}%` }}
                />
              ) : null}
              <span className="relative flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{option.text}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {option.selected ? <CheckCircle2 className="h-3.5 w-3.5 text-violet-300" /> : null}
                  {showResult ? `${option.percentage}% · ${option.voteCount}` : "선택"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {errorMessage ? <p className="text-xs text-rose-400">{errorMessage}</p> : null}
      {!hasVoted ? (
        <p className="text-xs text-muted-foreground">
          한 번 선택하면 결과가 바로 반영됩니다.
        </p>
      ) : null}
      {!canVote ? (
        <div className="pt-1">
          <Button type="button" size="sm" variant="outline" onClick={onRequireAuth}>
            로그인하고 투표하기
          </Button>
        </div>
      ) : null}
    </div>
  );
}
