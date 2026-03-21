"use client";

import {
  BellRing,
  BookOpenCheck,
  CheckCheck,
  Flame,
  GraduationCap,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  School,
  ShieldCheck,
  Siren,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notification-actions";
import { AppShell } from "@/components/layout/app-shell";
import { AccountRequiredCard } from "@/components/shared/account-required-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  getAdmissionQuestions,
  getCommentsByPostId,
  getCommunityPosts,
  getCurrentSchool,
  getHotGalleryPosts,
  getLectureSummaries,
  getNotifications,
  getSchoolHotPosts,
  getTradePosts,
} from "@/lib/mock-queries";
import { isSupabaseEnabled } from "@/lib/supabase/app-data";
import { createClient } from "@/lib/supabase/client";
import { cn, formatRelativeLabel } from "@/lib/utils";
import type {
  AppRuntimeSnapshot,
  Notification,
  NotificationCategory,
  NotificationType,
} from "@/types";

type NotificationTab = "all" | "activity" | "notice";

const TAB_TARGET_SIZE: Record<NotificationTab, number> = {
  all: 6,
  activity: 4,
  notice: 4,
};

const NOTIFICATION_META: Record<
  NotificationType,
  {
    icon: typeof BellRing;
    label: string;
    badgeVariant: "default" | "secondary" | "outline" | "success" | "warning" | "danger";
    iconClassName: string;
  }
> = {
  comment: {
    icon: MessageCircle,
    label: "댓글",
    badgeVariant: "default",
    iconClassName: "bg-indigo-50 text-indigo-600",
  },
  reply: {
    icon: MessagesSquare,
    label: "답글",
    badgeVariant: "default",
    iconClassName: "bg-sky-50 text-sky-600",
  },
  trendingPost: {
    icon: Flame,
    label: "인기글",
    badgeVariant: "danger",
    iconClassName: "bg-rose-50 text-rose-600",
  },
  lectureReaction: {
    icon: BookOpenCheck,
    label: "강의평",
    badgeVariant: "secondary",
    iconClassName: "bg-violet-50 text-violet-600",
  },
  tradeMatch: {
    icon: RefreshCw,
    label: "매칭",
    badgeVariant: "warning",
    iconClassName: "bg-amber-50 text-amber-700",
  },
  admissionAnswer: {
    icon: GraduationCap,
    label: "입시답변",
    badgeVariant: "secondary",
    iconClassName: "bg-cyan-50 text-cyan-700",
  },
  schoolRecommendation: {
    icon: School,
    label: "우리학교",
    badgeVariant: "success",
    iconClassName: "bg-emerald-50 text-emerald-700",
  },
  freshmanTrending: {
    icon: Sparkles,
    label: "새내기존",
    badgeVariant: "success",
    iconClassName: "bg-emerald-50 text-emerald-700",
  },
  admissionUnanswered: {
    icon: BellRing,
    label: "질문추천",
    badgeVariant: "outline",
    iconClassName: "bg-slate-50 text-slate-600",
  },
  verificationApproved: {
    icon: ShieldCheck,
    label: "인증승인",
    badgeVariant: "success",
    iconClassName: "bg-emerald-50 text-emerald-700",
  },
  reportUpdate: {
    icon: Siren,
    label: "신고처리",
    badgeVariant: "warning",
    iconClassName: "bg-amber-50 text-amber-700",
  },
  announcement: {
    icon: Megaphone,
    label: "공지",
    badgeVariant: "outline",
    iconClassName: "bg-slate-50 text-slate-700",
  },
};

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function getNotificationHref(item: Notification) {
  if (item.href) {
    return item.href;
  }

  switch (item.type) {
    case "admissionAnswer":
    case "admissionUnanswered":
      return item.targetId ? `/admission/${item.targetId}` : "/admission";
    case "lectureReaction":
      return item.targetId ? `/lectures/${item.targetId}` : "/lectures";
    case "tradeMatch":
      return "/trade";
    case "verificationApproved":
    case "reportUpdate":
      return "/profile";
    case "schoolRecommendation":
      return "/school";
    case "freshmanTrending":
      return "/school?tab=freshman";
    case "comment":
    case "reply":
    case "trendingPost":
      return "/community";
    case "announcement":
      return "/community";
    default:
      return undefined;
  }
}

function buildRecommendedNotifications(userId: string, schoolName?: string) {
  const schoolHotPost = getSchoolHotPosts()[0];
  const hotPost = getHotGalleryPosts("popular")[0];
  const freshmanPost = getCommunityPosts("freshman").find(
    (post) => !schoolHotPost?.schoolId || post.schoolId === schoolHotPost.schoolId,
  );
  const unansweredAdmission = getAdmissionQuestions().find(
    (post) => getCommentsByPostId(post.id).length === 0,
  );
  const lecture = getLectureSummaries().find(
    (item) => !schoolHotPost?.schoolId || item.schoolId === schoolHotPost.schoolId,
  );
  const tradePost = getTradePosts().find(
    (item) => !schoolHotPost?.schoolId || item.schoolId === schoolHotPost.schoolId,
  );

  const items: Notification[] = [];

  if (hotPost) {
    items.push({
      id: `recommended-hot-${hotPost.id}`,
      userId,
      type: "trendingPost",
      category: "activity",
      title: "지금 반응이 빠르게 붙는 핫갤 글",
      body: hotPost.title,
      isRead: true,
      href: `/community?filter=hot&post=${hotPost.id}`,
      targetType: "post",
      targetId: hotPost.id,
      recommended: true,
      createdAt: minutesAgo(12),
    });
  }

  if (lecture) {
    items.push({
      id: `recommended-lecture-${lecture.id}`,
      userId,
      type: "lectureReaction",
      category: "activity",
      title: `${lecture.courseName} 리뷰가 몰리고 있어요`,
      body: `${lecture.professor} · 꿀강 점수 ${lecture.averageHoneyScore.toFixed(1)} · 리뷰 ${lecture.reviewCount}개`,
      isRead: true,
      href: `/lectures/${lecture.id}`,
      targetType: "lecture",
      targetId: lecture.id,
      recommended: true,
      createdAt: minutesAgo(28),
    });
  }

  if (tradePost) {
    items.push({
      id: `recommended-trade-${tradePost.id}`,
      userId,
      type: "tradeMatch",
      category: "activity",
      title: "수강신청 교환 글이 활발한 시간대예요",
      body: tradePost.note,
      isRead: true,
      href: "/trade",
      targetType: "trade",
      targetId: tradePost.id,
      recommended: true,
      createdAt: minutesAgo(44),
    });
  }

  if (schoolHotPost) {
    items.push({
      id: `recommended-school-${schoolHotPost.id}`,
      userId,
      type: "schoolRecommendation",
      category: "notice",
      title: `${schoolName ?? "우리학교"}에서 많이 보는 글`,
      body: schoolHotPost.title,
      isRead: true,
      href: "/school",
      targetType: "post",
      targetId: schoolHotPost.id,
      recommended: true,
      createdAt: minutesAgo(56),
    });
  }

  if (freshmanPost) {
    items.push({
      id: `recommended-freshman-${freshmanPost.id}`,
      userId,
      type: "freshmanTrending",
      category: "notice",
      title: "새내기존에서 질문이 활발해요",
      body: freshmanPost.title,
      isRead: true,
      href: "/school?tab=freshman",
      targetType: "post",
      targetId: freshmanPost.id,
      recommended: true,
      createdAt: minutesAgo(82),
    });
  }

  if (unansweredAdmission) {
    items.push({
      id: `recommended-admission-${unansweredAdmission.id}`,
      userId,
      type: "admissionUnanswered",
      category: "notice",
      title: "답변을 기다리는 입시 질문",
      body: unansweredAdmission.title,
      isRead: true,
      href: `/admission/${unansweredAdmission.id}`,
      targetType: "post",
      targetId: unansweredAdmission.id,
      recommended: true,
      createdAt: minutesAgo(110),
    });
  }

  items.push({
    id: "recommended-announcement-feed",
    userId,
    type: "announcement",
    category: "notice",
    title: "알림 탭에서 바로 이어서 보세요",
    body: "읽지 않은 반응과 추천 콘텐츠를 한 번에 정리해줍니다.",
    isRead: true,
    href: "/community",
    targetType: "system",
    recommended: true,
    createdAt: minutesAgo(140),
  });

  return items;
}

export function NotificationsPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const router = useRouter();
  const {
    currentUser,
    loading,
    isAuthenticated,
    notifications: runtimeNotifications,
    posts,
    comments,
    lectures,
    lectureReviews,
    tradePosts,
    refresh,
  } = useAppRuntime(initialSnapshot);
  const [tab, setTab] = useState<NotificationTab>("all");
  const [isPending, startTransition] = useTransition();
  const schoolName = getCurrentSchool()?.name;

  const actualItems = useMemo(
    () => getNotifications(currentUser.id),
    [currentUser.id, runtimeNotifications],
  );
  const recommendedItems = useMemo(
    () => buildRecommendedNotifications(currentUser.id, schoolName),
    [comments, currentUser.id, lectures, lectureReviews, posts, schoolName, tradePosts],
  );

  useEffect(() => {
    if (!isAuthenticated || !isSupabaseEnabled()) {
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser.id, isAuthenticated, refresh]);

  if (!loading && !isAuthenticated) {
    return (
      <AppShell title="알림">
        <AccountRequiredCard
          isAuthenticated={false}
          nextPath="/notifications"
          title="알림은 로그인 후 확인할 수 있습니다"
          description="댓글, 매칭, 학교 추천까지 한 번에 모아 보여줍니다."
        />
      </AppShell>
    );
  }

  const activityItems = actualItems.filter((item) => item.category === "activity");
  const noticeItems = actualItems.filter((item) => item.category === "notice");
  const unreadCount = actualItems.filter((item) => !item.isRead).length;
  const activityUnreadCount = activityItems.filter((item) => !item.isRead).length;
  const noticeUnreadCount = noticeItems.filter((item) => !item.isRead).length;

  const actualByTab: Record<NotificationTab, Notification[]> = {
    all: actualItems,
    activity: activityItems,
    notice: noticeItems,
  };

  const visibleItems = useMemo(() => {
    const baseItems = actualByTab[tab];
    const fallbackItems = recommendedItems
      .filter((item) => tab === "all" || item.category === (tab as NotificationCategory))
      .filter(
        (item) =>
          !baseItems.some(
            (baseItem) => baseItem.type === item.type && getNotificationHref(baseItem) === getNotificationHref(item),
          ),
      )
      .slice(0, Math.max(0, TAB_TARGET_SIZE[tab] - baseItems.length));

    return [...baseItems, ...fallbackItems];
  }, [actualByTab, recommendedItems, tab]);

  const handleOpen = (item: Notification) => {
    const href = getNotificationHref(item);
    if (!href) {
      return;
    }

    startTransition(() => {
      void (async () => {
        if (!item.isRead && !item.recommended) {
          try {
            await markNotificationRead(item.id);
          } catch {
            // noop
          }
        }
        router.push(href);
      })();
    });
  };

  const handleMarkAllRead = () => {
    startTransition(() => {
      void (async () => {
        await markAllNotificationsRead();
        await refresh();
      })();
    });
  };

  return (
    <AppShell
      title="알림"
      topAction={
        unreadCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={handleMarkAllRead}
          >
            <CheckCheck className="h-4 w-4" />
            전체 읽음
          </Button>
        ) : null
      }
    >
      {loading ? <LoadingState /> : null}
      <Card className="overflow-hidden border-white/80 bg-[linear-gradient(135deg,rgba(99,102,241,0.14),rgba(139,92,246,0.08),rgba(255,255,255,0.95))]">
        <CardContent className="space-y-4 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                Notification Center
              </p>
              <h2 className="mt-2 text-[22px] font-bold tracking-tight text-balance">
                읽지 않은 알림 {unreadCount}개
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                반응이 들어온 글, 학교 추천, 시스템 공지까지 바로 이어서 볼 수 있습니다.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/80 px-4 py-3 text-right shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                새 알림
              </p>
              <p className="mt-1 text-[30px] font-bold tracking-tight text-foreground">{unreadCount}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[22px] border border-white/80 bg-white/86 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">전체</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{actualItems.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/80 bg-white/86 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">활동</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{activityUnreadCount}</p>
            </div>
            <div className="rounded-[22px] border border-white/80 bg-white/86 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">공지</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{noticeUnreadCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Tabs value={tab} onValueChange={(next) => setTab(next as NotificationTab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="activity">활동</TabsTrigger>
          <TabsTrigger value="notice">공지</TabsTrigger>
        </TabsList>
        {(["all", "activity", "notice"] as const).map((tabValue) => {
          const tabItems =
            tabValue === tab
              ? visibleItems
              : [
                  ...actualByTab[tabValue],
                  ...recommendedItems
                    .filter(
                      (item) =>
                        tabValue === "all" || item.category === (tabValue as NotificationCategory),
                    )
                    .slice(0, Math.max(0, TAB_TARGET_SIZE[tabValue] - actualByTab[tabValue].length)),
                ];

          return (
            <TabsContent key={tabValue} value={tabValue} className="space-y-3">
              {tabItems.length === 0 ? (
                <EmptyState
                  title="새 알림이 없습니다"
                  description="활동이 시작되면 여기에서 바로 이어서 확인할 수 있습니다."
                  actionLabel="커뮤니티 둘러보기"
                  href="/community"
                />
              ) : (
                tabItems.map((item) => {
                  const meta = NOTIFICATION_META[item.type];
                  const Icon = meta.icon;
                  const href = getNotificationHref(item);
                  const highlightUnread = !item.isRead && !item.recommended;

                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        "overflow-hidden border-white/80 bg-white/94 transition-transform duration-200 hover:-translate-y-0.5",
                        highlightUnread ? "shadow-[0_24px_52px_-30px_rgba(79,70,229,0.34)]" : "shadow-[0_18px_44px_-32px_rgba(15,23,42,0.16)]",
                      )}
                    >
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => handleOpen(item)}
                        disabled={!href || isPending}
                      >
                        <CardContent className="flex gap-4 py-5">
                          <div
                            className={cn(
                              "flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]",
                              meta.iconClassName,
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant={item.recommended ? "outline" : meta.badgeVariant}>
                                    {item.recommended ? "추천" : meta.label}
                                  </Badge>
                                  {highlightUnread ? (
                                    <span className="text-[11px] font-semibold text-primary">읽지 않음</span>
                                  ) : null}
                                </div>
                                <p className="mt-3 text-[15px] font-semibold leading-6 text-balance text-foreground">
                                  {item.title}
                                </p>
                                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                                  {item.body}
                                </p>
                              </div>
                              {highlightUnread ? (
                                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                              ) : null}
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                              <span>{formatRelativeLabel(item.createdAt)}</span>
                              <span className="font-semibold text-primary">
                                {item.recommended ? "지금 보기" : "바로 이동"}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </button>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </AppShell>
  );
}
