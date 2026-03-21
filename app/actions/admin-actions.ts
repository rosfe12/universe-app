"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ensureMasterAdminRole } from "@/lib/admin/master-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const verificationActionSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const admin = createAdminSupabaseClient();
  await ensureMasterAdminRole(admin, {
    id: user.id,
    email: user.email,
  });

  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !role) {
    throw new Error("관리자만 처리할 수 있습니다.");
  }

  return user.id;
}

function revalidateAdminTargets() {
  [
    "/admin",
    "/profile",
    "/home",
    "/school",
    "/lectures",
    "/trade",
    "/community",
    "/dating",
  ].forEach((path) => revalidatePath(path));
}

export async function updateStudentVerificationRequest(
  input: z.input<typeof verificationActionSchema>,
) {
  const values = verificationActionSchema.parse(input);
  await requireAdmin();

  const admin = createAdminSupabaseClient();
  const { data: request, error: requestError } = await admin
    .from("student_verification_requests")
    .select(
      "id, user_id, school_id, school_email, verification_user_id, status",
    )
    .eq("id", values.requestId)
    .single();

  if (requestError || !request) {
    throw new Error("인증 요청을 찾을 수 없습니다.");
  }

  const now = new Date().toISOString();

  if (values.action === "approve") {
    const [{ error: userError }, { error: requestUpdateError }] = await Promise.all([
      admin
        .from("users")
        .update({
          school_id: request.school_id,
          school_email: request.school_email,
          student_verification_status: "verified",
          school_email_verified_at: now,
          verified: true,
        })
        .eq("id", request.user_id),
      admin
        .from("student_verification_requests")
        .update({
          status: "verified",
          verified_at: now,
        })
        .eq("id", request.id),
    ]);

    if (userError || requestUpdateError) {
      throw new Error(userError?.message ?? requestUpdateError?.message ?? "인증 승인에 실패했습니다.");
    }

    if (request.verification_user_id && request.verification_user_id !== request.user_id) {
      await admin.auth.admin.deleteUser(request.verification_user_id).catch(() => null);
    }

    revalidateAdminTargets();
    return { ok: true };
  }

  const [{ error: rejectUserError }, { error: rejectRequestError }] = await Promise.all([
    admin
      .from("users")
      .update({
        student_verification_status: "rejected",
        school_email_verified_at: null,
        verified: false,
      })
      .eq("id", request.user_id),
    admin
      .from("student_verification_requests")
      .update({
        status: "cancelled",
        verified_at: null,
      })
      .eq("id", request.id),
  ]);

  if (request.verification_user_id && request.verification_user_id !== request.user_id) {
    await admin.auth.admin.deleteUser(request.verification_user_id).catch(() => null);
  }

  if (rejectUserError || rejectRequestError) {
    throw new Error(
      rejectUserError?.message ?? rejectRequestError?.message ?? "인증 반려에 실패했습니다.",
    );
  }

  revalidateAdminTargets();
  return { ok: true };
}
