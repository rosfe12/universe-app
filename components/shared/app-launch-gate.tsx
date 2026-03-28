"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
    const bootSplash = document.getElementById("app-boot-splash");
    if (!bootSplash) {
      return;
    }

    if (phase === "done") {
      bootSplash.setAttribute("aria-hidden", "true");
      bootSplash.classList.add("pointer-events-none");
      bootSplash.style.opacity = "0";
      window.setTimeout(() => {
        bootSplash.style.display = "none";
      }, EXIT_TRANSITION_MS);
      return;
    }

    bootSplash.style.display = "flex";
    bootSplash.style.opacity = phase === "exit" ? "0" : "1";
    bootSplash.classList.toggle("pointer-events-none", phase === "exit");
    bootSplash.setAttribute("aria-hidden", phase === "exit" ? "true" : "false");
  }, [phase]);

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
    </>
  );
}
