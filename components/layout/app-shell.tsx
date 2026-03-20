import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.14),_transparent_28%),radial-gradient(circle_at_20%_0%,_rgba(34,197,94,0.12),_transparent_24%),linear-gradient(180deg,#fffdf7_0%,#ffffff_45%)] md:px-4 md:py-5">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col overflow-hidden bg-background/95 md:min-h-[calc(100vh-2.5rem)] md:rounded-[42px] md:border md:border-white/70 md:shadow-soft">
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-20 rounded-full bg-slate-900/10" />
        </div>
        <header className="sticky top-0 z-20 border-b border-white/70 bg-background/94 px-5 pb-4 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/84">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                유니버스
              </p>
              <h1 className="mt-1 text-[22px] font-semibold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {topAction}
              <Button asChild size="icon" variant="ghost">
                <Link href="/notifications" aria-label="알림">
                  <Bell className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="icon" variant="ghost" aria-label="검색">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 space-y-5 px-5 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-5">
          <RuntimeSetupNotice />
          {children}
        </main>
        {showTabs ? <MobileTabBar /> : null}
      </div>
    </div>
  );
}
