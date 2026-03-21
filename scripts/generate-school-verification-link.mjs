import { createClient } from "@supabase/supabase-js";

import { loadLocalEnv, requireEnv } from "./_env.mjs";

loadLocalEnv();
requireEnv([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://127.0.0.1:3000";
const adminClient = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const appUserEmail = process.argv[2] ?? process.env.SCHOOL_VERIFICATION_TEST_EMAIL ?? "qa.verification@example.com";

const { data: authUsers, error: authUsersError } = await adminClient.auth.admin.listUsers({
  page: 1,
  perPage: 500,
});

if (authUsersError) {
  throw authUsersError;
}

const authUser = authUsers.users.find(
  (user) => user.email?.trim().toLowerCase() === appUserEmail.trim().toLowerCase(),
);

if (!authUser) {
  throw new Error("앱 사용자 auth 계정을 찾을 수 없습니다.");
}

const { data: userRow, error: userError } = await adminClient
  .from("users")
  .select("id")
  .eq("id", authUser.id)
  .single();

if (userError || !userRow) {
  throw userError ?? new Error("앱 사용자 프로필을 찾을 수 없습니다.");
}

const { data: requestRow, error: requestError } = await adminClient
  .from("student_verification_requests")
  .select("id, school_email")
  .eq("user_id", userRow.id)
  .eq("status", "pending")
  .order("requested_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (requestError || !requestRow) {
  throw requestError ?? new Error("대기 중인 학교 메일 인증 요청이 없습니다.");
}

const redirectTo = `${appUrl}/auth/school-email/callback?request_id=${requestRow.id}`;
const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
  type: "magiclink",
  email: requestRow.school_email,
  options: {
    redirectTo,
  },
});

if (linkError) {
  throw linkError ?? new Error("학교 메일 인증 링크 생성에 실패했습니다.");
}

if (linkData.user && linkData.user.id !== userRow.id) {
  await adminClient
    .from("student_verification_requests")
    .update({ verification_user_id: linkData.user.id })
    .eq("id", requestRow.id);
}

const hashedToken = linkData.properties?.hashed_token;

if (!hashedToken) {
  throw new Error("학교 메일 인증 토큰을 찾을 수 없습니다.");
}

console.log(
  `${appUrl}/auth/school-email/callback?request_id=${requestRow.id}&token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`,
);
