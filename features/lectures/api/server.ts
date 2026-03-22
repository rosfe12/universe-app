import { loadServerRuntimeSnapshot } from "@/lib/supabase/server-data";

export async function getLecturesPageSnapshot() {
  return loadServerRuntimeSnapshot("lectures");
}

export async function getLectureDetailSnapshot() {
  return loadServerRuntimeSnapshot("lectures");
}
