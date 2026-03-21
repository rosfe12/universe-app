import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

import { AppFooterLinks } from "@/components/layout/app-footer-links";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { RuntimeSetupNotice } from "@/components/shared/runtime-setup-notice";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  title,
  subtitle,
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_28%),radial-gradient(circle_at_24%_0%,_rgba(168,85,247,0.12),_transparent_24%),linear-gradient(180deg,#f7f8ff_0%,#ffffff_48%)] md:px-4 md:py-5">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col overflow-hidden bg-background/95 md:min-h-[calc(100vh-2.5rem)] md:rounded-[42px] md:border md:border-white/80 md:shadow-[0_32px_90px_-44px_rgba(79,70,229,0.3)]">
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-20 rounded-full bg-slate-900/8" />
        </div>
        <header className="sticky top-0 z-20 border-b border-white/80 bg-background/92 px-5 pb-4 pt-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/82">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                유니버스
              </p>
              <h1 className="mt-1 text-[24px] font-bold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground/95">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {topAction}
              <Button asChild size="icon" variant="secondary" className="border border-white/70 bg-white/92">
                <Link href="/notifications" aria-label="알림">
                  <Bell className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="icon" variant="secondary" aria-label="검색" className="border border-white/70 bg-white/92">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 space-y-6 px-5 pb-[calc(env(safe-area-inset-bottom)+8.75rem)] pt-5">
          <RuntimeSetupNotice />
          {children}
        </main>
        <div className="px-5 pb-4">
          <AppFooterLinks />
        </div>
        {showTabs ? <MobileTabBar /> : null}
      </div>
    </div>
  );
}
