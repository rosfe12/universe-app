import { loadServerRuntimeSnapshot } from "@/lib/supabase/server-data";

export async function getHomePageSnapshot() {
  return loadServerRuntimeSnapshot("home");
}

export async function getCommunityPageSnapshot() {
  return loadServerRuntimeSnapshot("community");
}

export async function getCareerPageSnapshot() {
  return loadServerRuntimeSnapshot("community");
}

export async function getAdmissionPageSnapshot() {
  return loadServerRuntimeSnapshot("admission");
}

export async function getAdmissionDetailSnapshot() {
  return loadServerRuntimeSnapshot("admission");
}

export async function getDatingPageSnapshot() {
  return loadServerRuntimeSnapshot("dating");
}

export async function getProfilePageSnapshot() {
  return loadServerRuntimeSnapshot("chrome");
}

export async function getChromePageSnapshot() {
  return loadServerRuntimeSnapshot("chrome");
}

export async function getAdminPageSnapshot() {
  return loadServerRuntimeSnapshot("admin");
}
