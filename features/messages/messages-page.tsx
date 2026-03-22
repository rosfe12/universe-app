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
  getLatestCommentPreview,
  getLectureById,
  getNotifications,
  getPostById,
  getPostHref,
  getTradeStatusLabel,
  getTradePosts,
  getUserPosts,
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

  const unreadPostIds = new Set(
    notifications
      .filter((item) => !item.isRead && item.targetType === "post" && item.targetId)
      .map((item) => item.targetId as string),
  );

  const notificationThreads = notifications
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
      notificationId: item.id,
    }));

  const tradeThreads = getTradePosts()
    .filter((item) => item.userId === currentUser.id)
    .slice(0, 6)
    .map((item) => ({
      id: `trade-${item.id}`,
      title: `${getLectureById(item.wantLectureId)?.courseName ?? "원하는 강의"} 교환 진행`,
      preview: `${getTradeStatusLabel(item.status)} · ${item.note}`,
      href: "/trade",
      unread: item.status === "matching",
      time: formatRelativeLabel(item.createdAt),
      targetType: "trade" as const,
      targetId: item.id,
      sectionLabel: "수강신청 교환",
    }));

  const commentThreads = currentUser.id
    ? Array.from(
        new Map(
          notifications
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
            notificationId: item.id,
            sectionLabel: "내 글 반응",
          };
        })
    : [];

  const messageThreads = Array.from(
    new Map(
      [...notificationThreads, ...tradeThreads, ...commentThreads]
        .sort((a, b) => Number(b.unread) - Number(a.unread))
        .map((item) => [item.id, item]),
    ).values(),
  ).slice(0, 12);

  const chatThreads = [
    ...getUserPosts(currentUser.id)
      .filter((post) => post.commentCount > 0)
      .slice(0, 8)
      .map((post) => {
        const latestComment = getLatestCommentPreview(post.id);
        return {
          id: `chat-post-${post.id}`,
          title: post.title,
          preview: latestComment?.content ?? post.content,
          href: getPostHref(post.id),
          unread: unreadPostIds.has(post.id),
          time: formatRelativeLabel(latestComment?.createdAt ?? post.createdAt),
          targetType: "post" as const,
          targetId: post.id,
          sectionLabel: "내 글 반응",
        };
      }),
    ...tradeThreads.map((thread) => ({
      ...thread,
      id: `chat-${thread.id}`,
    })),
  ]
    .sort((a, b) => Number(b.unread) - Number(a.unread))
    .slice(0, 12);

  return (
    <AppShell title="메시지">
      {loading ? <LoadingState /> : null}
      {!isAuthenticated ? (
        <EmptyState
          title="로그인 후 메시지를 확인할 수 있습니다"
          description="내 글 반응과 진행 중인 교환 흐름을 한곳에서 바로 확인할 수 있습니다."
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
            <TabsTrigger value="dm">반응</TabsTrigger>
            <TabsTrigger value="chat">진행</TabsTrigger>
          </TabsList>
          <TabsContent value="dm" className="mt-0">
            {messageThreads.length === 0 ? (
              <EmptyState
                title="아직 새 반응이 없습니다"
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
            {chatThreads.length === 0 ? (
              <EmptyState
                title="아직 진행 중인 흐름이 없습니다"
                description="내 글 댓글과 교환 진행 흐름이 생기면 여기에서 이어볼 수 있습니다."
                actionLabel="우리학교 보기"
                href="/school"
              />
            ) : (
              <div className="space-y-4">
                {["내 글 반응", "수강신청 교환"].map((section) => {
                  const threads = chatThreads.filter((thread) => thread.sectionLabel === section);
                  if (threads.length === 0) return null;

                  return (
                    <section key={section} className="space-y-2">
                      <p className="px-4 text-xs font-medium text-gray-400">{section}</p>
                      <div className="divide-y divide-gray-100">
                        {threads.map((thread) => (
                          <ThreadLink
                            key={thread.id}
                            thread={thread}
                            label="이어보기"
                            unreadIcon={<MessageCircleMore className="h-3.5 w-3.5" />}
                            readIcon={<MessageCircleMore className="h-3.5 w-3.5" />}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}
