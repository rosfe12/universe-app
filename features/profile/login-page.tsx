"use client";

import { Chrome, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  AUTH_SAVED_EMAIL_STORAGE_KEY,
  AUTH_SAVED_PASSWORD_STORAGE_KEY,
  getKeepLoggedInPreference,
  setKeepLoggedInPreference,
} from "@/lib/app-preferences";
import {
  getAuthFlowHref,
  isGoogleSignInEnabled,
  isSupabaseEnabled,
  signInWithGoogle,
  signInWithSupabase,
  signUpWithSupabase,
} from "@/lib/supabase/app-data";
import { setSupabaseSessionPersistence, waitForSupabaseAuthCookie } from "@/lib/supabase/client";
import { shouldShowTestAccounts } from "@/lib/env";
import { AppFooterLinks } from "@/components/layout/app-footer-links";
import { cn } from "@/lib/utils";
import type { AppRuntimeSnapshot } from "@/types";

const loginSchema = z.object({
  email: z.string().email("이메일 형식이 필요합니다."),
  password: z.string().min(4, "비밀번호를 4자 이상 입력해주세요."),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type AuthMode = "login" | "signup";

async function waitForAuthenticatedSnapshot(
  refresh: () => Promise<AppRuntimeSnapshot>,
) {
  let nextSnapshot = await refresh();

  if (nextSnapshot.isAuthenticated) {
    return nextSnapshot;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 150));
    nextSnapshot = await refresh();
    if (nextSnapshot.isAuthenticated) {
      break;
    }
  }

  return nextSnapshot;
}

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/home";
  const adminOnlyFlow = nextPath.startsWith("/admin");
  const schoolVerified = searchParams.get("schoolVerified") === "1";
  const schoolVerificationExpired = searchParams.get("schoolVerificationExpired") === "1";
  const schoolVerificationFailed = searchParams.get("schoolVerificationFailed") === "1";
  const { currentUser, isAuthenticated, loading, refresh } = useAppRuntime();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [mode, setMode] = useState<AuthMode>(adminOnlyFlow ? "login" : "login");
  const [saveEmail, setSaveEmail] = useState(true);
  const [savePassword, setSavePassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
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
    if (adminOnlyFlow && mode !== "login") {
      setMode("login");
    }
  }, [adminOnlyFlow, mode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedEmail = window.localStorage.getItem(AUTH_SAVED_EMAIL_STORAGE_KEY);
    const savedPassword = window.localStorage.getItem(AUTH_SAVED_PASSWORD_STORAGE_KEY);
    const rememberedSession = getKeepLoggedInPreference();

    setSaveEmail(Boolean(savedEmail));
    setSavePassword(Boolean(savedPassword));
    setKeepLoggedIn(rememberedSession);

    if (savedEmail) {
      form.setValue("email", savedEmail, { shouldDirty: false });
    }

    if (savedPassword) {
      form.setValue("password", savedPassword, { shouldDirty: false });
    }
  }, [form]);

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

    setSupabaseSessionPersistence(keepLoggedIn);
    setKeepLoggedInPreference(keepLoggedIn);

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

    if (typeof window !== "undefined") {
      if (saveEmail) {
        window.localStorage.setItem(AUTH_SAVED_EMAIL_STORAGE_KEY, values.email);
      } else {
        window.localStorage.removeItem(AUTH_SAVED_EMAIL_STORAGE_KEY);
      }

      if (savePassword) {
        window.localStorage.setItem(AUTH_SAVED_PASSWORD_STORAGE_KEY, values.password);
      } else {
        window.localStorage.removeItem(AUTH_SAVED_PASSWORD_STORAGE_KEY);
      }
    }

    if (mode === "signup") {
      const target = `/onboarding?next=${encodeURIComponent(nextPath)}`;
      if (typeof window !== "undefined") {
        window.location.replace(target);
        return;
      }
      router.push(target);
      return;
    }

    const nextSnapshot = await waitForAuthenticatedSnapshot(refresh);
    if (!nextSnapshot.isAuthenticated) {
      setErrorMessage("로그인을 완료하지 못했습니다. 다시 시도해주세요.");
      return;
    }

    const target = getAuthFlowHref({
      isAuthenticated: nextSnapshot.isAuthenticated,
      user: nextSnapshot.currentUser,
      nextPath,
    });

    if (typeof window !== "undefined") {
      await waitForSupabaseAuthCookie(true);
      window.location.replace(target);
      return;
    }

    router.replace(target);
    router.refresh();
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-4 bg-[linear-gradient(135deg,#0f172a_0%,#0ea5e9_100%)] text-white">
          <p className="text-xs font-semibold tracking-[0.2em]">유니버스</p>
          <div>
            <CardTitle className="text-2xl">
              {adminOnlyFlow
                ? "관리자 로그인"
                : mode === "login"
                  ? "캠퍼스 커뮤니티에 로그인"
                  : "유니버스 회원가입"}
            </CardTitle>
            <p className="mt-2 text-sm text-white/80">
              {adminOnlyFlow
                ? "관리자 권한이 있는 계정으로 로그인합니다."
                : mode === "login"
                  ? "캠퍼스 라이프 플랫폼"
                  : "가입 후 온보딩에서 학교와 유저 유형을 설정합니다."}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 py-6">
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
          {googleSignInEnabled && !adminOnlyFlow ? (
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

                  setSupabaseSessionPersistence(keepLoggedIn);
                  setKeepLoggedInPreference(keepLoggedIn);
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
          {!adminOnlyFlow ? (
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
          ) : null}
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>이메일</Label>
              <Input autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="text-xs text-rose-500">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>비밀번호</Label>
              <Input autoComplete="current-password" type="password" {...form.register("password")} />
              {form.formState.errors.password ? (
                <p className="text-xs text-rose-500">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <div className="space-y-2 rounded-[22px] border border-border bg-secondary/50 p-4">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">아이디 저장</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-indigo-600"
                  checked={saveEmail}
                  onChange={(event) => setSaveEmail(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">비밀번호 저장</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-indigo-600"
                  checked={savePassword}
                  onChange={(event) => setSavePassword(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">로그인 유지</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-indigo-600"
                  checked={keepLoggedIn}
                  onChange={(event) => setKeepLoggedIn(event.target.checked)}
                />
              </label>
            </div>
            <Button type="submit" className="w-full" disabled={pending || loading}>
              <Mail className="h-4 w-4" />
              {pending
                ? adminOnlyFlow
                  ? "로그인 중"
                  : mode === "login"
                    ? "로그인 중"
                    : "가입 중"
                : adminOnlyFlow
                  ? "관리자 로그인"
                  : mode === "login"
                    ? "로그인"
                    : "회원가입"}
            </Button>
            {!adminOnlyFlow ? (
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
            ) : null}
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
