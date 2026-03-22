"use client";

import { useEffect, useState } from "react";

import { getRuntimeSnapshot, setRuntimeSnapshot } from "@/lib/runtime-state";
import { createClient } from "@/lib/supabase/client";
import {
  isSupabaseEnabled,
  loadClientRuntimeSnapshot,
  type RuntimeSnapshotScope,
} from "@/lib/supabase/app-data";
import type { AppRuntimeSnapshot } from "@/types";

export function useAppRuntime(
  initialSnapshot?: AppRuntimeSnapshot,
  scope: RuntimeSnapshotScope = "full",
) {
  const seedSnapshot = initialSnapshot ?? getRuntimeSnapshot();
  const [snapshot, setSnapshot] = useState<AppRuntimeSnapshot>(() => seedSnapshot);
  const [loading, setLoading] = useState(
    !initialSnapshot && seedSnapshot.source === "mock",
  );

  useEffect(() => {
    if (!initialSnapshot) {
      return;
    }

    setSnapshot(initialSnapshot);
    setRuntimeSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  useEffect(() => {
    setRuntimeSnapshot(snapshot);
  }, [snapshot]);

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

    if (initialSnapshot) {
      setLoading(false);
    } else {
      void bootstrap(true);
    }

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      await bootstrap(false, true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [initialSnapshot, scope]);

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
