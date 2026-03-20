"use client";

import { useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AccountRequiredCard } from "@/components/shared/account-required-card";
import { LoadingState } from "@/components/shared/loading-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { currentUser, getNotifications } from "@/lib/mock-queries";
import { formatRelativeLabel } from "@/lib/utils";
import type { AppRuntimeSnapshot } from "@/types";

export function NotificationsPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const { loading, isAuthenticated } = useAppRuntime(initialSnapshot);
  const [tab, setTab] = useState("all");
  const items = getNotifications(currentUser.id);
  const filtered =
    tab === "unread" ? items.filter((item) => !item.isRead) : items;

  if (!loading && !isAuthenticated) {
    return (
      <AppShell title="알림" subtitle="로그인 후 내 반응 알림을 확인할 수 있습니다">
        <AccountRequiredCard
          isAuthenticated={false}
          nextPath="/notifications"
          title="알림은 로그인 후 확인할 수 있습니다"
          description="댓글 알림, 매칭 알림, 활동 알림은 계정이 있어야 쌓입니다."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="알림" subtitle="내 글 반응, 답변, 매칭 관심도를 확인하세요">
      {loading ? <LoadingState /> : null}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="unread">읽지 않음</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-3 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  </div>
                  <Badge variant={item.isRead ? "outline" : "success"}>
                    {item.isRead ? "읽음" : "새 알림"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeLabel(item.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
