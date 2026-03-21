"use client";

import {
  Bell,
  Home,
  MessageSquareText,
  School,
  UserCircle2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <nav className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.65rem)] left-1/2 z-30 w-[calc(100%-1rem)] max-w-[440px] -translate-x-1/2 rounded-[38px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,245,255,0.94))] px-2 py-2.5 shadow-[0_32px_84px_-34px_rgba(55,48,163,0.42)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/85" />
      <ul className="grid grid-cols-5 gap-0.5">
        {tabs.map((tab) => {
          const Icon = icons[tab.href];
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "group flex min-w-0 flex-col items-center gap-1.5 rounded-[22px] px-1 py-2 text-[10px] font-semibold leading-none text-muted-foreground transition-all",
                  active && "text-primary",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-[20px] bg-secondary/90 text-muted-foreground transition-all group-hover:bg-accent",
                    active &&
                      "bg-[linear-gradient(135deg,#3730a3_0%,#4f46e5_42%,#7c3aed_100%)] text-primary-foreground shadow-[0_18px_34px_-18px_rgba(79,70,229,0.9)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className={cn("truncate text-center leading-none transition-colors", active && "text-primary")}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mx-auto mt-1 h-1 w-16 rounded-full bg-slate-900/10" />
    </nav>
  );
}
