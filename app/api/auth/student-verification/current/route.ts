import { NextResponse } from "next/server";

import { logServerEvent } from "@/lib/ops";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VERIFICATION_DOCUMENTS_BUCKET = "verification-documents";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const admin = createAdminSupabaseClient();
    const { data: verification, error: verificationError } = await admin
      .from("student_verifications")
      .select("*")
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verificationError) {
      throw verificationError;
    }

    if (!verification) {
      return NextResponse.json({ verification: null });
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

    return NextResponse.json({
      verification: {
        ...verification,
        documents,
      },
    });
  } catch (error) {
    logServerEvent("error", "student_verification_current_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "학생 인증 상태를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
