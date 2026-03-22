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
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showTabs?: boolean;
  topAction?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white md:px-4 md:py-5">
      <div className="mx-auto flex min-h-screen max-w-[440px] flex-col bg-white md:min-h-[calc(100vh-2.5rem)] md:rounded-[32px] md:border md:border-gray-100">
        <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-4 pb-4 pt-4 backdrop-blur supports-[backdrop-filter]:bg-white/90">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-tight text-indigo-600">
                유니버스
              </p>
              <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-balance text-gray-900">{title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {topAction}
              <TopNavActions />
            </div>
          </div>
        </header>
        <main className="flex-1 space-y-6 px-4 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] pt-5">
          <RuntimeSetupNotice />
          {children}
        </main>
        <div className="px-4 pb-4">
          <AppFooterLinks />
        </div>
        {showTabs ? <MobileTabBar /> : null}
      </div>
    </div>
  );
}
