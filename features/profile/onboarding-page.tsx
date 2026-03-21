"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";

import { AccountRequiredCard } from "@/components/shared/account-required-card";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { createClient } from "@/lib/supabase/client";
import {
  hasCompletedOnboarding,
  isSupabaseEnabled,
  requestStudentVerificationEmail,
  upsertUserProfile,
} from "@/lib/supabase/app-data";
import {
  generateAutoNickname,
  getDefaultVisibilityLevel,
  getStudentVerificationBadge,
} from "@/lib/user-identity";

const onboardingSchema = z.object({
  userType: z.enum(["college", "highSchool", "freshman"]),
  schoolId: z.string().min(1),
  schoolEmail: z.string().email("학교 메일 형식이 필요합니다.").optional().or(z.literal("")),
  department: z.string().optional(),
  grade: z.string().optional(),
  bio: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.userType === "college" && !value.schoolEmail?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["schoolEmail"],
      message: "대학생은 학교 메일 인증 정보가 필요합니다.",
    });
  }
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const normalizeEmail = (value?: string) => value?.trim().toLowerCase() ?? "";

const hasSchoolEmailDomain = (email: string, domain?: string) =>
  Boolean(email && domain && email.endsWith(`@${domain.toLowerCase()}`));

export function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/home";
  const { currentUser, schools, loading, isAuthenticated, refresh } = useAppRuntime();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [authEmail, setAuthEmail] = useState("");

  const schoolOptions = useMemo(
    () => schools.map((school) => ({ id: school.id, name: school.name })),
    [schools],
  );

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      userType: currentUser.userType,
      schoolId: currentUser.schoolId ?? schoolOptions[0]?.id ?? "",
      schoolEmail: currentUser.schoolEmail ?? "",
      department: currentUser.department ?? "",
      grade: currentUser.grade ? String(currentUser.grade) : "",
      bio: currentUser.bio ?? "",
    },
  });
  const selectedSchool = schools.find((school) => school.id === form.watch("schoolId"));
  const selectedUserType = form.watch("userType");
  const schoolEmailValue = form.watch("schoolEmail");
  const normalizedSchoolEmailValue = normalizeEmail(schoolEmailValue);
  const canRequestCollegeVerification =
    selectedUserType === "college" &&
    Boolean(selectedSchool?.id) &&
    hasSchoolEmailDomain(normalizedSchoolEmailValue, selectedSchool?.domain);
  const verificationPreview = getStudentVerificationBadge({
    userType: selectedUserType,
    studentVerificationStatus:
      selectedUserType !== "college"
        ? "none"
        : currentUser.studentVerificationStatus === "verified" &&
            normalizeEmail(currentUser.schoolEmail) === normalizedSchoolEmailValue &&
            currentUser.schoolId === selectedSchool?.id
          ? "verified"
          : normalizedSchoolEmailValue
            ? "pending"
            : "unverified",
    verified:
      selectedUserType === "college" &&
      currentUser.studentVerificationStatus === "verified" &&
      normalizeEmail(currentUser.schoolEmail) === normalizedSchoolEmailValue &&
      currentUser.schoolId === selectedSchool?.id,
  });
  const currentLoginEmail =
    authEmail || (currentUser.email !== "guest@univers.app" ? currentUser.email : "");

  useEffect(() => {
    if (loading || pending || !isAuthenticated) return;
    if (hasCompletedOnboarding(currentUser)) {
      router.replace(nextPath);
    }
  }, [currentUser, isAuthenticated, loading, nextPath, pending, router]);

  useEffect(() => {
    if (loading) return;

    form.reset({
      userType: currentUser.userType,
      schoolId: currentUser.schoolId ?? schoolOptions[0]?.id ?? "",
      schoolEmail: currentUser.schoolEmail ?? "",
      department: currentUser.department ?? "",
      grade: currentUser.grade ? String(currentUser.grade) : "",
      bio: currentUser.bio ?? "",
    });
  }, [
    currentUser.bio,
    currentUser.department,
    currentUser.grade,
    currentUser.schoolEmail,
    currentUser.schoolId,
    currentUser.userType,
    form,
    loading,
    schoolOptions,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !isSupabaseEnabled()) {
      setAuthEmail("");
      return;
    }

    let active = true;
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setAuthEmail(data.user?.email ?? "");
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const onSubmit = form.handleSubmit(async (values) => {
    setErrorMessage("");

    if (!isSupabaseEnabled()) {
      router.push("/home");
      return;
    }

    setPending(true);
    const selectedSchool = schools.find((school) => school.id === values.schoolId) ?? null;
    const normalizedSchoolEmail = normalizeEmail(values.schoolEmail);

    if (
      values.userType === "college" &&
      !hasSchoolEmailDomain(normalizedSchoolEmail, selectedSchool?.domain)
    ) {
      setPending(false);
      form.setError("schoolEmail", {
        message: `${selectedSchool?.domain ?? "학교"} 메일만 학생 인증에 사용할 수 있습니다.`,
      });
      return;
    }

    const result = await upsertUserProfile({
      ...currentUser,
      userType: values.userType,
      schoolId: values.schoolId,
      nickname: generateAutoNickname({
        id: currentUser.id,
        email: currentLoginEmail || currentUser.email,
        school: selectedSchool,
      }),
      department: values.department?.trim() || undefined,
      grade: values.grade ? Number(values.grade) : undefined,
      schoolEmail:
        values.userType === "college" ? normalizedSchoolEmail : undefined,
      schoolEmailVerifiedAt: undefined,
      studentVerificationStatus:
        values.userType === "college"
          ? normalizedSchoolEmail
            ? "pending"
            : "unverified"
          : "none",
      verified: false,
      bio: values.bio?.trim() || undefined,
      defaultVisibilityLevel: getDefaultVisibilityLevel({
        userType: values.userType,
        schoolId: values.schoolId,
      }),
    });

    if (result.error) {
      setPending(false);
      setErrorMessage(result.error.message);
      return;
    }

    if (values.userType === "college") {
      const verificationResult = await requestStudentVerificationEmail({
        schoolId: values.schoolId,
        schoolEmail: normalizedSchoolEmail,
        nextPath,
      });

      setPending(false);

      if (verificationResult.error) {
        setErrorMessage(verificationResult.error.message);
        return;
      }

      await refresh();
      router.push(
        verificationResult.data?.alreadyVerified
          ? "/profile?schoolVerified=1"
          : "/profile?verification=pending",
      );
      return;
    }

    await refresh();
    setPending(false);
    router.push(nextPath);
  });

  if (!isAuthenticated && !loading) {
    return (
      <div className="mx-auto max-w-md px-5 py-8">
        <AccountRequiredCard
          isAuthenticated={false}
          nextPath={nextPath}
          title="온보딩은 로그인 후 진행됩니다"
          description="구글 또는 이메일로 먼저 로그인한 뒤 학교와 유저 타입을 선택하세요."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-8">
      <Card>
        <CardHeader className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary">유니버스</p>
          <div>
            <CardTitle className="text-2xl">기본 프로필 설정</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              계정은 자유롭게 만들고, 대학생 권한은 학교 메일이 확인된 뒤 열립니다.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-4 gap-2">
            {["로그인", "유형 선택", "학교 선택", "메일 인증"].map((step, index) => (
              <div
                key={step}
                className={`rounded-2xl border px-2 py-3 text-center text-[11px] font-semibold leading-tight sm:px-3 sm:text-sm ${
                  index < 4 ? "border-primary/20 bg-primary/10 text-primary" : "bg-secondary"
                }`}
              >
                <span className="block whitespace-nowrap">{step}</span>
              </div>
            ))}
          </div>

          <Card className="border-dashed bg-secondary/60 shadow-none">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">익명 구조 유지</p>
                <p className="text-sm text-muted-foreground">
                  내부적으로만 계정을 식별하고 화면에는 익명 정보만 노출됩니다.
                </p>
              </div>
            </CardContent>
          </Card>

          <form className="space-y-4" onSubmit={onSubmit}>
            {pending || loading ? <LoadingState /> : null}
            {errorMessage ? (
              <ErrorState title="온보딩 저장 실패" description={errorMessage} />
            ) : null}
            <div className="space-y-2">
              <Label>유저 타입</Label>
              <Controller
                control={form.control}
                name="userType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(value as OnboardingFormValues["userType"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="유저 타입 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="college">대학생</SelectItem>
                      <SelectItem value="freshman">예비입학생</SelectItem>
                      <SelectItem value="highSchool">입시생</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.userType ? (
                <p className="text-sm text-rose-600">
                  {form.formState.errors.userType.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>학교</Label>
              <Controller
                control={form.control}
                name="schoolId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="학교 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolOptions.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.schoolId ? (
                <p className="text-sm text-rose-600">
                  {form.formState.errors.schoolId.message}
                </p>
              ) : null}
            </div>
            {form.watch("userType") === "college" ? (
              <div className="space-y-2">
                <Label>학교 메일</Label>
                <Input
                  placeholder={selectedSchool ? `예: your-id@${selectedSchool.domain}` : "학교 메일"}
                  {...form.register("schoolEmail")}
                />
                {form.formState.errors.schoolEmail ? (
                  <p className="text-sm text-rose-600">
                    {form.formState.errors.schoolEmail.message}
                  </p>
                ) : null}
                <div className="rounded-[22px] bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
                  현재 로그인 이메일: {currentLoginEmail || "로그인 이메일 확인 중"}
                </div>
                <div className="rounded-[22px] border border-primary/15 bg-primary/5 px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">{verificationPreview.label}</p>
                  <p className="mt-1 text-muted-foreground">
                    학교 메일로 인증 링크를 보내고, 확인이 끝나면 대학생 권한이 열립니다.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canRequestCollegeVerification || pending}
                >
                  {verificationPreview.status === "pending"
                    ? "학교 메일 인증 다시 요청"
                    : "학교 메일 인증 요청"}
                </Button>
                {!canRequestCollegeVerification ? (
                  <p className="text-xs text-muted-foreground">
                    학교 선택과 학교 메일 형식이 맞아야 인증 요청을 보낼 수 있습니다.
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>학과</Label>
                <Input placeholder="예: 경영학과" {...form.register("department")} />
              </div>
              <div className="space-y-2">
                <Label>학년</Label>
                <Input placeholder="예: 3" {...form.register("grade")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>한줄 소개</Label>
              <Textarea
                rows={3}
                placeholder="예: 강의평과 입시 질문을 자주 봅니다."
                {...form.register("bio")}
              />
            </div>
            {form.watch("userType") !== "college" ? (
              <Button type="submit" className="w-full">
                프로필 저장
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
