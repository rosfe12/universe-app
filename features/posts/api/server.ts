import { loadServerRuntimeSnapshot } from "@/lib/supabase/server-data";

export async function getHomePageSnapshot() {
  return loadServerRuntimeSnapshot();
}

export async function getCommunityPageSnapshot() {
  return loadServerRuntimeSnapshot();
}

export async function getAdmissionPageSnapshot() {
  return loadServerRuntimeSnapshot();
}

export async function getAdmissionDetailSnapshot() {
  return loadServerRuntimeSnapshot();
}
