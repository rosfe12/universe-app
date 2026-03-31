"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { RuntimeSnapshotScope } from "@/lib/supabase/app-data";

const MIN_LAUNCH_SCREEN_MS = 320;
const PRELOAD_DEADLINE_MS = 700;
const EXIT_TRANSITION_MS = 160;

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
    return [];
  }

  if (pathname === "/community" || pathname.startsWith("/community/")) {
    return [];
  }

  if (pathname === "/school" || pathname.startsWith("/school/")) {
    return [];
  }

  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) {
    return [];
  }

  if (pathname === "/messages" || pathname.startsWith("/messages/")) {
    return [];
  }

  if (pathname === "/trade" || pathname.startsWith("/trade/")) {
    return [];
  }

  if (pathname === "/dating" || pathname.startsWith("/dating/")) {
    return [];
  }

  if (pathname === "/lectures") {
    return [];
  }

  if (pathname.startsWith("/lectures/")) {
    return [];
  }

  if (pathname === "/profile") {
    return [];
  }

  if (pathname.startsWith("/profile/")) {
    return [];
  }

  if (pathname === "/login") {
    return ["chrome"];
  }

  if (pathname === "/onboarding") {
    return ["chrome"];
  }

  if (pathname === "/invite") {
    return ["chrome"];
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return [];
  }

  return [];
}

async function preloadLaunchData(scopes: RuntimeSnapshotScope[]) {
  const [{ ensureSupabaseSessionReady }, { loadClientRuntimeSnapshot }] = await Promise.all([
    import("@/lib/supabase/client"),
    import("@/lib/supabase/app-data"),
  ]);

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
  const launchCompletedRef = useRef(!launchEnabled);
  const initialLaunchConfigRef = useRef({
    launchEnabled,
    preloadScopes,
  });

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
    if (launchCompletedRef.current || !initialLaunchConfigRef.current.launchEnabled) {
      launchCompletedRef.current = true;
      setPhase("done");
      return;
    }

    let cancelled = false;
    setPhase("loading");

    void (async () => {
      const preloadTask = preloadLaunchData(initialLaunchConfigRef.current.preloadScopes);

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
  }, []);

  return (
    <>
      {children}
    </>
  );
}
