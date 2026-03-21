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
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}
