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
    <nav className="fixed bottom-3 left-1/2 z-30 w-[calc(100%-1.25rem)] max-w-[408px] -translate-x-1/2 rounded-[28px] border border-white/10 bg-slate-950/82 px-2 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.95)] backdrop-blur-xl">
      <ul className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = icons[tab.href];
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "group flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium leading-none text-slate-400 transition-all",
                  active && "text-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition-all duration-150 group-hover:bg-white/5 group-hover:text-white",
                    active &&
                      "bg-[linear-gradient(135deg,rgba(79,70,229,0.22),rgba(99,102,241,0.42))] text-white shadow-[0_14px_26px_-18px_rgba(99,102,241,0.95)]",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className={cn("truncate text-center leading-none transition-colors", active && "text-white")}>
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
