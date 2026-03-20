import { loadServerRuntimeSnapshot } from "@/lib/supabase/server-data";

export async function getTradePageSnapshot() {
  return loadServerRuntimeSnapshot();
}

export async function getSchoolPageSnapshot() {
  return loadServerRuntimeSnapshot();
}

export async function getNotificationsPageSnapshot() {
  return loadServerRuntimeSnapshot();
}
