"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";

async function requireNotificationUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  return { supabase, user };
}

export async function markNotificationRead(notificationId: string) {
  const { supabase, user } = await requireNotificationUser();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: now })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notifications");
  revalidatePath("/messages");
  revalidatePath("/profile");
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await requireNotificationUser();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: now })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notifications");
  revalidatePath("/messages");
  revalidatePath("/profile");
}

export async function markNotificationsReadByTarget(
  targetType: "post" | "trade",
  targetId: string,
) {
  const { supabase, user } = await requireNotificationUser();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: now })
    .eq("user_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notifications");
  revalidatePath("/messages");
  revalidatePath("/profile");
}
