"use client";

import { Chrome, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  getAuthFlowHref,
  isGoogleSignInEnabled,
  isSupabaseEnabled,
  signInWithGoogle,
  signInWithSupabase,
  signUpWithSupabase,
} from "@/lib/supabase/app-data";

const loginSchema = z.object({
  email: z.string().email("이메일 형식이 필요합니다."),
  password: z.string().min(6, "비밀번호를 6자 이상 입력해주세요."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/home";
  const schoolVerified = searchParams.get("schoolVerified") === "1";
  const schoolVerificationExpired = searchParams.get("schoolVerificationExpired") === "1";
  const schoolVerificationFailed = searchParams.get("schoolVerificationFailed") === "1";
  const { currentUser, isAuthenticated, loading, refresh } = useAppRuntime();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const googleSignInEnabled = isGoogleSignInEnabled();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "jiyoon@konkuk.ac.kr",
      password: "univers123",
    },
  });

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    router.replace(
      getAuthFlowHref({
        isAuthenticated,
        user: currentUser,
        nextPath,
      }),
    );
  }, [currentUser, isAuthenticated, loading, nextPath, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    setErrorMessage("");

    if (!isSupabaseEnabled()) {
      router.push("/home");
      return;
    }

    setPending(true);
    const result = await signInWithSupabase(values.email, values.password);
    setPending(false);

    if (result.error) {
      setErrorMessage(result.error.message);
      return;
    }

    const nextSnapshot = await refresh();
    router.push(
      getAuthFlowHref({
        isAuthenticated: nextSnapshot.isAuthenticated,
        user: nextSnapshot.currentUser,
        nextPath,
      }),
    );
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-4 bg-[linear-gradient(135deg,#0f172a_0%,#0ea5e9_100%)] text-white">
          <p className="text-xs font-semibold tracking-[0.2em]">유니버스</p>
          <div>
            <CardTitle className="text-2xl">캠퍼스 커뮤니티에 로그인</CardTitle>
            <p className="mt-2 text-sm text-white/80">캠퍼스 라이프 플랫폼</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 py-6">
          {pending || loading ? <LoadingState /> : null}
          {schoolVerified ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              학교 메일 인증이 완료되었습니다. 로그인 후 바로 대학생 권한을 사용할 수 있습니다.
            </div>
          ) : null}
          {schoolVerificationExpired ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              학교 메일 인증 링크가 만료되었습니다. 다시 인증 메일을 요청해주세요.
            </div>
          ) : null}
          {schoolVerificationFailed ? (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              학교 메일 인증을 완료하지 못했습니다. 다시 시도해주세요.
            </div>
          ) : null}
          {errorMessage ? (
            <ErrorState title="로그인 실패" description={errorMessage} />
          ) : null}
          {googleSignInEnabled ? (
            <>
              <Button
                type="button"
                className="w-full"
                onClick={async () => {
                  setErrorMessage("");

                  if (!isSupabaseEnabled()) {
                    router.push("/home");
                    return;
                  }

                  setPending(true);
                  const result = await signInWithGoogle(nextPath);
                  if (result.error) {
                    setErrorMessage(result.error.message);
                    setPending(false);
                  }
                }}
              >
                <Chrome className="h-4 w-4" />
                구글로 시작하기
              </Button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>또는 이메일로</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>이메일</Label>
              <Input {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label>비밀번호</Label>
              <Input type="password" {...form.register("password")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button type="submit" className="w-full">
                <Mail className="h-4 w-4" />
                로그인
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const values = form.getValues();
                  const parsed = loginSchema.safeParse(values);

                  if (!parsed.success) {
                    parsed.error.issues.forEach((issue) => {
                      const field = issue.path[0] as keyof LoginFormValues;
                      form.setError(field, { message: issue.message });
                    });
                    return;
                  }

                  setErrorMessage("");

                  if (!isSupabaseEnabled()) {
                    router.push("/home");
                    return;
                  }

                  setPending(true);
                  const result = await signUpWithSupabase({
                    email: parsed.data.email,
                    password: parsed.data.password,
                  });
                  setPending(false);

                  if (result.error) {
                    setErrorMessage(result.error.message);
                    return;
                  }

                  router.push(`/onboarding?next=${encodeURIComponent(nextPath)}`);
                }}
              >
                이메일로 시작
              </Button>
            </div>
          </form>
          <div className="space-y-2 rounded-[24px] bg-secondary/70 p-4 text-sm">
            <p className="font-semibold">데모 계정</p>
            <p>기본 데모: `jiyoon@konkuk.ac.kr` / `univers123`</p>
            {googleSignInEnabled ? (
              <p>구글 로그인은 계정 생성용이며, 대학생 권한은 학교 메일 인증 후 열립니다.</p>
            ) : null}
            <p>Supabase 미설정 시 데모 모드로 바로 진입합니다.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
