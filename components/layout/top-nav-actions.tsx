"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { CircleUserRound, MessagesSquare, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import type { AppRuntimeSnapshot } from "@/types";

const SearchDialogPanel = dynamic(
  () =>
    import("@/components/layout/search-dialog-panel").then(
      (mod) => mod.SearchDialogPanel,
    ),
  { ssr: false },
);

function isMessageNotification(type: string) {
  return (
    type === "comment" ||
    type === "reply" ||
    type === "admissionAnswer" ||
    type === "tradeMatch"
  );
}

export function TopNavActions() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const runtimeSnapshot = getRuntimeSnapshot() as AppRuntimeSnapshot;
  const badgeSnapshot = runtimeSnapshot;
  const authSnapshot = runtimeSnapshot;
  const searchSnapshot = runtimeSnapshot;
  const badgeUserId = authSnapshot.isAuthenticated ? authSnapshot.currentUser.id : null;
  const unreadMessageCount = useMemo(
    () =>
      badgeSnapshot.notifications.filter(
        (item) =>
          item.userId === badgeUserId &&
          !item.isRead &&
          isMessageNotification(item.type),
      ).length,
    [badgeSnapshot.notifications, badgeUserId],
  );

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const profileHref =
    hydrated && authSnapshot.isAuthenticated ? `/profile/${authSnapshot.currentUser.id}` : "/profile";

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="검색"
          onClick={() => setOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>
        <Button asChild size="icon" variant="ghost" aria-label="메시지">
          <Link href="/messages" className="relative">
            <MessagesSquare className="h-5 w-5" />
            {unreadMessageCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold leading-4 text-white">
                {Math.min(unreadMessageCount, 9)}
              </span>
            ) : null}
          </Link>
        </Button>
        <Button asChild size="icon" variant="ghost" aria-label="프로필">
          <Link href={profileHref}>
            <CircleUserRound className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      {open ? (
        <SearchDialogPanel
          query={query}
          onQueryChange={setQuery}
          onOpenChange={setOpen}
          initialSnapshot={searchSnapshot}
        />
      ) : null}
    </>
  );
}
