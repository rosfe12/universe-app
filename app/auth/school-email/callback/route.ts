import { NextResponse } from "next/server";
import { createClient, type EmailOtpType } from "@supabase/supabase-js";

import { publicEnv, resolveAuthSiteUrl } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyStudentVerificationToken } from "@/lib/student-verification-token";

export const runtime = "nodejs";

function sanitizeNextPath(value?: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/home";
  }

  return value;
}

function appendFlag(path: string, key: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=1`;
}

function buildLoginRedirect(request: Request, nextPath: string, searchKey: string) {
  const redirectUrl = new URL("/login", resolveAuthSiteUrl(new URL(request.url).origin));
  redirectUrl.searchParams.set(searchKey, "1");
  redirectUrl.searchParams.set("next", nextPath);
  return redirectUrl;
}

export async function GET(request: Request) {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(buildLoginRedirect(request, "/home", "schoolVerificationFailed"));
  }

  const requestUrl = new URL(request.url);
  const requestId = requestUrl.searchParams.get("request_id");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const testToken = requestUrl.searchParams.get("test_token");
  const type = requestUrl.searchParams.get("type");
  const errorCode = requestUrl.searchParams.get("error_code");

  if (errorCode || !requestId || (!testToken && (!tokenHash || !type))) {
    return NextResponse.redirect(
      buildLoginRedirect(request, "/profile", "schoolVerificationFailed"),
    );
  }

  const admin = createAdminSupabaseClient();
  const { data: verificationRequest, error: verificationRequestError } = await admin
    .from("student_verification_requests")
    .select(
      "id, user_id, school_id, school_email, verification_user_id, status, next_path, expires_at",
    )
    .eq("id", requestId)
    .single();

  if (verificationRequestError || !verificationRequest) {
    return NextResponse.redirect(
      buildLoginRedirect(request, "/profile", "schoolVerificationFailed"),
    );
  }

  const nextPath = sanitizeNextPath(verificationRequest.next_path);

  if (verificationRequest.status !== "pending") {
    if (verificationRequest.status === "verified") {
      return NextResponse.redirect(
        buildLoginRedirect(request, appendFlag(nextPath, "schoolVerified"), "schoolVerified"),
      );
    }

    if (verificationRequest.status === "expired") {
      return NextResponse.redirect(
        buildLoginRedirect(request, appendFlag(nextPath, "schoolVerificationExpired"), "schoolVerificationExpired"),
      );
    }

    return NextResponse.redirect(
      buildLoginRedirect(request, appendFlag(nextPath, "schoolVerificationFailed"), "schoolVerificationFailed"),
    );
  }

  if (new Date(verificationRequest.expires_at).getTime() < Date.now()) {
    await admin
      .from("student_verification_requests")
      .update({ status: "expired" })
      .eq("id", verificationRequest.id);

    return NextResponse.redirect(
      buildLoginRedirect(request, appendFlag(nextPath, "schoolVerificationExpired"), "schoolVerificationExpired"),
    );
  }

  let verifiedEmail = "";
  let verificationUserId: string | null = verificationRequest.verification_user_id ?? null;

  if (testToken) {
    const isValidTestToken = verifyStudentVerificationToken(
      verificationRequest.id,
      verificationRequest.user_id,
      verificationRequest.school_email,
      testToken,
    );

    if (!isValidTestToken) {
      return NextResponse.redirect(
        buildLoginRedirect(request, appendFlag(nextPath, "schoolVerificationFailed"), "schoolVerificationFailed"),
      );
    }

    verifiedEmail = verificationRequest.school_email.trim().toLowerCase();
    verificationUserId = verificationRequest.user_id;
  } else {
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

    const { data: otpData, error: otpError } = await authClient.auth.verifyOtp({
      token_hash: tokenHash!,
      type: type as EmailOtpType,
    });

    if (otpError || !otpData.user?.email) {
      await admin
        .from("student_verification_requests")
        .update({ status: "expired" })
        .eq("id", verificationRequest.id);

      return NextResponse.redirect(
        buildLoginRedirect(request, appendFlag(nextPath, "schoolVerificationFailed"), "schoolVerificationFailed"),
      );
    }

    verifiedEmail = otpData.user.email.trim().toLowerCase();
    verificationUserId = verificationUserId ?? otpData.user.id;
  }

  const targetEmail = verificationRequest.school_email.trim().toLowerCase();

  if (verifiedEmail !== targetEmail) {
    return NextResponse.redirect(
      buildLoginRedirect(request, appendFlag(nextPath, "schoolVerificationFailed"), "schoolVerificationFailed"),
    );
  }

  const now = new Date().toISOString();
  const [{ error: updateUserError }, { error: updateRequestError }] = await Promise.all([
    admin
      .from("users")
      .update({
        school_id: verificationRequest.school_id,
        school_email: targetEmail,
        student_verification_status: "verified",
        school_email_verified_at: now,
        verified: true,
      })
      .eq("id", verificationRequest.user_id),
    admin
      .from("student_verification_requests")
      .update({
        status: "verified",
        delivery_status: "sent",
        delivery_error: null,
        delivered_at: now,
        verified_at: now,
      })
      .eq("id", verificationRequest.id),
  ]);

  if (updateUserError || updateRequestError) {
    return NextResponse.redirect(
      buildLoginRedirect(request, appendFlag(nextPath, "schoolVerificationFailed"), "schoolVerificationFailed"),
    );
  }

  if (verificationUserId && verificationUserId !== verificationRequest.user_id) {
    await admin.auth.admin.deleteUser(verificationUserId).catch(() => null);
  }

  return NextResponse.redirect(
    buildLoginRedirect(
      request,
      appendFlag(nextPath, "schoolVerified"),
      "schoolVerified",
    ),
  );
}
