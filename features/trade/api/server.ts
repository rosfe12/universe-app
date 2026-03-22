import { loadServerRuntimeSnapshot } from "@/lib/supabase/server-data";

export async function getTradePageSnapshot() {
  return loadServerRuntimeSnapshot("trade");
}

export async function getSchoolPageSnapshot() {
  return loadServerRuntimeSnapshot("school");
}

export async function getNotificationsPageSnapshot() {
  return loadServerRuntimeSnapshot("notifications");
}
