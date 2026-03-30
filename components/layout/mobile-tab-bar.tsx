"use client";

import { MouseEvent, useEffect } from "react";
import {
  Bell,
  Home,
  MessageSquareText,
  School,
  UserCircle2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { prewarmClientRuntimeSnapshots, type RuntimeSnapshotScope } from "@/lib/supabase/app-data";
import { cn } from "@/lib/utils";

const icons = {
  "/home": Home,
  "/community": MessageSquareText,
  "/school": School,
  "/notifications": Bell,
  "/profile": UserCircle2,
} as const;

const tabs = [
  { href: "/home", label: "홈" },
  { href: "/community", label: "커뮤니티" },
  { href: "/school", label: "우리학교" },
  { href: "/notifications", label: "알림" },
  { href: "/profile", label: "마이" },
] as const;

const AUTH_SENSITIVE_TABS = new Set(["/notifications", "/profile"]);
const TAB_RUNTIME_SCOPES: Record<(typeof tabs)[number]["href"], RuntimeSnapshotScope> = {
  "/home": "home",
  "/community": "community",
  "/school": "school",
  "/notifications": "notifications",
  "/profile": "profile",
};

export function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  function scrollActiveViewToTop() {
    const scrollRoots = Array.from(document.querySelectorAll<HTMLElement>("[data-app-scroll-root]"));

    if (scrollRoots.length > 0) {
      scrollRoots.forEach((element) => {
        element.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    if (document.scrollingElement) {
      document.scrollingElement.scrollTo({ top: 0, behavior: "smooth" });
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleTabClick(event: MouseEvent<HTMLAnchorElement>, active: boolean) {
    if (!active) {
      return;
    }

    event.preventDefault();
    scrollActiveViewToTop();
  }

  function prewarmTab(href: (typeof tabs)[number]["href"]) {
    const scope = TAB_RUNTIME_SCOPES[href];
    if (!scope || href === pathname) {
      return;
    }

    prewarmClientRuntimeSnapshots([scope], {
      key: `tab:${href}:${pathname}`,
      delayMs: 0,
    });
  }

  useEffect(() => {
    tabs.forEach((tab) => {
      if (tab.href !== pathname && !AUTH_SENSITIVE_TABS.has(tab.href)) {
        router.prefetch(tab.href);
      }
    });

    prewarmClientRuntimeSnapshots(
      tabs
        .filter((tab) => tab.href !== pathname && AUTH_SENSITIVE_TABS.has(tab.href))
        .map((tab) => TAB_RUNTIME_SCOPES[tab.href]),
      {
        key: `auth-tabs:${pathname}`,
        delayMs: 0,
      },
    );
  }, [pathname, router]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col justify-end overflow-hidden border-t border-white/10 bg-slate-950/96 pt-1 shadow-[0_-18px_42px_-28px_rgba(2,6,23,0.96)] backdrop-blur-xl md:left-1/2 md:w-full md:max-w-[440px] md:-translate-x-1/2 md:rounded-t-[26px] md:border md:border-b-0 md:shadow-[0_24px_60px_-30px_rgba(2,6,23,0.96)]"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <ul className="mx-auto grid w-full max-w-[440px] grid-cols-5 gap-1 px-2">
        {tabs.map((tab) => {
          const Icon = icons[tab.href];
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                prefetch={AUTH_SENSITIVE_TABS.has(tab.href) ? false : undefined}
                aria-current={active ? "page" : undefined}
                onClick={(event) => handleTabClick(event, active)}
                onTouchStart={() => prewarmTab(tab.href)}
                onMouseEnter={() => prewarmTab(tab.href)}
                className={cn(
                  "group relative flex min-w-0 flex-col items-center gap-1 rounded-[20px] px-1 py-1 text-[10px] font-medium leading-none text-slate-400 transition-all duration-150 active:scale-[0.97]",
                  active
                    ? "bg-[linear-gradient(180deg,rgba(99,102,241,0.16),rgba(79,70,229,0.08))] text-white"
                    : "hover:bg-white/[0.03]",
                )}
              >
                <span
                  className={cn(
                    "absolute inset-x-5 top-0 h-[3px] rounded-full bg-transparent transition-all duration-150",
                    active && "bg-indigo-400/90 shadow-[0_0_18px_rgba(129,140,248,0.55)]",
                  )}
                />
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition-all duration-150 group-hover:bg-white/5 group-hover:text-white",
                    active &&
                      "bg-[linear-gradient(135deg,rgba(79,70,229,0.28),rgba(99,102,241,0.52))] text-white shadow-[0_14px_26px_-18px_rgba(99,102,241,0.95)]",
                  )}
                >
                  <Icon className="h-[17px] w-[17px]" />
                </span>
                <span
                  className={cn(
                    "truncate text-center leading-none transition-colors",
                    active ? "font-semibold text-white" : "text-slate-400",
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
