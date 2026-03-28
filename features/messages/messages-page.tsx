"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { MessageCircleMore, MessagesSquare, RefreshCw } from "lucide-react";

import {
  markNotificationRead,
  markNotificationsReadByTarget,
} from "@/app/actions/notification-actions";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { RelativeTimeText } from "@/components/shared/relative-time-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  getLectureById,
  getNotifications,
  getAnonymousHandle,
  getPostHref,
  getTradeStatusLabel,
  getTradePosts,
} from "@/lib/mock-queries";
import { createClient } from "@/lib/supabase/client";
import { isMasterAdminEmail } from "@/lib/admin/master-admin-shared";
import { getVerificationRestrictionMessage } from "@/lib/student-verification";
import { isVerifiedStudent } from "@/lib/user-identity";
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
  unreadCount?: number;
  createdAt: string;
  notificationId?: string;
  targetType?: "post" | "trade";
  targetId?: string;
  sectionLabel?: string;
  subtitle?: string;
};

type TradeMessageRow = {
  id: string;
  trade_post_id: string;
  sender_id: string;
  content: string;
  created_at: string;
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
    return `/trade?post=${targetId}&chat=1`;
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
      className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-colors duration-150 hover:bg-gray-50 active:scale-[0.99] disabled:opacity-60 dark:hover:bg-white/5"
      disabled={isPending}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{thread.title}</p>
          {thread.unread ? <span className="h-2 w-2 rounded-full bg-indigo-500" /> : null}
        </div>
        {thread.sectionLabel ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">{thread.sectionLabel}</p>
        ) : null}
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{thread.preview}</p>
      </div>
      <div className="shrink-0 text-right">
        <RelativeTimeText
          dateString={thread.createdAt}
          className="block text-xs text-muted-foreground"
        />
        {thread.unreadCount && thread.unreadCount > 0 ? (
          <span className="mt-2 inline-flex min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
            {thread.unreadCount}
          </span>
        ) : null}
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
  const { loading, isAuthenticated, currentUser, source, refresh } = useAppRuntime(initialSnapshot, "messages");
  const canUseMessaging = isVerifiedStudent(currentUser) || isMasterAdminEmail(currentUser.email);
  const notifications = getNotifications(currentUser.id);
  const [chatThreads, setChatThreads] = useState<MessageThreadItem[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const showInitialLoading = loading && source === "mock";

  const tradeUnreadCounts = useMemo(
    () =>
      notifications.reduce((map, item) => {
        if (
          item.type === "tradeMatch" &&
          !item.isRead &&
          item.targetType === "trade" &&
          item.targetId
        ) {
          map.set(item.targetId, (map.get(item.targetId) ?? 0) + 1);
        }
        return map;
      }, new Map<string, number>()),
    [notifications],
  );
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
            createdAt: item.createdAt,
            notificationId: item.id,
            targetType: normalizedTargetType,
            targetId: item.targetId,
            sectionLabel: item.type === "tradeMatch" ? "수강신청 교환" : "내 글 반응",
            unreadCount: item.isRead ? 0 : 1,
          });
          return map;
        }

        if (new Date(item.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
          existing.title = item.title;
          existing.preview = item.body;
          existing.notificationId = item.id;
          existing.createdAt = item.createdAt;
        }

        existing.unread = existing.unread || !item.isRead;
        existing.unreadCount = (existing.unreadCount ?? 0) + (item.isRead ? 0 : 1);
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
      createdAt: thread.createdAt,
      notificationId: thread.notificationId,
      targetType: thread.targetType,
      targetId: thread.targetId,
      sectionLabel: thread.sectionLabel,
      unreadCount: thread.unreadCount,
    }));
  const messageUnreadCount = messageThreads.reduce(
    (count, thread) => count + (thread.unreadCount ?? (thread.unread ? 1 : 0)),
    0,
  );
  const chatUnreadCount = chatThreads.reduce(
    (count, thread) => count + (thread.unreadCount ?? (thread.unread ? 1 : 0)),
    0,
  );

  const fallbackChatThreads = useMemo(
    () =>
      getTradePosts()
        .filter((item) => item.userId === currentUser.id)
        .slice(0, 6)
        .map((item) => ({
          id: `chat:${item.id}`,
          title: `${getLectureById(item.haveLectureId)?.courseName ?? "보유 강의"} ↔ ${getLectureById(item.wantLectureId)?.courseName ?? "원하는 강의"}`,
          preview: item.note,
          href: `/trade?post=${item.id}&chat=1`,
          unread: (tradeUnreadCounts.get(item.id) ?? 0) > 0 || item.status === "matching",
          unreadCount: tradeUnreadCounts.get(item.id) ?? 0,
          createdAt: item.createdAt,
          targetType: "trade" as const,
          targetId: item.id,
          sectionLabel: `${getTradeStatusLabel(item.status)} · ${item.status === "matching" ? "대화 진행 중" : "대화 시작 전"}`,
        })),
    [currentUser.id, tradeUnreadCounts],
  );

  useEffect(() => {
    if (!isAuthenticated || source !== "supabase") {
      setChatThreads(fallbackChatThreads);
      return;
    }

    const supabase = createClient();
    const loadChatThreads = async () => {
      setChatLoading(true);
      const ownedTradeIds = getTradePosts()
        .filter((item) => item.userId === currentUser.id)
        .map((item) => item.id);

      const { data: joinedRooms } = await supabase
        .from("trade_messages")
        .select("trade_post_id")
        .eq("sender_id", currentUser.id)
        .limit(120);

      const roomIds = [...new Set([
        ...ownedTradeIds,
        ...(joinedRooms ?? []).map((item) => String(item.trade_post_id)),
      ])];

      if (roomIds.length === 0) {
        setChatThreads(fallbackChatThreads);
        setChatLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("trade_messages")
        .select("id, trade_post_id, sender_id, content, created_at")
        .in("trade_post_id", roomIds)
        .order("created_at", { ascending: false })
        .limit(120);

      if (error || !data) {
        setChatThreads(fallbackChatThreads);
        setChatLoading(false);
        return;
      }

      const rowsByTrade = new Map<string, TradeMessageRow[]>();
      for (const row of data as TradeMessageRow[]) {
        const current = rowsByTrade.get(row.trade_post_id) ?? [];
        current.push(row);
        rowsByTrade.set(row.trade_post_id, current);
      }

      const visibleTradePosts = getTradePosts();
      const nextThreads: MessageThreadItem[] = [...rowsByTrade.entries()]
        .flatMap(([tradePostId, rows]) => {
          const tradePost = visibleTradePosts.find((item) => item.id === tradePostId);
          if (!tradePost) {
            return [];
          }

          const latestMessage = rows[0];
          const participantCount = new Set([tradePost.userId, ...rows.map((row) => row.sender_id)])
            .size;
          const unreadCount = tradeUnreadCounts.get(tradePost.id) ?? 0;
          return [
            {
              id: `chat:${tradePost.id}`,
              title: `${getLectureById(tradePost.haveLectureId)?.courseName ?? "보유 강의"} ↔ ${getLectureById(tradePost.wantLectureId)?.courseName ?? "원하는 강의"}`,
              preview: `${latestMessage.sender_id === currentUser.id ? "나" : getAnonymousHandle(latestMessage.sender_id)} · ${latestMessage.content}`,
              href: `/trade?post=${tradePost.id}&chat=1`,
              unread: unreadCount > 0 || latestMessage.sender_id !== currentUser.id,
              unreadCount,
              createdAt: latestMessage.created_at,
              targetType: "trade" as const,
              targetId: tradePost.id,
              sectionLabel: `${getTradeStatusLabel(tradePost.status)} · 참여 ${participantCount}명`,
            },
          ];
        })
        .sort(
          (a, b) =>
            Number(b.unread) - Number(a.unread) ||
            (b.unreadCount ?? 0) - (a.unreadCount ?? 0),
        );

      setChatThreads(nextThreads.length > 0 ? nextThreads : fallbackChatThreads);
      setChatLoading(false);
    };

    void loadChatThreads();
  }, [currentUser.id, fallbackChatThreads, isAuthenticated, source, tradeUnreadCounts]);

  if (showInitialLoading) {
    return (
      <AppShell title="메시지">
        <LoadingState />
      </AppShell>
    );
  }

  return (
    <AppShell title="메시지">
      {loading ? <LoadingState /> : null}
      {!isAuthenticated ? (
        <EmptyState
          title="로그인 후 메시지를 확인할 수 있습니다"
          description="메시지와 채팅을 나눠서 확인할 수 있습니다."
          actionLabel="로그인"
          href="/login?next=/messages"
        />
      ) : !canUseMessaging ? (
        <EmptyState
          title="대학생 인증을 완료하면 메시지와 채팅을 사용할 수 있습니다"
          description={getVerificationRestrictionMessage(currentUser.verificationState)}
          actionLabel="대학생 인증 진행"
          href="/onboarding?next=/messages&mode=verification"
        />
      ) : (
        <Tabs defaultValue="dm" className="space-y-4">
          <Card className="app-section-surface rounded-[28px] border-white/10 shadow-none">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  메시지 {messageUnreadCount} · 채팅 {chatUnreadCount}
                </p>
                <p className="text-sm text-muted-foreground">
                  최근 반응과 대화를 한 곳에서 바로 이어볼 수 있어요.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isRefreshing}
                onClick={() => {
                  startRefreshTransition(() => {
                    void refresh();
                  });
                }}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                새로고침
              </Button>
            </CardContent>
          </Card>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dm" className="gap-2">
              메시지
              {messageUnreadCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                  {Math.min(messageUnreadCount, 99)}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              채팅
              {chatUnreadCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                  {Math.min(chatUnreadCount, 99)}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dm" className="mt-0 space-y-3">
            <div className="mb-3 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-muted-foreground">
              댓글, 답글, 입시 답변, 교환 반응을 한 번에 이어서 볼 수 있어요.
            </div>
            {messageThreads.length === 0 ? (
              <EmptyState
                title="아직 메시지가 없습니다"
                description="댓글, 답글, 교환 반응이 들어오면 여기에서 바로 이어집니다."
                actionLabel="커뮤니티 보기"
                href="/community"
              />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/10">
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
          <TabsContent value="chat" className="mt-0 space-y-3">
            <div className="mb-3 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-muted-foreground">
              실제 수강신청 교환 대화방만 따로 모아 보여줍니다.
            </div>
            {chatLoading ? (
              <ThreadListSkeleton />
            ) : chatThreads.length === 0 ? (
              <EmptyState
                title="아직 진행 중인 교환 채팅이 없습니다"
                description="교환 글 상세에서 대화를 시작하면 여기에서 바로 이어볼 수 있습니다."
                actionLabel="수강신청 교환 보기"
                href="/trade"
              />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/10">
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

function ThreadListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="app-section-surface rounded-[24px] border border-white/10 px-4 py-4"
        >
          <div className="space-y-3">
            <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
