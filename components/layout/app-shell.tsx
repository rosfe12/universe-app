"use client";

import { ReactNode, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { TopNavActions } from "@/components/layout/top-nav-actions";
import { RuntimeSetupNotice } from "@/components/shared/runtime-setup-notice";

export function AppShell({
  children,
  title,
  showTabs = true,
  topAction,
  showTopNavActions = true,
  desktopWide = false,
  onPullToRefresh,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showTabs?: boolean;
  topAction?: ReactNode;
  showTopNavActions?: boolean;
  desktopWide?: boolean;
  onPullToRefresh?: (() => Promise<unknown> | unknown) | null;
}) {
  const pullStartYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const pullEnabled = Boolean(onPullToRefresh);

  async function handlePullRefresh() {
    if (!onPullToRefresh || isPullRefreshing) {
      setPullDistance(0);
      return;
    }

    setIsPullRefreshing(true);
    setPullDistance(56);
    try {
      await onPullToRefresh();
    } finally {
      setIsPullRefreshing(false);
      setPullDistance(0);
    }
  }

  return (
    <div className="app-page-backdrop h-[100dvh] overflow-hidden md:px-4 md:py-5">
      <div
        className={`app-shell-surface mx-auto flex h-[100dvh] min-w-0 flex-col overflow-hidden md:h-[calc(100vh-2.5rem)] md:rounded-[36px] ${
          desktopWide ? "max-w-[440px] md:max-w-[1240px]" : "max-w-[440px]"
        }`}
      >
        <header className="app-header-surface app-header-safe-cover sticky top-0 z-20 shrink-0 border-b border-white/10 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-indigo-500 dark:text-indigo-300">
                CAMVERSE
              </p>
              <h1 className="app-header-title mt-2 text-[28px] font-bold leading-[0.96] tracking-[-0.04em] text-balance sm:text-[30px]">
                {title}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {topAction}
              {showTopNavActions ? <TopNavActions /> : null}
            </div>
          </div>
        </header>
        <main
          data-app-scroll-root
          className={`flex-1 min-h-0 space-y-7 overflow-y-auto overscroll-contain px-4 ${
            showTabs
              ? "pb-[calc(env(safe-area-inset-bottom)+4.55rem)]"
              : "pb-5"
          } pt-5 ${
            desktopWide ? "md:px-6" : ""
          }`}
          onTouchStart={(event) => {
            if (!pullEnabled || isPullRefreshing || event.currentTarget.scrollTop > 0) {
              pullStartYRef.current = null;
              return;
            }

            pullStartYRef.current = event.touches[0]?.clientY ?? null;
          }}
          onTouchMove={(event) => {
            if (!pullEnabled || isPullRefreshing || pullStartYRef.current === null) {
              return;
            }

            if (event.currentTarget.scrollTop > 0) {
              setPullDistance(0);
              return;
            }

            const currentY = event.touches[0]?.clientY ?? pullStartYRef.current;
            const deltaY = currentY - pullStartYRef.current;

            if (deltaY <= 0) {
              setPullDistance(0);
              return;
            }

            setPullDistance(Math.min(78, deltaY * 0.42));
          }}
          onTouchEnd={() => {
            if (!pullEnabled || isPullRefreshing) {
              pullStartYRef.current = null;
              return;
            }

            const shouldRefresh = pullDistance >= 52;
            pullStartYRef.current = null;

            if (shouldRefresh) {
              void handlePullRefresh();
              return;
            }

            setPullDistance(0);
          }}
          onTouchCancel={() => {
            pullStartYRef.current = null;
            if (!isPullRefreshing) {
              setPullDistance(0);
            }
          }}
        >
          {pullEnabled ? (
            <div
              className="sticky top-0 z-10 -mb-2 flex justify-center overflow-hidden transition-[height,opacity] duration-200"
              style={{
                height:
                  pullDistance > 0 || isPullRefreshing
                    ? `${Math.max(pullDistance, isPullRefreshing ? 56 : 0)}px`
                    : "0px",
                opacity: pullDistance > 0 || isPullRefreshing ? 1 : 0,
              }}
            >
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white/80 backdrop-blur">
                <RefreshCw className={`h-3.5 w-3.5 ${isPullRefreshing ? "animate-spin" : ""}`} />
                {isPullRefreshing ? "새로고침 중" : pullDistance >= 52 ? "놓으면 새로고침" : "당겨서 새로고침"}
              </div>
            </div>
          ) : null}
          <RuntimeSetupNotice />
          {children}
        </main>
      </div>
      {showTabs ? <MobileTabBar /> : null}
    </div>
  );
}
