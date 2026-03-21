"use client";

import {
  BriefcaseBusiness,
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
  "/community": MessageSquareText,
  "/school": School,
  "/admission": GraduationCap,
  "/career": BriefcaseBusiness,
  "/profile": UserCircle2,
} as const;

const tabs = [
  { href: "/home", label: "홈" },
  { href: "/community", label: "커뮤니티" },
  { href: "/school", label: "우리학교" },
  { href: "/admission", label: "입시" },
  { href: "/career", label: "취업" },
  { href: "/profile", label: "마이" },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.65rem)] left-1/2 z-30 w-[calc(100%-1rem)] max-w-[440px] -translate-x-1/2 rounded-[36px] border border-white/90 bg-white/92 px-2 py-2.5 shadow-[0_30px_80px_-34px_rgba(79,70,229,0.38)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/85" />
      <ul className="grid grid-cols-6 gap-0.5">
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
                    "flex h-10 w-10 items-center justify-center rounded-[18px] bg-secondary/90 text-muted-foreground transition-all group-hover:bg-accent",
                    active &&
                      "bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] text-primary-foreground shadow-[0_18px_30px_-18px_rgba(99,102,241,0.9)]",
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
