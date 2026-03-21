import { createClient } from "@supabase/supabase-js";

import { loadLocalEnv, requireEnv } from "./_env.mjs";

loadLocalEnv();
requireEnv([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminClient = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const APP_USER_EMAIL = process.env.SCHOOL_VERIFICATION_TEST_EMAIL ?? "qa.verification@example.com";
const SCHOOL_EMAIL = process.env.SCHOOL_VERIFICATION_TEST_SCHOOL_EMAIL ?? "qa.verification@konkuk.ac.kr";

const { data: authUsers, error: authUsersError } = await adminClient.auth.admin.listUsers({
  page: 1,
  perPage: 500,
});

if (authUsersError) {
  throw authUsersError;
}

const authUser = authUsers.users.find(
  (user) => user.email?.trim().toLowerCase() === APP_USER_EMAIL.trim().toLowerCase(),
);

if (!authUser) {
  throw new Error("테스트 사용자 auth 계정을 찾을 수 없습니다.");
}

const { data: userRow, error: userError } = await adminClient
  .from("users")
  .select("id")
  .eq("id", authUser.id)
  .single();

if (userError || !userRow) {
  throw userError ?? new Error("테스트 사용자 프로필을 찾을 수 없습니다.");
}

const userId = userRow.id;

const { data: requests } = await adminClient
  .from("student_verification_requests")
  .select("id, verification_user_id")
  .eq("user_id", userId);

for (const request of requests ?? []) {
  if (request.verification_user_id && request.verification_user_id !== userId) {
    await adminClient.auth.admin.deleteUser(request.verification_user_id).catch(() => null);
  }
}

const { data: schoolEmailAuthUsers } = await adminClient.auth.admin.listUsers({
  page: 1,
  perPage: 500,
});

for (const authUser of schoolEmailAuthUsers.users) {
  const email = authUser.email?.trim().toLowerCase();
  if (email === SCHOOL_EMAIL.toLowerCase()) {
    await adminClient.auth.admin.deleteUser(authUser.id).catch(() => null);
  }
}

await adminClient
  .from("student_verification_requests")
  .delete()
  .eq("user_id", userId);

const { error: updateError } = await adminClient
  .from("users")
  .update({
    email: APP_USER_EMAIL,
    user_type: "student",
    school_id: null,
    department: null,
    grade: null,
    school_email: null,
    student_verification_status: "unverified",
    school_email_verified_at: null,
    verified: false,
    default_visibility_level: "anonymous",
  })
  .eq("id", userId);

if (updateError) {
  throw updateError;
}

console.log(
  JSON.stringify(
    {
      reset: true,
      appUserEmail: APP_USER_EMAIL,
      schoolEmail: SCHOOL_EMAIL,
      userId,
    },
    null,
    2,
  ),
);
