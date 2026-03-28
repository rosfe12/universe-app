"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { ensureSupabaseSessionReady } from "@/lib/supabase/client";
import {
  loadClientRuntimeSnapshot,
  type RuntimeSnapshotScope,
} from "@/lib/supabase/app-data";

const MIN_LAUNCH_SCREEN_MS = 2400;
const PRELOAD_DEADLINE_MS = 3400;
const EXIT_TRANSITION_MS = 220;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizePathname(pathname: string | null) {
  if (!pathname || pathname === "/") {
    return "/home";
  }

  return pathname;
}

function getLaunchPreloadScopes(pathname: string): RuntimeSnapshotScope[] {
  if (pathname === "/home" || pathname.startsWith("/home/")) {
    return ["home", "chrome"];
  }

  if (pathname === "/community" || pathname.startsWith("/community/")) {
    return ["community", "chrome"];
  }

  if (pathname === "/school" || pathname.startsWith("/school/")) {
    return ["school", "chrome"];
  }

  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) {
    return ["notifications", "chrome"];
  }

  if (pathname === "/messages" || pathname.startsWith("/messages/")) {
    return ["messages", "chrome"];
  }

  if (pathname === "/trade" || pathname.startsWith("/trade/")) {
    return ["trade", "chrome"];
  }

  if (pathname === "/dating" || pathname.startsWith("/dating/")) {
    return ["dating", "chrome"];
  }

  if (pathname === "/lectures") {
    return ["lectures", "chrome"];
  }

  if (pathname.startsWith("/lectures/")) {
    return ["full"];
  }

  if (pathname === "/profile") {
    return ["profile", "chrome"];
  }

  if (pathname.startsWith("/profile/")) {
    return ["chrome"];
  }

  if (pathname === "/login") {
    return ["chrome"];
  }

  if (pathname === "/onboarding") {
    return ["full"];
  }

  if (pathname === "/invite") {
    return ["chrome"];
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return ["admin"];
  }

  return [];
}

async function preloadLaunchData(scopes: RuntimeSnapshotScope[]) {
  try {
    await ensureSupabaseSessionReady();
  } catch {}

  if (scopes.length === 0) {
    return;
  }

  await Promise.allSettled(
    scopes.map((scope) => loadClientRuntimeSnapshot({ scope })),
  );
}

export function AppLaunchGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const normalizedPathname = useMemo(
    () => normalizePathname(pathname),
    [pathname],
  );
  const preloadScopes = useMemo(
    () => getLaunchPreloadScopes(normalizedPathname),
    [normalizedPathname],
  );
  const launchEnabled = preloadScopes.length > 0;
  const [phase, setPhase] = useState<"loading" | "exit" | "done">(
    launchEnabled ? "loading" : "done",
  );
  const launchStartedRef = useRef(false);
  const launchCompletedRef = useRef(!launchEnabled);

  useEffect(() => {
    if (!launchEnabled) {
      launchCompletedRef.current = true;
      setPhase("done");
      return;
    }

    if (launchCompletedRef.current || launchStartedRef.current) {
      return;
    }

    let cancelled = false;
    launchStartedRef.current = true;
    setPhase("loading");

    void (async () => {
      const preloadTask = preloadLaunchData(preloadScopes);

      await Promise.all([
        wait(MIN_LAUNCH_SCREEN_MS),
        Promise.race([preloadTask, wait(PRELOAD_DEADLINE_MS)]),
      ]);

      if (cancelled) {
        return;
      }

      setPhase("exit");
      await wait(EXIT_TRANSITION_MS);

      if (cancelled) {
        return;
      }

      launchCompletedRef.current = true;
      setPhase("done");
    })();

    return () => {
      cancelled = true;
    };
  }, [launchEnabled, preloadScopes]);

  return (
    <>
      {children}
      {phase !== "done" ? (
        <div
          className={`app-page-backdrop fixed inset-0 z-[120] flex min-h-[100dvh] items-center justify-center px-5 py-10 transition-opacity duration-200 ${
            phase === "exit" ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="app-shell-surface flex w-full max-w-[440px] flex-col items-center justify-center gap-5 rounded-[36px] px-8 py-16 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 shadow-[0_22px_48px_-28px_rgba(99,102,241,0.85)]">
              <Image
                src="/icons/icon-192.png"
                alt="CAMVERSE"
                width={72}
                height={72}
                priority
                className="h-[72px] w-[72px] rounded-[22px]"
              />
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.26em] text-indigo-500 dark:text-indigo-300">
              CAMVERSE
            </p>
            <p className="text-sm text-muted-foreground">캠퍼스를 연결하다</p>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/8">
              <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,rgba(99,102,241,0.45),rgba(129,140,248,0.95),rgba(56,189,248,0.65))]" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
