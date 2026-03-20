"use client";

import { useEffect, useState } from "react";

import { getRuntimeSnapshot, setRuntimeSnapshot } from "@/lib/runtime-state";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseEnabled, loadClientRuntimeSnapshot } from "@/lib/supabase/app-data";
import type { AppRuntimeSnapshot } from "@/types";

export function useAppRuntime(initialSnapshot?: AppRuntimeSnapshot) {
  const seedSnapshot = initialSnapshot ?? getRuntimeSnapshot();

  if (initialSnapshot) {
    setRuntimeSnapshot(initialSnapshot);
  }

  const [snapshot, setSnapshot] = useState<AppRuntimeSnapshot>(() => seedSnapshot);
  const [loading, setLoading] = useState(
    !initialSnapshot && seedSnapshot.source === "mock",
  );

  useEffect(() => {
    setRuntimeSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setLoading(true);
      const nextSnapshot = await loadClientRuntimeSnapshot();
      if (!active) return;
      setSnapshot(nextSnapshot);
      setLoading(false);
    }

    if (initialSnapshot) {
      setLoading(false);
    } else {
      bootstrap();
    }

    if (!isSupabaseEnabled()) {
      return () => {
        active = false;
      };
    }

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      const nextSnapshot = await loadClientRuntimeSnapshot();
      if (!active) return;
      setSnapshot(nextSnapshot);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [initialSnapshot]);

  return {
    ...snapshot,
    loading,
    setSnapshot,
    refresh: async () => {
      const nextSnapshot = await loadClientRuntimeSnapshot();
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    },
  };
}
