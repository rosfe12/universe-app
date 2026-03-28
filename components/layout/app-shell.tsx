import { ReactNode } from "react";

import { AppFooterLinks } from "@/components/layout/app-footer-links";
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
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showTabs?: boolean;
  topAction?: ReactNode;
  showTopNavActions?: boolean;
  desktopWide?: boolean;
}) {
  return (
    <div className="app-page-backdrop min-h-[100dvh] md:px-4 md:py-5">
      <div
        className={`app-shell-surface mx-auto flex min-h-[100dvh] flex-col md:min-h-[calc(100vh-2.5rem)] md:rounded-[36px] ${
          desktopWide ? "max-w-[440px] md:max-w-[1240px]" : "max-w-[440px]"
        }`}
      >
        <header className="app-header-surface sticky top-0 z-20 border-b border-white/10 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4">
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
          className={`flex-1 space-y-7 px-4 pb-[calc(env(safe-area-inset-bottom)+6.75rem)] pt-5 ${
            desktopWide ? "md:px-6" : ""
          }`}
        >
          <RuntimeSetupNotice />
          {children}
        </main>
        <div
          className={`px-4 pt-2 ${showTabs ? "pb-[calc(env(safe-area-inset-bottom)+6rem)]" : "pb-4"}`}
        >
          <AppFooterLinks />
        </div>
      </div>
      {showTabs ? <MobileTabBar /> : null}
    </div>
  );
}
