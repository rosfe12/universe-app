"use client";

import Link from "next/link";
import { MessagesSquare, RefreshCw } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  getLectureById,
  getNotifications,
  getPostById,
  getPostHref,
  getTradeStatusLabel,
  getTradePosts,
} from "@/lib/mock-queries";
import { formatRelativeLabel } from "@/lib/utils";
import type { AppRuntimeSnapshot } from "@/types";

function isMessageNotification(type: string) {
  return (
    type === "comment" ||
    type === "reply" ||
    type === "admissionAnswer" ||
    type === "tradeMatch"
  );
}

export function MessagesPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const { loading, isAuthenticated, currentUser } = useAppRuntime(initialSnapshot);

  const notificationThreads = getNotifications(currentUser.id)
    .filter((item) => isMessageNotification(item.type))
    .map((item) => ({
      id: item.id,
      title: item.title,
      preview: item.body,
      href:
        item.targetType === "post" && item.targetId
          ? getPostHref(item.targetId)
          : item.href ?? "/notifications",
      unread: !item.isRead,
      time: formatRelativeLabel(item.createdAt),
    }));

  const tradeThreads = getTradePosts()
    .filter((item) => item.userId === currentUser.id)
    .slice(0, 4)
    .map((item) => ({
      id: `trade-${item.id}`,
      title: `${getLectureById(item.wantLectureId)?.courseName ?? "원하는 강의"} 교환 진행`,
      preview: `${getTradeStatusLabel(item.status)} · ${item.note}`,
      href: "/trade",
      unread: item.status === "matching",
      time: formatRelativeLabel(item.createdAt),
    }));

  const commentThreads = currentUser.id
    ? Array.from(
        new Map(
          getNotifications(currentUser.id)
            .filter((item) => item.type === "comment" || item.type === "reply")
            .map((item) => [item.targetId ?? item.id, item]),
        ).values(),
      )
        .slice(0, 4)
        .map((item) => {
          const post = item.targetId ? getPostById(item.targetId) : undefined;
          return {
            id: `post-${item.id}`,
            title: post?.title ?? item.title,
            preview: item.body,
            href: item.targetId ? getPostHref(item.targetId) : item.href ?? "/community",
            unread: !item.isRead,
            time: formatRelativeLabel(item.createdAt),
          };
        })
    : [];

  const threads = Array.from(
    new Map(
      [...notificationThreads, ...tradeThreads, ...commentThreads]
        .sort((a, b) => Number(b.unread) - Number(a.unread))
        .map((item) => [item.id, item]),
    ).values(),
  ).slice(0, 12);

  return (
    <AppShell title="쪽지">
      {loading ? <LoadingState /> : null}
      {!isAuthenticated ? (
        <EmptyState
          title="로그인 후 쪽지를 확인할 수 있습니다"
          description="댓글, 답글, 매칭처럼 바로 이어서 봐야 할 대화를 모아둡니다."
          actionLabel="로그인"
          href="/login?next=/messages"
        />
      ) : threads.length === 0 ? (
        <EmptyState
          title="아직 이어진 대화가 없습니다"
          description="댓글이나 매칭 반응이 생기면 여기에서 바로 이어볼 수 있습니다."
          actionLabel="커뮤니티 둘러보기"
          href="/community"
        />
      ) : (
        <div className="divide-y divide-gray-100">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={thread.href}
              className="flex items-start justify-between gap-3 px-4 py-4 text-left transition-colors duration-150 hover:bg-gray-50 active:scale-[0.99]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">{thread.title}</p>
                  {thread.unread ? <span className="h-2 w-2 rounded-full bg-indigo-500" /> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{thread.preview}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="block text-xs text-gray-400">{thread.time}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                  {thread.unread ? <MessagesSquare className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  이어보기
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
