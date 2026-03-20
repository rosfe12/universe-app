"use client";

import {
  GraduationCap,
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
  "/admission": GraduationCap,
  "/school": School,
  "/community": MessageSquareText,
  "/profile": UserCircle2,
} as const;

const tabs = [
  { href: "/home", label: "홈" },
  { href: "/admission", label: "입시" },
  { href: "/school", label: "우리학교" },
  { href: "/community", label: "커뮤니티" },
  { href: "/profile", label: "마이" },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.55rem)] left-1/2 z-30 w-[calc(100%-1.4rem)] max-w-[398px] -translate-x-1/2 rounded-[32px] border border-white/85 bg-white/88 px-2 py-2 shadow-[0_28px_70px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/85" />
      <ul className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = icons[tab.href];
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "group flex flex-col items-center gap-1 rounded-[22px] px-1.5 py-2.5 text-[10.5px] font-semibold text-muted-foreground transition-all",
                  active && "text-primary",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-[18px] bg-secondary/75 text-muted-foreground transition-all group-hover:bg-secondary",
                    active &&
                      "bg-primary text-primary-foreground shadow-[0_16px_28px_-18px_rgba(21,128,61,0.9)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className={cn("transition-colors", active && "text-primary")}>
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
