import { NextResponse } from "next/server";

import { logServerEvent } from "@/lib/ops";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VERIFICATION_DOCUMENTS_BUCKET = "verification-documents";
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

function normalizeFilename(file: File) {
  return file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "document";
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

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    logServerEvent("error", "student_verification_document_upload_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "추가 인증 자료 업로드에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
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
  } catch (error) {
    logServerEvent("error", "student_verification_document_delete_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "추가 인증 자료 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
