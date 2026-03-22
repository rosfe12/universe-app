import { hasAdminSupabaseEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type LogLevel = "info" | "warn" | "error";

export function logServerEvent(
  level: "info" | "warn" | "error",
  event: string,
  metadata?: Record<string, unknown>,
) {
  const payload = {
    level,
    event,
    metadata: metadata ?? {},
    timestamp: new Date().toISOString(),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }

  if (!hasAdminSupabaseEnv()) {
    return;
  }

  void persistOpsEvent(level, event, payload.metadata);
}

async function persistOpsEvent(
  level: LogLevel,
  event: string,
  metadata: Record<string, unknown>,
) {
  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin.from("ops_events").insert({
      level,
      event,
      source: "app",
      metadata,
    });

    if (error) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "ops_event_persist_failed",
          metadata: {
            message: error.message,
            originalEvent: event,
          },
          timestamp: new Date().toISOString(),
        }),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "ops_event_persist_failed",
        metadata: {
          message: error instanceof Error ? error.message : "unknown",
          originalEvent: event,
        },
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
