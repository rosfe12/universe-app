"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MessageCircleMore, MessagesSquare, RefreshCw } from "lucide-react";

import {
  markNotificationRead,
  markNotificationsReadByTarget,
} from "@/app/actions/notification-actions";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  getLectureById,
  getNotifications,
  getPostHref,
  getTradeStatusLabel,
  getTradePosts,
} from "@/lib/mock-queries";
import { formatRelativeLabel } from "@/lib/utils";
import type { ReactNode } from "react";
import type { AppRuntimeSnapshot } from "@/types";

function isMessageNotification(type: string) {
  return (
    type === "comment" ||
    type === "reply" ||
    type === "admissionAnswer" ||
    type === "tradeMatch"
  );
}

type MessageThreadItem = {
  id: string;
  title: string;
  preview: string;
  href: string;
  unread: boolean;
  time: string;
  notificationId?: string;
  targetType?: "post" | "trade";
  targetId?: string;
  sectionLabel?: string;
};

function getThreadHref(
  targetType?: "post" | "trade",
  targetId?: string,
  fallbackHref?: string,
) {
  if (targetType === "post" && targetId) {
    return getPostHref(targetId);
  }

  if (targetType === "trade" && targetId) {
    return `/trade?post=${targetId}`;
  }

  return fallbackHref ?? "/notifications";
}

function ThreadLink({
  thread,
  label,
  unreadIcon,
  readIcon,
}: {
  thread: MessageThreadItem;
  label: string;
  unreadIcon?: ReactNode;
  readIcon?: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(() => {
          void (async () => {
            if (thread.notificationId) {
              try {
                await markNotificationRead(thread.notificationId);
              } catch {
                // ignore read sync errors and continue navigation
              }
            } else if (thread.targetType && thread.targetId) {
              try {
                await markNotificationsReadByTarget(thread.targetType, thread.targetId);
              } catch {
                // ignore read sync errors and continue navigation
              }
            }
            router.push(thread.href);
          })();
        });
      }}
      className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-colors duration-150 hover:bg-gray-50 active:scale-[0.99]"
      disabled={isPending}
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
          {thread.unread ? unreadIcon : readIcon}
          {label}
        </span>
      </div>
    </button>
  );
}

export function MessagesPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const { loading, isAuthenticated, currentUser } = useAppRuntime(initialSnapshot);
  const notifications = getNotifications(currentUser.id);
  const messageThreads = Array.from(
    notifications
      .filter((item) => isMessageNotification(item.type))
      .reduce((map, item) => {
        const normalizedTargetType =
          item.targetType === "post" || item.targetType === "trade"
            ? item.targetType
            : undefined;
        const key = `${normalizedTargetType ?? "system"}:${item.targetId ?? item.id}`;
        const existing = map.get(key);

        if (!existing) {
          map.set(key, {
            id: key,
            title: item.title,
            preview: item.body,
            href: getThreadHref(normalizedTargetType, item.targetId, item.href),
            unread: !item.isRead,
            time: formatRelativeLabel(item.createdAt),
            notificationId: item.id,
            targetType: normalizedTargetType,
            targetId: item.targetId,
            sectionLabel: item.type === "tradeMatch" ? "수강신청 교환" : "내 글 반응",
            createdAt: item.createdAt,
          });
          return map;
        }

        if (new Date(item.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
          existing.title = item.title;
          existing.preview = item.body;
          existing.time = formatRelativeLabel(item.createdAt);
          existing.notificationId = item.id;
          existing.createdAt = item.createdAt;
        }

        existing.unread = existing.unread || !item.isRead;
        return map;
      }, new Map<string, MessageThreadItem & { createdAt: string }>())
      .values(),
  )
    .sort(
      (a, b) =>
        Number(b.unread) - Number(a.unread) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 12)
    .map((thread) => ({
      id: thread.id,
      title: thread.title,
      preview: thread.preview,
      href: thread.href,
      unread: thread.unread,
      time: thread.time,
      notificationId: thread.notificationId,
      targetType: thread.targetType,
      targetId: thread.targetId,
      sectionLabel: thread.sectionLabel,
    }));

  const tradeThreads = getTradePosts()
    .filter((item) => item.userId === currentUser.id)
    .slice(0, 6)
    .map((item) => ({
      id: `trade-room:${item.id}`,
      title: `${getLectureById(item.wantLectureId)?.courseName ?? "원하는 강의"} 교환 진행`,
      preview: `${getTradeStatusLabel(item.status)} · ${item.note}`,
      href: `/trade?post=${item.id}`,
      unread: item.status === "matching",
      time: formatRelativeLabel(item.createdAt),
      targetType: "trade" as const,
      targetId: item.id,
      sectionLabel: "수강신청 교환",
    }));

  const chatThreads = tradeThreads
    .map((thread) => ({
      ...thread,
      id: `chat:${thread.targetId}`,
    }))
    .sort((a, b) => Number(b.unread) - Number(a.unread))
    .slice(0, 12);

  return (
    <AppShell title="메시지">
      {loading ? <LoadingState /> : null}
      {!isAuthenticated ? (
        <EmptyState
          title="로그인 후 메시지를 확인할 수 있습니다"
          description="쪽지와 채팅을 나눠서 확인할 수 있습니다."
          actionLabel="로그인"
          href="/login?next=/messages"
        />
      ) : messageThreads.length === 0 && chatThreads.length === 0 ? (
        <EmptyState
          title="아직 이어진 메시지가 없습니다"
          description="댓글, 답글, 매칭 반응이 생기면 여기에서 바로 이어볼 수 있습니다."
          actionLabel="커뮤니티 둘러보기"
          href="/community"
        />
      ) : (
        <Tabs defaultValue="dm" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dm">쪽지</TabsTrigger>
            <TabsTrigger value="chat">채팅</TabsTrigger>
          </TabsList>
          <TabsContent value="dm" className="mt-0">
            <div className="px-4 pb-3 text-xs text-gray-400">
              댓글, 답글, 입시 답변, 매칭 반응을 모아서 보여줍니다.
            </div>
            {messageThreads.length === 0 ? (
              <EmptyState
                title="아직 쪽지가 없습니다"
                description="댓글, 답글, 교환 반응이 들어오면 여기에서 바로 이어집니다."
                actionLabel="커뮤니티 보기"
                href="/community"
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {messageThreads.map((thread) => (
                  <ThreadLink
                    key={thread.id}
                    thread={thread}
                    label="이어보기"
                    unreadIcon={<MessagesSquare className="h-3.5 w-3.5" />}
                    readIcon={<RefreshCw className="h-3.5 w-3.5" />}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="chat" className="mt-0">
            <div className="px-4 pb-3 text-xs text-gray-400">
              매칭이 진행 중인 수강신청 교환 대화만 따로 모아 보여줍니다.
            </div>
            {chatThreads.length === 0 ? (
              <EmptyState
                title="아직 진행 중인 교환 채팅이 없습니다"
                description="매칭이 시작된 수강신청 교환이 생기면 여기에서 바로 이어볼 수 있습니다."
                actionLabel="수강신청 교환 보기"
                href="/trade"
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {chatThreads.map((thread) => (
                  <ThreadLink
                    key={thread.id}
                    thread={thread}
                    label="대화 열기"
                    unreadIcon={<MessageCircleMore className="h-3.5 w-3.5" />}
                    readIcon={<MessageCircleMore className="h-3.5 w-3.5" />}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}
