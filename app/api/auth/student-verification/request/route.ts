import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { hasAppSmtpConfig, publicEnv, resolveAuthSiteUrl } from "@/lib/env";
import { sendStudentVerificationEmail } from "@/lib/email/server-mailer";
import { logServerEvent } from "@/lib/ops";
import {
  canUseSchoolVerificationEmail,
  isTestVerificationEmail,
  normalizeSchoolEmail,
} from "@/lib/school-email";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createStudentVerificationToken } from "@/lib/student-verification-token";

export const runtime = "nodejs";
const VERIFICATION_REQUEST_COOLDOWN_MS = 60 * 1000;
const VERIFICATION_REQUEST_DAILY_CAP = 5;

const requestSchema = z.object({
  schoolId: z.string().uuid(),
  schoolEmail: z.string().email(),
  nextPath: z.string().optional(),
});

function sanitizeNextPath(value?: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/home";
  }

  return value;
}

function isRateLimitError(message?: string | null) {
  return (message ?? "").toLowerCase().includes("rate limit");
}

function isEmailDeliverySetupError(message?: string | null) {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("email address") ||
    normalized.includes("not authorized") ||
    normalized.includes("smtp") ||
    normalized.includes("mailer")
  );
}

function getDeliveryErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "학교 메일 발송에 실패했습니다.";
  const normalized = message.toLowerCase();

  if (normalized.includes("domain is not verified")) {
    return "발신 도메인 인증이 아직 완료되지 않았습니다. Resend에서 universeapp.kr 도메인 인증 상태를 확인해주세요.";
  }

  return message;
}

function buildVerificationUrl(origin: string, requestId: string, tokenHash: string, type: string) {
  const callbackUrl = new URL("/auth/school-email/callback", origin);
  callbackUrl.searchParams.set("request_id", requestId);
  callbackUrl.searchParams.set("token_hash", tokenHash);
  callbackUrl.searchParams.set("type", type);
  return callbackUrl.toString();
}

function buildTestVerificationUrl(origin: string, requestId: string, userId: string, email: string) {
  const callbackUrl = new URL("/auth/school-email/callback", origin);
  callbackUrl.searchParams.set("request_id", requestId);
  callbackUrl.searchParams.set(
    "test_token",
    createStudentVerificationToken(requestId, userId, email),
  );
  return callbackUrl.toString();
}

async function updateDeliveryState(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  requestId: string,
  input: {
    deliveryMethod: "pending" | "app_smtp" | "supabase_auth";
    deliveryStatus: "pending" | "sent" | "failed" | "rate_limited";
    deliveryError?: string | null;
    deliveredAt?: string | null;
    verificationUserId?: string | null;
  },
) {
  await admin
    .from("student_verification_requests")
    .update({
      delivery_method: input.deliveryMethod,
      delivery_status: input.deliveryStatus,
      delivery_error: input.deliveryError ?? null,
      delivered_at: input.deliveredAt ?? null,
      verification_user_id: input.verificationUserId ?? undefined,
    })
    .eq("id", requestId);
}

async function findVerificationAuthUserIdByEmail(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  email: string,
  currentUserId: string,
) {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (error) {
    return null;
  }

  return (
    data.users.find(
      (candidate) =>
        candidate.email?.trim().toLowerCase() === email &&
        candidate.id !== currentUserId,
    )?.id ?? null
  );
}

export async function POST(request: Request) {
  try {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: "Supabase 설정이 필요합니다." },
      { status: 500 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json(
      { error: "로그인 후 학교 메일 인증을 요청할 수 있습니다." },
      { status: 401 },
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "학교 메일 인증 요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const nextPath = sanitizeNextPath(input.nextPath);
  const normalizedSchoolEmail = normalizeSchoolEmail(input.schoolEmail);
  const admin = createAdminSupabaseClient();

  const [{ data: profile, error: profileError }, { data: school, error: schoolError }] =
    await Promise.all([
      admin
        .from("users")
        .select(
          "id, user_type, school_id, school_email, student_verification_status, is_restricted",
        )
        .eq("id", authUser.id)
        .single(),
      admin
        .from("schools")
        .select("id, name, domain")
        .eq("id", input.schoolId)
        .single(),
    ]);

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "프로필 정보를 먼저 저장해주세요." },
      { status: 400 },
    );
  }

  if (profile.is_restricted) {
    return NextResponse.json(
      { error: "현재 계정은 인증 요청이 제한되어 있습니다." },
      { status: 403 },
    );
  }

  if (profile.user_type !== "student") {
    return NextResponse.json(
      { error: "대학생만 학교 메일 인증을 요청할 수 있습니다." },
      { status: 403 },
    );
  }

  if (schoolError || !school) {
    return NextResponse.json(
      { error: "학교 정보를 찾을 수 없습니다." },
      { status: 400 },
    );
  }

  if (!canUseSchoolVerificationEmail(normalizedSchoolEmail)) {
    return NextResponse.json(
      { error: "학교 메일 형식을 확인해주세요." },
      { status: 400 },
    );
  }

  const { data: recentRequests, error: recentRequestsError } = await admin
    .from("student_verification_requests")
    .select("id, requested_at")
    .eq("user_id", authUser.id)
    .gte("requested_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("requested_at", { ascending: false })
    .limit(10);

  if (recentRequestsError) {
    return NextResponse.json(
      { error: "최근 인증 요청 기록을 확인할 수 없습니다." },
      { status: 500 },
    );
  }

  if ((recentRequests?.length ?? 0) >= VERIFICATION_REQUEST_DAILY_CAP) {
    return NextResponse.json(
      { error: "학교 메일 인증 요청은 하루에 너무 많이 보낼 수 없습니다." },
      { status: 429 },
    );
  }

  if (
    recentRequests?.[0]?.requested_at &&
    Date.now() - new Date(recentRequests[0].requested_at).getTime() < VERIFICATION_REQUEST_COOLDOWN_MS
  ) {
    return NextResponse.json(
      { error: "인증 메일은 잠시 후 다시 요청할 수 있습니다." },
      { status: 429 },
    );
  }

  const { data: previousRequests } = await admin
    .from("student_verification_requests")
    .select("id, verification_user_id")
    .eq("user_id", authUser.id)
    .eq("school_email", normalizedSchoolEmail)
    .in("status", ["pending", "expired", "cancelled"]);

  for (const previousRequest of previousRequests ?? []) {
    if (
      previousRequest.verification_user_id &&
      previousRequest.verification_user_id !== authUser.id
    ) {
      await admin.auth.admin.deleteUser(previousRequest.verification_user_id).catch(() => null);
    }
  }

  const [
    { data: emailOwner, error: emailOwnerError },
    { data: verifiedOwner, error: verifiedOwnerError },
  ] = await Promise.all([
    admin
      .from("users")
      .select("id")
      .eq("email", normalizedSchoolEmail)
      .neq("id", authUser.id)
      .maybeSingle(),
    admin
      .from("users")
      .select("id")
      .eq("school_email", normalizedSchoolEmail)
      .neq("id", authUser.id)
      .in("student_verification_status", ["pending", "verified"])
      .maybeSingle(),
  ]);

  if (emailOwnerError || verifiedOwnerError) {
    return NextResponse.json(
      { error: "인증 대상 메일 상태를 확인할 수 없습니다." },
      { status: 500 },
    );
  }

  if (emailOwner || verifiedOwner) {
    return NextResponse.json(
      { error: "이미 다른 계정에서 사용 중인 학교 메일입니다." },
      { status: 409 },
    );
  }

  if (
    profile.student_verification_status === "verified" &&
    profile.school_id === input.schoolId &&
    normalizeSchoolEmail(profile.school_email ?? "") === normalizedSchoolEmail
  ) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const { data: existingPendingRequest } = await admin
    .from("student_verification_requests")
    .select("id, requested_at, expires_at, verification_user_id")
    .eq("user_id", authUser.id)
    .eq("school_id", input.schoolId)
    .eq("school_email", normalizedSchoolEmail)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    existingPendingRequest &&
    new Date(existingPendingRequest.expires_at).getTime() < Date.now()
  ) {
    await admin
      .from("student_verification_requests")
      .update({ status: "expired" })
      .eq("id", existingPendingRequest.id);
  }

  const { error: profileUpdateError } = await admin
    .from("users")
    .update({
      school_id: input.schoolId,
      school_email: normalizedSchoolEmail,
      student_verification_status: "pending",
      school_email_verified_at: null,
      verified: false,
    })
    .eq("id", authUser.id);

  if (profileUpdateError) {
    return NextResponse.json(
      { error: profileUpdateError.message },
      { status: 500 },
    );
  }

  let verificationRequestId =
    existingPendingRequest &&
    new Date(existingPendingRequest.expires_at).getTime() >= Date.now()
      ? existingPendingRequest.id
      : null;

  if (!verificationRequestId) {
    await admin
      .from("student_verification_requests")
      .update({ status: "cancelled" })
      .eq("user_id", authUser.id)
      .eq("status", "pending");

    const { data: verificationRequest, error: requestError } = await admin
      .from("student_verification_requests")
      .insert({
        user_id: authUser.id,
        school_id: input.schoolId,
        school_email: normalizedSchoolEmail,
        status: "pending",
        delivery_method: "pending",
        delivery_status: "pending",
        next_path: nextPath,
      })
      .select("id")
      .single();

    if (requestError || !verificationRequest) {
      return NextResponse.json(
        { error: requestError?.message ?? "인증 요청을 저장할 수 없습니다." },
        { status: 500 },
      );
    }

    verificationRequestId = verificationRequest.id;
  }

  await admin
    .from("student_verification_requests")
    .update({
      status: "pending",
      next_path: nextPath,
      requested_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      delivery_method: "pending",
      delivery_status: "pending",
      delivery_error: null,
      delivered_at: null,
    })
    .eq("id", verificationRequestId);

  const origin = resolveAuthSiteUrl(new URL(request.url).origin);

  const existingVerificationAuthUserId = await findVerificationAuthUserIdByEmail(
    admin,
    normalizedSchoolEmail,
    authUser.id,
  );

  if (existingVerificationAuthUserId) {
    await admin.auth.admin.deleteUser(existingVerificationAuthUserId).catch(() => null);
  }

  if (hasAppSmtpConfig()) {
    if (isTestVerificationEmail(normalizedSchoolEmail)) {
      const verificationUrl = buildTestVerificationUrl(
        origin,
        verificationRequestId,
        authUser.id,
        normalizedSchoolEmail,
      );

      try {
        await sendStudentVerificationEmail({
          toEmail: normalizedSchoolEmail,
          verificationUrl,
        });
      } catch (deliveryError) {
        const deliveryMessage = getDeliveryErrorMessage(deliveryError);
        logServerEvent("error", "student_verification_email_delivery_failed", {
          requestId: verificationRequestId,
          schoolEmail: normalizedSchoolEmail,
          message: deliveryMessage,
        });
        await updateDeliveryState(admin, verificationRequestId, {
          deliveryMethod: "app_smtp",
          deliveryStatus: "failed",
          deliveryError: deliveryMessage,
        });

        return NextResponse.json(
          { error: deliveryMessage },
          { status: 500 },
        );
      }

      await updateDeliveryState(admin, verificationRequestId, {
        deliveryMethod: "app_smtp",
        deliveryStatus: "sent",
        deliveryError: null,
        deliveredAt: new Date().toISOString(),
        verificationUserId: authUser.id,
      });

      return NextResponse.json({ ok: true, pending: true, deliveryMode: "app_smtp" });
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "signup",
      email: normalizedSchoolEmail,
      password: `${randomUUID()}${randomUUID()}`,
      options: {
        data: {
          univers_student_verification: true,
          verification_request_id: verificationRequestId,
        },
      },
    });

    if (linkError || !linkData?.properties?.hashed_token || !linkData.user?.id) {
      await updateDeliveryState(admin, verificationRequestId, {
        deliveryMethod: "app_smtp",
        deliveryStatus: "failed",
        deliveryError: linkError?.message ?? "학교 메일 인증 링크를 생성할 수 없습니다.",
      });
      return NextResponse.json(
        { error: linkError?.message ?? "학교 메일 인증 링크를 생성할 수 없습니다." },
        { status: 500 },
      );
    }

    const verificationUrl = buildVerificationUrl(
      origin,
      verificationRequestId,
      linkData.properties.hashed_token,
      linkData.properties.verification_type,
    );

    try {
      await sendStudentVerificationEmail({
        toEmail: normalizedSchoolEmail,
        verificationUrl,
      });
    } catch (deliveryError) {
      const deliveryMessage = getDeliveryErrorMessage(deliveryError);
      logServerEvent("error", "student_verification_email_delivery_failed", {
        requestId: verificationRequestId,
        schoolEmail: normalizedSchoolEmail,
        message: deliveryMessage,
      });
      await admin.auth.admin.deleteUser(linkData.user.id).catch(() => null);
      await updateDeliveryState(admin, verificationRequestId, {
        deliveryMethod: "app_smtp",
        deliveryStatus: "failed",
        deliveryError: deliveryMessage,
      });

      return NextResponse.json(
        { error: deliveryMessage },
        { status: 500 },
      );
    }

    await updateDeliveryState(admin, verificationRequestId, {
      deliveryMethod: "app_smtp",
      deliveryStatus: "sent",
      deliveryError: null,
      deliveredAt: new Date().toISOString(),
      verificationUserId: linkData.user.id,
    });

    return NextResponse.json({ ok: true, pending: true, deliveryMode: "app_smtp" });
  }

  const callbackUrl = new URL("/auth/school-email/callback", origin);
  callbackUrl.searchParams.set("request_id", verificationRequestId);

  const authClient = createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  const { error: otpError } = await authClient.auth.signInWithOtp({
    email: normalizedSchoolEmail,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (otpError) {
    if (isRateLimitError(otpError.message)) {
      await updateDeliveryState(admin, verificationRequestId, {
        deliveryMethod: "supabase_auth",
        deliveryStatus: "rate_limited",
        deliveryError: otpError.message,
      });
      return NextResponse.json({
        ok: true,
        pending: true,
        rateLimited: true,
      });
    }

    if (isEmailDeliverySetupError(otpError.message)) {
      await updateDeliveryState(admin, verificationRequestId, {
        deliveryMethod: "supabase_auth",
        deliveryStatus: "failed",
        deliveryError: otpError.message,
      });
      return NextResponse.json(
        {
          error:
            "학교 메일 발송 설정이 아직 완료되지 않았습니다. 앱 SMTP 또는 Supabase Auth 메일 설정을 확인해주세요.",
        },
        { status: 503 },
      );
    }

    await updateDeliveryState(admin, verificationRequestId, {
      deliveryMethod: "supabase_auth",
      deliveryStatus: "failed",
      deliveryError: otpError.message,
    });

    return NextResponse.json(
      { error: otpError.message },
      { status: 500 },
    );
  }

  const verificationUserId = await findVerificationAuthUserIdByEmail(
    admin,
    normalizedSchoolEmail,
    authUser.id,
  );

  if (verificationUserId) {
    await updateDeliveryState(admin, verificationRequestId, {
      deliveryMethod: "supabase_auth",
      deliveryStatus: "sent",
      deliveryError: null,
      deliveredAt: new Date().toISOString(),
      verificationUserId,
    });
  } else {
    await updateDeliveryState(admin, verificationRequestId, {
      deliveryMethod: "supabase_auth",
      deliveryStatus: "sent",
      deliveryError: null,
      deliveredAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, pending: true, deliveryMode: "supabase_auth" });
  } catch (error) {
    logServerEvent("error", "student_verification_request_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "학교 메일 인증 요청에 실패했습니다." },
      { status: 500 },
    );
  }
}
