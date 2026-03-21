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
import { shouldShowTestAccounts } from "@/lib/env";
import { AppFooterLinks } from "@/components/layout/app-footer-links";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("이메일 형식이 필요합니다."),
  password: z.string().min(6, "비밀번호를 6자 이상 입력해주세요."),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type AuthMode = "login" | "signup";

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
  const [mode, setMode] = useState<AuthMode>("login");
  const googleSignInEnabled = isGoogleSignInEnabled();
  const showTestAccounts = shouldShowTestAccounts();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: showTestAccounts ? "jiyoon@konkuk.ac.kr" : "",
      password: showTestAccounts ? "univers123" : "",
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
    const result =
      mode === "login"
        ? await signInWithSupabase(values.email, values.password)
        : await signUpWithSupabase({
            email: values.email,
            password: values.password,
          });
    setPending(false);

    if (result.error) {
      setErrorMessage(result.error.message);
      return;
    }

    if (mode === "signup") {
      router.push(`/onboarding?next=${encodeURIComponent(nextPath)}`);
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
            <CardTitle className="text-2xl">
              {mode === "login" ? "캠퍼스 커뮤니티에 로그인" : "유니버스 회원가입"}
            </CardTitle>
            <p className="mt-2 text-sm text-white/80">
              {mode === "login"
                ? "캠퍼스 라이프 플랫폼"
                : "가입 후 온보딩에서 학교와 유저 유형을 설정합니다."}
            </p>
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
                {mode === "login" ? "구글로 로그인" : "구글로 회원가입"}
              </Button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>또는 이메일로</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}
          <div className="grid grid-cols-2 gap-2 rounded-[22px] bg-secondary/70 p-1">
            <button
              type="button"
              className={cn(
                "h-11 rounded-[18px] text-sm font-semibold transition-colors",
                mode === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
              onClick={() => {
                setMode("login");
                setErrorMessage("");
              }}
            >
              로그인
            </button>
            <button
              type="button"
              className={cn(
                "h-11 rounded-[18px] text-sm font-semibold transition-colors",
                mode === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
              onClick={() => {
                setMode("signup");
                setErrorMessage("");
              }}
            >
              회원가입
            </button>
          </div>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>이메일</Label>
              <Input {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label>비밀번호</Label>
              <Input type="password" {...form.register("password")} />
            </div>
            <Button type="submit" className="w-full">
              <Mail className="h-4 w-4" />
              {mode === "login" ? "로그인" : "회원가입"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                setMode((current) => (current === "login" ? "signup" : "login"));
                setErrorMessage("");
              }}
            >
              {mode === "login"
                ? "처음이라면 회원가입"
                : "이미 계정이 있다면 로그인"}
            </button>
          </form>
          {showTestAccounts ? (
            <div className="space-y-2 rounded-[24px] bg-secondary/70 p-4 text-sm">
              <p className="font-semibold">테스트 계정</p>
              <p>기본 계정: `jiyoon@konkuk.ac.kr` / `univers123`</p>
              {googleSignInEnabled ? (
                <p>구글 로그인은 계정 생성용이며, 대학생 권한은 학교 메일 인증 후 열립니다.</p>
              ) : null}
              <p>로그인 후 온보딩에서 학교와 유저 유형을 설정할 수 있습니다.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="mt-5">
        <AppFooterLinks />
      </div>
    </div>
  );
}
