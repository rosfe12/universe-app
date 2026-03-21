import { loadServerRuntimeSnapshot } from "@/lib/supabase/server-data";

export async function getHomePageSnapshot() {
  return loadServerRuntimeSnapshot();
}

export async function getCommunityPageSnapshot() {
  return loadServerRuntimeSnapshot();
}

export async function getCareerPageSnapshot() {
  return loadServerRuntimeSnapshot();
}

export async function getAdmissionPageSnapshot() {
  return loadServerRuntimeSnapshot();
}

export async function getAdmissionDetailSnapshot() {
  return loadServerRuntimeSnapshot();
}

export async function getDatingPageSnapshot() {
  return loadServerRuntimeSnapshot();
}

export async function getProfilePageSnapshot() {
  return loadServerRuntimeSnapshot();
}

export async function getAdminPageSnapshot() {
  return loadServerRuntimeSnapshot();
}
