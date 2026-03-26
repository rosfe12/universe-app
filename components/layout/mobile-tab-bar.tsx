"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    tabs.forEach((tab) => {
      if (tab.href !== pathname) {
        router.prefetch(tab.href);
      }
    });
  }, [pathname, router]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/94 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-[0_-18px_40px_-28px_rgba(2,6,23,0.92)] backdrop-blur-xl">
      <ul className="mx-auto grid w-full max-w-[440px] grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = icons[tab.href];
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex min-w-0 flex-col items-center gap-1 rounded-[22px] px-1 py-2 text-[10px] font-medium leading-none text-slate-400 transition-all duration-150 active:scale-[0.97]",
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
                    "flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition-all duration-150 group-hover:bg-white/5 group-hover:text-white",
                    active &&
                      "bg-[linear-gradient(135deg,rgba(79,70,229,0.28),rgba(99,102,241,0.52))] text-white shadow-[0_14px_26px_-18px_rgba(99,102,241,0.95)]",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
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
