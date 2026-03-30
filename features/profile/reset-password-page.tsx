"use client";

import Link from "next/link";
import { KeyRound, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { AppFooterLinks } from "@/components/layout/app-footer-links";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  isSupabaseEnabled,
  requestPasswordReset,
  updateSupabasePassword,
} from "@/lib/supabase/app-data";
import {
  getPasswordPolicyError,
  isPasswordPolicyExemptEmail,
  PASSWORD_POLICY_EXEMPT_HELPER_TEXT,
  PASSWORD_POLICY_HELPER_TEXT,
} from "@/lib/password-policy";
import { cn } from "@/lib/utils";

const requestSchema = z.object({
  email: z.string().email("이메일 형식이 필요합니다."),
});

const updateSchema = z
  .object({
    password: z.string().min(4, "비밀번호는 4자 이상 입력해주세요."),
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

type RequestFormValues = z.infer<typeof requestSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

export function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const requestedEmail = searchParams.get("email") ?? "";
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionEmail, setSessionEmail] = useState("");

  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      email: requestedEmail,
    },
  });

  const updateForm = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }
      setHasSession(Boolean(data.session));
      setSessionEmail(data.session?.user.email ?? "");
      setSessionReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }
      setHasSession(Boolean(session));
      setSessionEmail(session?.user.email ?? "");
      setSessionReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const showUpdateForm = useMemo(() => {
    if (requestedMode === "change") {
      return true;
    }

    return hasSession;
  }, [hasSession, requestedMode]);
  const changeRequiresLogin = requestedMode === "change" && sessionReady && !hasSession;

  const onSubmitRequest = requestForm.handleSubmit(async (values) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!isSupabaseEnabled()) {
      setSuccessMessage("비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해주세요.");
      return;
    }

    setPending(true);
    const result = await requestPasswordReset(values.email);
    setPending(false);

    if (result.error) {
      setErrorMessage(result.error.message);
      return;
    }

    setSuccessMessage("비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해주세요.");
  });

  const onSubmitUpdate = updateForm.handleSubmit(async (values) => {
    setErrorMessage("");
    setSuccessMessage("");

    const passwordPolicyError = getPasswordPolicyError(values.password, sessionEmail);
    if (passwordPolicyError) {
      updateForm.setError("password", {
        message: passwordPolicyError,
      });
      return;
    }

    if (!isSupabaseEnabled()) {
      setSuccessMessage("비밀번호가 변경되었습니다.");
      return;
    }

    setPending(true);
    const result = await updateSupabasePassword(values.password);
    setPending(false);

    if (result.error) {
      setErrorMessage(result.error.message);
      return;
    }

    setSuccessMessage("비밀번호가 변경되었습니다.");
    updateForm.reset();
  });

  const title = showUpdateForm ? "비밀번호 변경" : "비밀번호 찾기";
  const description = showUpdateForm
    ? "새 비밀번호를 입력하면 바로 변경됩니다."
    : "가입한 이메일로 비밀번호 재설정 링크를 보냅니다.";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-4 bg-[linear-gradient(135deg,#0f172a_0%,#0ea5e9_100%)] text-white">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.24em]">CAMVERSE</p>
            <p className="text-[11px] font-medium tracking-[0.08em] text-white/72">CAMVERSE (캠버스)</p>
          </div>
          <div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <p className="mt-2 text-sm text-white/80">{description}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 py-6">
          {successMessage ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}
          {errorMessage ? (
            <ErrorState title={showUpdateForm ? "비밀번호 변경 실패" : "비밀번호 찾기 실패"} description={errorMessage} />
          ) : null}
          {!sessionReady && showUpdateForm ? (
            <div className="rounded-[24px] border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
              비밀번호 변경 정보를 확인하는 중입니다.
            </div>
          ) : null}
          {changeRequiresLogin ? (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                로그인 후 비밀번호를 변경할 수 있습니다.
              </div>
              <Button asChild className="w-full">
                <Link href="/login?next=/reset-password?mode=change">로그인</Link>
              </Button>
            </div>
          ) : showUpdateForm ? (
            <form className="space-y-4" onSubmit={onSubmitUpdate}>
              <div className="space-y-2">
                <Label>새 비밀번호</Label>
                <Input type="password" autoComplete="new-password" {...updateForm.register("password")} />
                {updateForm.formState.errors.password ? (
                  <p className="text-xs text-rose-500">{updateForm.formState.errors.password.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {isPasswordPolicyExemptEmail(sessionEmail)
                      ? PASSWORD_POLICY_EXEMPT_HELPER_TEXT
                      : PASSWORD_POLICY_HELPER_TEXT}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>새 비밀번호 확인</Label>
                <Input type="password" autoComplete="new-password" {...updateForm.register("confirmPassword")} />
                {updateForm.formState.errors.confirmPassword ? (
                  <p className="text-xs text-rose-500">{updateForm.formState.errors.confirmPassword.message}</p>
                ) : null}
              </div>
              <Button type="submit" className="w-full" disabled={pending || !sessionReady}>
                <KeyRound className="h-4 w-4" />
                {pending ? "변경 중" : "비밀번호 변경"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onSubmitRequest}>
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input autoComplete="email" {...requestForm.register("email")} />
                {requestForm.formState.errors.email ? (
                  <p className="text-xs text-rose-500">{requestForm.formState.errors.email.message}</p>
                ) : null}
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                <Mail className="h-4 w-4" />
                {pending ? "메일 전송 중" : "재설정 메일 보내기"}
              </Button>
            </form>
          )}
          <div className="flex items-center justify-center">
            <Link
              href={showUpdateForm ? "/profile" : "/login"}
              className={cn(
                "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              )}
            >
              {showUpdateForm ? "마이로 돌아가기" : "로그인으로 돌아가기"}
            </Link>
          </div>
        </CardContent>
      </Card>
      <div className="mt-5">
        <AppFooterLinks />
      </div>
    </div>
  );
}
