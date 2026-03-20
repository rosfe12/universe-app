import { loadServerRuntimeSnapshot } from "@/lib/supabase/server-data";

export async function getLecturesPageSnapshot() {
  return loadServerRuntimeSnapshot();
}

export async function getLectureDetailSnapshot() {
  return loadServerRuntimeSnapshot();
}
