import { loadServerRuntimeSnapshot } from "@/lib/supabase/server-data";

export async function getCommentsPageSnapshot() {
  return loadServerRuntimeSnapshot();
}
