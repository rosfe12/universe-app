import { NextResponse } from "next/server";
import { createClient, type EmailOtpType } from "@supabase/supabase-js";

import { publicEnv, resolveAuthSiteUrl } from "@/lib/env";
import { evaluateStudentVerification } from "@/lib/student-verification";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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

function appendParam(path: string, key: string, value: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
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
  const type = requestUrl.searchParams.get("type");
  const errorCode = requestUrl.searchParams.get("error_code");

  if (errorCode || !requestId || !tokenHash || !type) {
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
    token_hash: tokenHash,
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

  const targetEmail = verificationRequest.school_email.trim().toLowerCase();

  if (verifiedEmail !== targetEmail) {
    return NextResponse.redirect(
      buildLoginRedirect(request, appendFlag(nextPath, "schoolVerificationFailed"), "schoolVerificationFailed"),
    );
  }

  const now = new Date().toISOString();
  const [
    { data: userProfile, error: userProfileError },
    { data: emailRules, error: emailRuleError },
    { data: studentRule, error: studentRuleError },
    { data: departments, error: departmentError },
    { data: verificationRow, error: verificationRowError },
  ] = await Promise.all([
    admin
      .from("users")
      .select("id, user_type, department, student_number, admission_year, verification_requested_at")
      .eq("id", verificationRequest.user_id)
      .single(),
    admin
      .from("school_email_rules")
      .select("id, school_id, domain, email_regex, priority, is_active")
      .eq("school_id", verificationRequest.school_id)
      .eq("is_active", true)
      .order("priority", { ascending: true }),
    admin
      .from("school_student_rules")
      .select("id, school_id, student_id_regex, admission_year_regex, admission_year_min, admission_year_max, expected_student_number_length, score_email_domain, score_email_regex, score_student_id, score_admission_year, score_department, is_active")
      .eq("school_id", verificationRequest.school_id)
      .maybeSingle(),
    admin
      .from("school_departments")
      .select("id, school_id, name, aliases, is_active")
      .eq("school_id", verificationRequest.school_id)
      .eq("is_active", true),
    admin
      .from("student_verifications")
      .select("id")
      .eq("request_id", verificationRequest.id)
      .maybeSingle(),
  ]);

  if (userProfileError || !userProfile || emailRuleError || studentRuleError || departmentError || verificationRowError) {
    return NextResponse.redirect(
      buildLoginRedirect(request, appendFlag(nextPath, "schoolVerificationFailed"), "schoolVerificationFailed"),
    );
  }

  const evaluation = evaluateStudentVerification({
    schoolEmail: targetEmail,
    studentNumber: userProfile.student_number,
    department: userProfile.department,
    admissionYear:
      typeof userProfile.admission_year === "number" ? userProfile.admission_year : undefined,
    emailRules: (emailRules ?? []).map((row) => ({
      id: String(row.id),
      schoolId: String(row.school_id),
      domain: String(row.domain),
      emailRegex: row.email_regex ? String(row.email_regex) : undefined,
      priority: typeof row.priority === "number" ? row.priority : 100,
      isActive: Boolean(row.is_active),
    })),
    studentRule: studentRule
      ? {
          id: String(studentRule.id),
          schoolId: String(studentRule.school_id),
          studentIdRegex: studentRule.student_id_regex ? String(studentRule.student_id_regex) : undefined,
          admissionYearRegex: studentRule.admission_year_regex ? String(studentRule.admission_year_regex) : undefined,
          admissionYearMin:
            typeof studentRule.admission_year_min === "number"
              ? studentRule.admission_year_min
              : undefined,
          admissionYearMax:
            typeof studentRule.admission_year_max === "number"
              ? studentRule.admission_year_max
              : undefined,
          expectedStudentNumberLength:
            typeof studentRule.expected_student_number_length === "number"
              ? studentRule.expected_student_number_length
              : undefined,
          scoreEmailDomain:
            typeof studentRule.score_email_domain === "number"
              ? studentRule.score_email_domain
              : undefined,
          scoreEmailRegex:
            typeof studentRule.score_email_regex === "number"
              ? studentRule.score_email_regex
              : undefined,
          scoreStudentId:
            typeof studentRule.score_student_id === "number"
              ? studentRule.score_student_id
              : undefined,
          scoreAdmissionYear:
            typeof studentRule.score_admission_year === "number"
              ? studentRule.score_admission_year
              : undefined,
          scoreDepartment:
            typeof studentRule.score_department === "number"
              ? studentRule.score_department
              : undefined,
        }
      : null,
    departments: (departments ?? []).map((row) => ({
      id: String(row.id),
      schoolId: String(row.school_id),
      name: String(row.name),
      aliases: Array.isArray(row.aliases) ? row.aliases.map((item) => String(item)) : [],
      isActive: Boolean(row.is_active),
    })),
  });

  const [updateUserResult, updateRequestResult, updateVerificationResult] = await Promise.all([
    admin
      .from("users")
      .update({
        school_id: verificationRequest.school_id,
        school_email: targetEmail,
        school_email_verified_at: now,
        verification_state: evaluation.state,
        verification_score: evaluation.score,
        verification_requested_at: userProfile.verification_requested_at ?? now,
        verification_reviewed_at: evaluation.state === "student_verified" ? now : null,
        verification_rejection_reason:
          evaluation.state === "rejected" ? evaluation.decisionReason : null,
        student_verification_status:
          evaluation.state === "student_verified"
            ? "verified"
            : evaluation.state === "rejected"
              ? "rejected"
              : "pending",
        verified: evaluation.state === "student_verified",
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
    verificationRow?.id
      ? admin
          .from("student_verifications")
          .update({
            verification_state: evaluation.state,
            score: evaluation.score,
            requires_document_upload: evaluation.requiresDocumentUpload,
            auto_checks: evaluation.checks,
            decision_reason: evaluation.decisionReason,
            rejection_reason:
              evaluation.state === "rejected" ? evaluation.decisionReason : null,
            email_verified_at: now,
            reviewed_at: evaluation.state === "student_verified" ? now : null,
          })
          .eq("id", verificationRow.id)
      : Promise.resolve({ error: null }),
  ]);

  const updateUserError = updateUserResult.error;
  const updateRequestError = updateRequestResult.error;
  const updateVerificationError = updateVerificationResult.error;

  if (updateUserError || updateRequestError || updateVerificationError) {
    return NextResponse.redirect(
      buildLoginRedirect(request, appendFlag(nextPath, "schoolVerificationFailed"), "schoolVerificationFailed"),
    );
  }

  if (verificationUserId && verificationUserId !== verificationRequest.user_id) {
    await admin.auth.admin.deleteUser(verificationUserId).catch(() => null);
  }

  if (evaluation.state === "student_verified") {
    return NextResponse.redirect(
      buildLoginRedirect(
        request,
        appendFlag(nextPath, "schoolVerified"),
        "schoolVerified",
      ),
    );
  }

  if (evaluation.state === "manual_review") {
    return NextResponse.redirect(
      buildLoginRedirect(
        request,
        appendParam(nextPath, "verification", "manual_review"),
        "schoolVerified",
      ),
    );
  }

  return NextResponse.redirect(
    buildLoginRedirect(
      request,
      appendParam(nextPath, "verification", "rejected"),
      "schoolVerificationFailed",
    ),
  );
}
