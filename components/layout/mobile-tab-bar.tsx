"use client";

import { MouseEvent, useCallback, useEffect, useRef } from "react";
import {
  Bell,
  Home,
  MessageSquareText,
  School,
  UserCircle2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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

export function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const prefetchedRef = useRef<Set<string>>(new Set());

  const prefetchTab = useCallback((href: string) => {
    if (prefetchedRef.current.has(href)) {
      return;
    }

    prefetchedRef.current.add(href);
    router.prefetch(href);
  }, [router]);

  const primeTabs = useCallback((activeHref?: string) => {
    tabs.forEach((tab) => {
      if (tab.href === activeHref) {
        return;
      }

      prefetchTab(tab.href);
    });
  }, [prefetchTab]);

  useEffect(() => {
    const runPrefetch = () => {
      primeTabs(pathname);
    };

    const frame = window.requestAnimationFrame(() => {
      runPrefetch();
    });
    const idleCallback = window.requestIdleCallback?.(
      () => {
        runPrefetch();
      },
      { timeout: 120 },
    );

    return () => {
      window.cancelAnimationFrame(frame);
      if (idleCallback) {
        window.cancelIdleCallback?.(idleCallback);
      }
    };
  }, [pathname, primeTabs]);

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

  function handleTabClick(event: MouseEvent<HTMLAnchorElement>, isRootPage: boolean) {
    if (!isRootPage) {
      return;
    }

    event.preventDefault();
    scrollActiveViewToTop();
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/96 shadow-[0_-18px_42px_-28px_rgba(2,6,23,0.96)] backdrop-blur-xl"
    >
      <ul
        className="mx-auto grid w-full max-w-[440px] grid-cols-5 gap-0 px-1"
        style={{
          height: "calc(4.4rem + env(safe-area-inset-bottom))",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {tabs.map((tab) => {
          const Icon = icons[tab.href];
          const isRootPage = pathname === tab.href;
          const active = isRootPage || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                onClick={(event) => handleTabClick(event, isRootPage)}
                onPointerDown={() => primeTabs(tab.href)}
                onTouchStart={() => primeTabs(tab.href)}
                onMouseEnter={() => primeTabs(tab.href)}
                onFocus={() => primeTabs(tab.href)}
                className={cn(
                  "group relative flex h-full min-w-0 flex-col items-center justify-end gap-1 rounded-[18px] px-1 pb-2 pt-1 text-[10px] font-medium leading-none text-slate-400 transition-all duration-150 active:scale-[0.97]",
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
