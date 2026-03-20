type ErrorLike = {
  message?: string | null;
  code?: string | null;
};

export const SUPABASE_SETUP_HINT =
  "Supabase 스키마 또는 Storage/RLS 설정이 완료되지 않았습니다. `supabase/schema.sql`을 적용한 뒤 `npm run verify:supabase-setup`와 `npm run verify:live`를 실행하세요.";

export function getSupabaseSetupIssue(...errors: Array<ErrorLike | null | undefined>) {
  const joined = errors
    .flatMap((error) => [error?.code ?? "", error?.message ?? ""])
    .join(" ")
    .toLowerCase();

  if (
    joined.includes("pgrst205") ||
    joined.includes("schema cache") ||
    joined.includes("could not find the table") ||
    joined.includes("relation") ||
    joined.includes("does not exist")
  ) {
    return SUPABASE_SETUP_HINT;
  }

  if (joined.includes("row-level security") || joined.includes("permission denied")) {
    return "Supabase RLS 또는 Storage 정책이 아직 맞지 않습니다. `supabase/schema.sql`을 다시 적용하고 `npm run verify:live`로 확인하세요.";
  }

  return SUPABASE_SETUP_HINT;
}
