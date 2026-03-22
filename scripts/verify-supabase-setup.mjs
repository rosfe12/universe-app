import { createClient } from "@supabase/supabase-js";

import { loadLocalEnv, requireEnv } from "./_env.mjs";

loadLocalEnv();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const restHeaders = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
};

async function checkEndpoint(name, endpoint, headers = restHeaders) {
  try {
    const response = await fetch(`${url}${endpoint}`, {
      headers,
      signal: AbortSignal.timeout(20000),
    });

    const ok = [200, 201, 204, 401, 403].includes(response.status);
    const body = ok ? "" : await response.text();

    return {
      name,
      ok,
      status: response.status,
      body,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      status: 0,
      body: error instanceof Error ? error.message : "unknown network error",
    };
  }
}

const checks = [
  checkEndpoint("public.schools", "/rest/v1/schools?select=id&limit=1"),
  checkEndpoint("public.users", "/rest/v1/users?select=id&limit=1"),
  checkEndpoint(
    "public.student_verification_requests",
    "/rest/v1/student_verification_requests?select=id&limit=1",
  ),
  checkEndpoint("public.posts", "/rest/v1/posts?select=id&limit=1"),
  checkEndpoint("public.comments", "/rest/v1/comments?select=id&limit=1"),
  checkEndpoint("public.lectures", "/rest/v1/lectures?select=id&limit=1"),
  checkEndpoint("public.lecture_reviews", "/rest/v1/lecture_reviews?select=id&limit=1"),
  checkEndpoint("public.trade_posts", "/rest/v1/trade_posts?select=id&limit=1"),
  checkEndpoint("public.notifications", "/rest/v1/notifications?select=id&limit=1"),
  checkEndpoint("public.reports", "/rest/v1/reports?select=id&limit=1"),
  checkEndpoint("public.blocks", "/rest/v1/blocks?select=id&limit=1"),
  checkEndpoint("public.dating_profiles", "/rest/v1/dating_profiles?select=id&limit=1"),
  checkEndpoint("public.media_assets", "/rest/v1/media_assets?select=id&limit=1"),
  checkEndpoint("public.admin_audit_logs", "/rest/v1/admin_audit_logs?select=id&limit=1"),
  checkEndpoint("public.ops_events", "/rest/v1/ops_events?select=id&limit=1"),
  checkEndpoint("rpc.list_user_public_profiles", "/rest/v1/rpc/list_user_public_profiles", {
    ...restHeaders,
    "content-type": "application/json",
  }),
];

if (serviceRoleKey) {
  checks.push(
    (async () => {
      try {
        const adminClient = createClient(url, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        const { data, error } = await adminClient.storage.getBucket("media");

        return {
          name: "storage.bucket.media",
          ok: !error && Boolean(data?.id),
          status: error ? 500 : 200,
          body: error?.message ?? "",
        };
      } catch (error) {
        return {
          name: "storage.bucket.media",
          ok: false,
          status: 0,
          body: error instanceof Error ? error.message : "unknown network error",
        };
      }
    })(),
  );
}

const results = await Promise.all(checks);
const failures = results.filter((result) => !result.ok);

for (const result of results) {
  const prefix = result.ok ? "OK" : "FAIL";
  console.log(`${prefix} ${result.name} (${result.status})`);
  if (!result.ok && result.body) {
    console.log(result.body);
  }
}

if (failures.length > 0) {
  process.exitCode = 1;
  throw new Error("Supabase setup verification failed.");
}

console.log("Supabase setup verification passed.");
