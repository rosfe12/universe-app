import { randomUUID } from "node:crypto";

import { after, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { hasAppSmtpConfig, publicEnv, resolveAuthSiteUrl } from "@/lib/env";
import { sendStudentVerificationEmail } from "@/lib/email/server-mailer";
import { logServerEvent } from "@/lib/ops";
import { canUseSchoolVerificationEmail, normalizeSchoolEmail } from "@/lib/school-email";
import { normalizeDepartmentName, normalizeStudentNumber } from "@/lib/student-verification";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const VERIFICATION_REQUEST_COOLDOWN_MS = 60 * 1000;
const VERIFICATION_REQUEST_DAILY_CAP = 5;
const VERIFICATION_DOCUMENTS_BUCKET = "verification-documents";
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

const requestSchema = z.object({
  schoolId: z.string().uuid(),
  schoolEmail: z.string().email(),
  studentNumber: z.string().trim().min(4).max(20),
  department: z.string().trim().min(1).max(80),
  admissionYear: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  nextPath: z.string().optional(),
});

function sanitizeNextPath(value?: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/home";
  }

  return value;
}

function normalizeFilename(file: File) {
  return file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "document";
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

  if (normalized.includes("you can only send testing emails to your own email address")) {
    return "Resend 테스트 모드에서는 계정 소유 메일로만 발송할 수 있습니다. 다른 주소로 보내려면 universeapp.kr 도메인 인증을 완료해주세요.";
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

async function upsertVerificationSubmission(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  input: {
    requestId: string;
    userId: string;
    schoolId: string;
    schoolEmail: string;
    studentNumber: string;
    department: string;
    admissionYear: number;
  },
) {
  const { data: existing } = await admin
    .from("student_verifications")
    .select("id")
    .eq("request_id", input.requestId)
    .maybeSingle();

  const payload = {
    user_id: input.userId,
    school_id: input.schoolId,
    request_id: input.requestId,
    school_email: input.schoolEmail,
    student_number: input.studentNumber,
    department_name: input.department,
    admission_year: input.admissionYear,
    verification_state: "guest",
    score: 0,
    requires_document_upload: false,
    auto_checks: [],
    decision_reason: "학교 메일 확인 대기",
    rejection_reason: null,
    requested_at: new Date().toISOString(),
    email_verified_at: null,
    reviewed_at: null,
    reviewed_by: null,
  };

  if (existing?.id) {
    await admin.from("student_verifications").update(payload).eq("id", existing.id);
    return String(existing.id);
  }

  const { data, error } = await admin
    .from("student_verifications")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "학생 인증 정보를 저장할 수 없습니다.");
  }

  return String(data.id);
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

async function requireAuthUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  return user;
}

async function buildVerificationPayload(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
) {
  const { data: verification, error: verificationError } = await admin
    .from("student_verifications")
    .select("*")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (verificationError) {
    throw verificationError;
  }

  if (!verification) {
    return null;
  }

  const { data: documentRows, error: documentsError } = await admin
    .from("verification_documents")
    .select("*")
    .eq("verification_id", verification.id)
    .order("uploaded_at", { ascending: false });

  if (documentsError) {
    throw documentsError;
  }

  const documents = await Promise.all(
    (documentRows ?? []).map(async (row) => {
      let fileUrl: string | undefined;
      if (row.status !== "deleted") {
        const signed = await admin.storage
          .from(VERIFICATION_DOCUMENTS_BUCKET)
          .createSignedUrl(String(row.file_path), 60 * 60);
        fileUrl = signed.data?.signedUrl;
      }

      return {
        ...row,
        file_url: fileUrl,
      };
    }),
  );

  return {
    ...verification,
    documents,
  };
}

async function handleCurrentVerification() {
  const user = await requireAuthUser();
  const admin = createAdminSupabaseClient();
  const verification = await buildVerificationPayload(admin, user.id);
  return NextResponse.json({ verification });
}

async function handleVerificationDocumentUpload(request: Request) {
  const user = await requireAuthUser();
  const formData = await request.formData();
  const file = formData.get("file");
  const documentType = String(formData.get("documentType") ?? "student_proof");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "업로드할 파일이 필요합니다." }, { status: 400 });
  }

  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
    return NextResponse.json({ error: "JPG, PNG, WEBP, PDF 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "추가 인증 자료는 10MB 이하만 업로드할 수 있습니다." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: verification, error: verificationError } = await admin
    .from("student_verifications")
    .select("id, verification_state")
    .eq("user_id", user.id)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (verificationError || !verification) {
    return NextResponse.json({ error: "추가 인증을 연결할 요청이 없습니다." }, { status: 404 });
  }

  if (verification.verification_state === "student_verified") {
    return NextResponse.json({ error: "이미 학생 인증이 완료된 계정입니다." }, { status: 400 });
  }

  const fileName = normalizeFilename(file);
  const filePath = `verifications/${user.id}/${verification.id}/${Date.now()}-${fileName}`;
  const { error: uploadError } = await admin.storage
    .from(VERIFICATION_DOCUMENTS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "0",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: documentRow, error: insertError } = await admin
    .from("verification_documents")
    .insert({
      verification_id: verification.id,
      user_id: user.id,
      document_type: documentType,
      file_name: file.name,
      file_path: filePath,
      mime_type: file.type,
      size_bytes: file.size,
      status: "uploaded",
    })
    .select("*")
    .single();

  if (insertError || !documentRow) {
    await admin.storage.from(VERIFICATION_DOCUMENTS_BUCKET).remove([filePath]).catch(() => null);
    throw insertError ?? new Error("추가 인증 자료를 저장하지 못했습니다.");
  }

  const signed = await admin.storage
    .from(VERIFICATION_DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, 60 * 60);

  return NextResponse.json({
    document: {
      ...documentRow,
      file_url: signed.data?.signedUrl,
    },
  });
}

async function handleVerificationDocumentDelete(request: Request) {
  const user = await requireAuthUser();
  const payload = (await request.json().catch(() => null)) as { documentId?: string } | null;
  const documentId = payload?.documentId;

  if (!documentId) {
    return NextResponse.json({ error: "삭제할 문서가 필요합니다." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: documentRow, error: documentError } = await admin
    .from("verification_documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (documentError || !documentRow) {
    return NextResponse.json({ error: "삭제할 문서를 찾을 수 없습니다." }, { status: 404 });
  }

  await admin.storage.from(VERIFICATION_DOCUMENTS_BUCKET).remove([String(documentRow.file_path)]).catch(() => null);

  const { error: updateError } = await admin
    .from("verification_documents")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", documentId);

  if (updateError) {
    throw updateError;
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  try {
    const resource = new URL(request.url).searchParams.get("resource");
    if (resource === "current" || !resource) {
      return await handleCurrentVerification();
    }

    return NextResponse.json({ error: "지원하지 않는 조회 요청입니다." }, { status: 400 });
  } catch (error) {
    logServerEvent("error", "student_verification_current_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "학생 인증 상태를 불러오지 못했습니다." },
      { status: error instanceof Error && error.message === "로그인이 필요합니다." ? 401 : 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource");
  const contentType = request.headers.get("content-type") ?? "";

  if (resource === "document" || contentType.includes("multipart/form-data")) {
    return await handleVerificationDocumentUpload(request);
  }

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
  const normalizedStudentNumber = normalizeStudentNumber(input.studentNumber);
  const normalizedDepartment = input.department.trim();
  const admin = createAdminSupabaseClient();

  const [{ data: profile, error: profileError }, { data: school, error: schoolError }] =
    await Promise.all([
      admin
        .from("users")
        .select(
          "id, user_type, school_id, school_email, department, student_number, admission_year, verification_state, student_verification_status, is_restricted",
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
    profile.verification_state === "student_verified" &&
    profile.school_id === input.schoolId &&
    normalizeSchoolEmail(profile.school_email ?? "") === normalizedSchoolEmail &&
    normalizeStudentNumber(profile.student_number ?? "") === normalizedStudentNumber &&
    normalizeDepartmentName(profile.department ?? "") === normalizeDepartmentName(normalizedDepartment) &&
    Number(profile.admission_year ?? 0) === input.admissionYear
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
      department: normalizedDepartment,
      student_number: normalizedStudentNumber,
      admission_year: input.admissionYear,
      verification_state: "guest",
      verification_score: 0,
      verification_requested_at: new Date().toISOString(),
      verification_reviewed_at: null,
      verification_rejection_reason: null,
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

  await upsertVerificationSubmission(admin, {
    requestId: verificationRequestId,
    userId: authUser.id,
    schoolId: input.schoolId,
    schoolEmail: normalizedSchoolEmail,
    studentNumber: normalizedStudentNumber,
    department: normalizedDepartment,
    admissionYear: input.admissionYear,
  });

  const origin = resolveAuthSiteUrl(new URL(request.url).origin);

  if (hasAppSmtpConfig()) {
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

  after(async () => {
    const verificationUserId = await findVerificationAuthUserIdByEmail(
      admin,
      normalizedSchoolEmail,
      authUser.id,
    ).catch(() => null);

    await updateDeliveryState(admin, verificationRequestId, {
      deliveryMethod: "supabase_auth",
      deliveryStatus: "sent",
      deliveryError: null,
      deliveredAt: new Date().toISOString(),
      verificationUserId,
    }).catch(() => null);
  });

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

export async function DELETE(request: Request) {
  try {
    const resource = new URL(request.url).searchParams.get("resource");
    if (resource !== "document") {
      return NextResponse.json({ error: "지원하지 않는 삭제 요청입니다." }, { status: 400 });
    }

    return await handleVerificationDocumentDelete(request);
  } catch (error) {
    logServerEvent("error", "student_verification_document_delete_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "추가 인증 자료 삭제에 실패했습니다." },
      { status: error instanceof Error && error.message === "로그인이 필요합니다." ? 401 : 500 },
    );
  }
}
