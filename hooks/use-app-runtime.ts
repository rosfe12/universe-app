"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";

import { getRuntimeSnapshot, setRuntimeSnapshot } from "@/lib/runtime-state";
import {
  clearSupabaseSessionStorage,
  createClient,
  ensureSupabaseSessionReady,
  getCurrentSupabaseAuthUser,
  hasSupabaseAuthCookie,
  hasPersistedSupabaseSession,
  persistSupabaseSession,
  shouldClearNonPersistentSession,
} from "@/lib/supabase/client";
import {
  isSupabaseEnabled,
  loadClientRuntimeSnapshot,
  peekClientRuntimeSnapshot,
  prewarmClientRuntimeSnapshots,
  type RuntimeSnapshotScope,
} from "@/lib/supabase/app-data";
import { logPerformanceEvent } from "@/lib/ops";
import type { AppRuntimeSnapshot } from "@/types";

function getPrewarmScopes(
  scope: RuntimeSnapshotScope,
  isAuthenticated: boolean,
): RuntimeSnapshotScope[] {
  if (!isAuthenticated) {
    switch (scope) {
      case "home":
        return ["community", "school"];
      case "community":
        return ["home"];
      case "school":
        return ["home", "community"];
      default:
        return [];
    }
  }

  switch (scope) {
    case "home":
      return ["community", "school"];
    case "community":
      return ["home", "school"];
    case "school":
      return ["home", "community", "trade"];
    case "trade":
      return ["messages", "school"];
    case "messages":
      return ["notifications", "trade"];
    case "notifications":
      return ["messages"];
    case "profile":
      return [];
    default:
      return [];
  }
}

export function useAppRuntime(
  initialSnapshot?: AppRuntimeSnapshot,
  scope: RuntimeSnapshotScope = "full",
) {
  const scopedSnapshot = initialSnapshot ?? peekClientRuntimeSnapshot(scope);
  const seedSnapshot = scopedSnapshot ?? getRuntimeSnapshot();
  const mountedAtRef = useRef(typeof performance !== "undefined" ? performance.now() : Date.now());
  const [snapshot, setSnapshotState] = useState<AppRuntimeSnapshot>(() => seedSnapshot);
  const [loading, setLoading] = useState(!initialSnapshot && !scopedSnapshot);
  const setSnapshot = useCallback((nextValue: SetStateAction<AppRuntimeSnapshot>) => {
    setSnapshotState((currentSnapshot) => {
      const nextSnapshot =
        typeof nextValue === "function"
          ? (nextValue as (snapshot: AppRuntimeSnapshot) => AppRuntimeSnapshot)(currentSnapshot)
          : nextValue;
      setRuntimeSnapshot(nextSnapshot);
      return nextSnapshot;
    });
  }, []);

  useEffect(() => {
    if (!initialSnapshot) {
      return;
    }

    setSnapshot(initialSnapshot);
  }, [initialSnapshot, setSnapshot]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    logPerformanceEvent("runtime.client.render_ready", {
      scope,
      durationMs: Math.round(now - mountedAtRef.current),
      source: snapshot.source,
      postCount: snapshot.posts.length,
      commentCount: snapshot.comments.length,
      lectureCount: snapshot.lectures.length,
      notificationCount: snapshot.notifications.length,
    });
  }, [loading, scope, snapshot.comments.length, snapshot.lectures.length, snapshot.notifications.length, snapshot.posts.length, snapshot.source]);

  useEffect(() => {
    let active = true;

    async function bootstrap(showLoading: boolean, force = false) {
      if (showLoading) {
        setLoading(true);
      }
      const nextSnapshot = await loadClientRuntimeSnapshot({ force, scope });
      if (!active) return;
      setSnapshot(nextSnapshot);
      setLoading(false);
    }

    if (!isSupabaseEnabled()) {
      if (initialSnapshot) {
        setLoading(false);
      } else {
        void bootstrap(true);
      }
      return () => {
        active = false;
      };
    }

    const supabase = createClient();
    void (async () => {
      if (shouldClearNonPersistentSession()) {
        clearSupabaseSessionStorage();
      }

      await ensureSupabaseSessionReady();

      if (!active) {
        return;
      }

      if (initialSnapshot) {
        if (!initialSnapshot.isAuthenticated) {
          if (hasPersistedSupabaseSession() || hasSupabaseAuthCookie()) {
            setLoading(true);
          }
          let user = await getCurrentSupabaseAuthUser();

          for (let attempt = 0; !user && attempt < 5; attempt += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 150));
            if (!active) {
              return;
            }
            user = await getCurrentSupabaseAuthUser(true);
          }

          if (!active) {
            return;
          }

          if (user) {
            await bootstrap(false, true);
            return;
          }

          if (typeof window !== "undefined" && hasSupabaseAuthCookie()) {
            const recoveryKey = `univers-auth-recovery:${scope}:${window.location.pathname}${window.location.search}`;
            if (window.sessionStorage.getItem(recoveryKey) !== "true") {
              window.sessionStorage.setItem(recoveryKey, "true");
              window.location.replace(window.location.href);
              return;
            }
            window.sessionStorage.removeItem(recoveryKey);
          }
        }

        setLoading(false);
        return;
      }

      await bootstrap(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "INITIAL_SESSION" || session) {
        persistSupabaseSession(session ?? null);
      }

      if (event === "INITIAL_SESSION") {
        return;
      }

      // Avoid awaiting Supabase auth-bound queries inside the auth callback.
      window.setTimeout(() => {
        if (!active) {
          return;
        }

        void bootstrap(false, true);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [initialSnapshot, scope, setSnapshot]);

  useEffect(() => {
    if (loading || snapshot.source !== "supabase") {
      return;
    }

    const scopes = getPrewarmScopes(scope, snapshot.isAuthenticated);
    if (scopes.length === 0) {
      return;
    }

    prewarmClientRuntimeSnapshots(
      scopes.filter((candidate) => candidate !== scope),
      {
        key: `${snapshot.isAuthenticated ? "auth" : "guest"}:${snapshot.currentUser.id}:${scope}`,
      },
    );
  }, [loading, scope, snapshot.currentUser.id, snapshot.isAuthenticated, snapshot.source]);

  return {
    snapshot,
    ...snapshot,
    loading,
    setSnapshot,
    refresh: async () => {
      const nextSnapshot = await loadClientRuntimeSnapshot({ force: true, scope });
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    },
  };
}
