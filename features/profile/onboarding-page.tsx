"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, ChevronDown, ChevronUp, GraduationCap, School2, Sparkles } from "lucide-react";

import { AccountRequiredCard } from "@/components/shared/account-required-card";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  userType: z.enum(["student", "applicant", "freshman"]),
  schoolId: z.string().min(1),
  schoolEmail: z.string().email("학교 메일 형식이 필요합니다.").optional().or(z.literal("")),
  department: z.string().optional(),
  grade: z.string().optional(),
  bio: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.userType === "student" && !value.schoolEmail?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["schoolEmail"],
      message: "대학생은 학교 메일 인증 정보가 필요합니다.",
    });
  }
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const normalizeEmail = (value?: string) => value?.trim().toLowerCase() ?? "";

const isAcademicSchoolEmail = (email: string) =>
  /@([^.@]+\.)*ac\.kr$/i.test(email);

export function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/home";
  const isVerificationMode = searchParams.get("mode") === "verification";
  const { currentUser, schools, loading, isAuthenticated, refresh } = useAppRuntime();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);

  const schoolOptions = useMemo(
    () => schools.map((school) => ({ id: school.id, name: school.name })),
    [schools],
  );

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      userType: isVerificationMode ? "student" : currentUser.userType,
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
  const currentSchoolEmail = normalizeEmail(currentUser.schoolEmail);
  const isMatchingVerifiedState =
    selectedUserType === "student" &&
    currentUser.studentVerificationStatus === "verified" &&
    currentUser.schoolId === selectedSchool?.id &&
    currentSchoolEmail === normalizedSchoolEmailValue;
  const isMatchingPendingState =
    selectedUserType === "student" &&
    currentUser.studentVerificationStatus === "pending" &&
    currentUser.schoolId === selectedSchool?.id &&
    currentSchoolEmail === normalizedSchoolEmailValue;
  const isMatchingRejectedState =
    selectedUserType === "student" &&
    currentUser.studentVerificationStatus === "rejected" &&
    currentUser.schoolId === selectedSchool?.id &&
    currentSchoolEmail === normalizedSchoolEmailValue;
  const canRequestCollegeVerification =
    selectedUserType === "student" &&
    Boolean(selectedSchool?.id) &&
    Boolean(normalizedSchoolEmailValue);
  const verificationInputHint = !selectedSchool?.id
    ? "학교를 먼저 선택해주세요."
    : !normalizedSchoolEmailValue
      ? "학교 메일을 입력한 뒤 인증 요청을 눌러주세요."
      : !isAcademicSchoolEmail(normalizedSchoolEmailValue)
        ? "학교 메일은 ac.kr 주소만 사용할 수 있습니다."
        : isMatchingPendingState
          ? "이미 요청한 메일이 있다면 다시 요청해 새 메일을 받을 수 있습니다."
          : "인증 메일은 버튼을 눌렀을 때만 발송됩니다.";
  const verificationPreview = getStudentVerificationBadge({
    userType: selectedUserType,
    studentVerificationStatus:
      selectedUserType !== "student"
        ? "none"
        : isMatchingVerifiedState
          ? "verified"
          : isMatchingPendingState
            ? "pending"
            : isMatchingRejectedState
              ? "rejected"
              : "unverified",
    verified: isMatchingVerifiedState,
  });
  const currentLoginEmail =
    authEmail || (currentUser.email !== "guest@univers.app" ? currentUser.email : "");
  const typeGuide =
    selectedUserType === "student"
      ? {
          icon: GraduationCap,
          title: "대학생 권한",
          description: "학교 메일 인증을 마치면 강의평, 수강신청, 미팅까지 바로 열립니다.",
        }
      : selectedUserType === "freshman"
        ? {
            icon: Sparkles,
            title: "예비입학생 시작",
            description: "새내기존과 우리학교 커뮤니티를 먼저 둘러보고 학교 분위기를 익혀보세요.",
          }
        : {
            icon: School2,
            title: "입시생 흐름",
            description: "입시 질문과 재학생 답변을 중심으로 필요한 정보만 빠르게 볼 수 있습니다.",
          };
  const TypeGuideIcon = typeGuide.icon;
  const filteredSchoolOptions = useMemo(() => {
    const normalizedQuery = schoolQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return schoolOptions;
    }

    return schoolOptions.filter((school) => school.name.toLowerCase().includes(normalizedQuery));
  }, [schoolOptions, schoolQuery]);

  useEffect(() => {
    if (loading || pending || !isAuthenticated) return;
    if (hasCompletedOnboarding(currentUser) && !isVerificationMode) {
      router.replace(nextPath);
    }
  }, [currentUser, isAuthenticated, isVerificationMode, loading, nextPath, pending, router]);

  useEffect(() => {
    if (loading) return;

    form.reset({
      userType: isVerificationMode ? "student" : currentUser.userType,
      schoolId: currentUser.schoolId ?? schoolOptions[0]?.id ?? "",
      schoolEmail: currentUser.schoolEmail ?? "",
      department: currentUser.department ?? "",
      grade: currentUser.grade ? String(currentUser.grade) : "",
      bio: currentUser.bio ?? "",
    });
    setSchoolQuery("");
    setSchoolPickerOpen(false);
  }, [
    currentUser.bio,
    currentUser.department,
    currentUser.grade,
    currentUser.schoolEmail,
    currentUser.schoolId,
    currentUser.userType,
    form,
    isVerificationMode,
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
      router.push(nextPath);
      return;
    }

    setPending(true);
    const selectedSchool = schools.find((school) => school.id === values.schoolId) ?? null;
    const normalizedSchoolEmail = normalizeEmail(values.schoolEmail);
    const keepsVerifiedStudentState =
      values.userType === "student" &&
      currentUser.studentVerificationStatus === "verified" &&
      currentUser.schoolId === values.schoolId &&
      normalizeEmail(currentUser.schoolEmail) === normalizedSchoolEmail;

    if (values.userType === "student" && !isAcademicSchoolEmail(normalizedSchoolEmail)) {
      setPending(false);
      form.setError("schoolEmail", {
        message: "학교 메일은 ac.kr 주소만 학생 인증에 사용할 수 있습니다.",
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
        values.userType === "student" ? normalizedSchoolEmail : undefined,
      schoolEmailVerifiedAt: keepsVerifiedStudentState
        ? currentUser.schoolEmailVerifiedAt
        : undefined,
      studentVerificationStatus:
        keepsVerifiedStudentState
          ? "verified"
          : values.userType === "student"
          ? normalizedSchoolEmail
            ? "pending"
            : "unverified"
          : "none",
      verified: keepsVerifiedStudentState,
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

    if (values.userType === "student" && !keepsVerifiedStudentState) {
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
      const redirectTarget = verificationResult.data?.alreadyVerified
        ? appendSearchParam(nextPath, "schoolVerified", "1")
        : appendSearchParam(nextPath, "verification", "pending");
      router.push(redirectTarget);
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
          {isVerificationMode ? (
            <div>
              <Button
                type="button"
                variant="ghost"
                className="h-auto px-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={() => router.push(nextPath)}
              >
                돌아가기
              </Button>
            </div>
          ) : null}
          <div>
            <CardTitle className="text-2xl">
              {isVerificationMode ? "학교 메일 인증" : "기본 프로필 설정"}
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {isVerificationMode
                ? "학교 메일을 확인하면 대학생 권한이 바로 열립니다."
                : "계정은 자유롭게 만들고, 대학생 권한은 학교 메일이 확인된 뒤 열립니다."}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isVerificationMode ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {["로그인", "유형 선택", "학교 선택", "메일 인증"].map((step, index) => (
                  <div
                    key={step}
                    className={`rounded-[22px] border px-3 py-3.5 text-left ${
                      index < 4 ? "border-primary/20 bg-primary/10 text-primary" : "bg-secondary"
                    }`}
                  >
                    <span className="block text-[11px] font-semibold tracking-[0.16em] text-primary/70">
                      STEP {index + 1}
                    </span>
                    <span className="mt-1.5 block text-sm font-semibold leading-5 text-balance text-foreground">
                      {step}
                    </span>
                  </div>
                ))}
              </div>

              <Card className="border-dashed bg-secondary/60 shadow-none">
                <CardContent className="flex items-start gap-3 py-4">
                  <div className="rounded-full bg-emerald-100 p-2.5 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">익명 구조 유지</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      내부적으로만 계정을 식별하고 화면에는 익명 정보만 노출됩니다.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/80 bg-[linear-gradient(135deg,#f8faff_0%,#ffffff_100%)] shadow-none">
                <CardContent className="flex items-start gap-3 py-4">
                  <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                    <TypeGuideIcon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">{typeGuide.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{typeGuide.description}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            {errorMessage ? (
              <ErrorState title="온보딩 저장 실패" description={errorMessage} />
            ) : null}
            {isVerificationMode ? (
              <div className="space-y-2">
                <Label>인증 유형</Label>
                <div className="rounded-[22px] border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
                  대학생 인증
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>유저 타입</Label>
                <Controller
                  control={form.control}
                  name="userType"
                  render={({ field }) => (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "student", label: "대학생" },
                        { value: "freshman", label: "예비입학생" },
                        { value: "applicant", label: "입시생" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`rounded-[18px] border px-3 py-3 text-sm font-medium transition-colors ${
                            field.value === option.value
                              ? "border-primary/25 bg-primary/10 text-primary"
                              : "border-border bg-background text-foreground"
                          }`}
                          onClick={() => field.onChange(option.value as OnboardingFormValues["userType"])}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                />
                {form.formState.errors.userType ? (
                  <p className="text-sm text-rose-600">
                    {form.formState.errors.userType.message}
                  </p>
                ) : null}
              </div>
            )}
            <div className="space-y-2">
              <Label>학교</Label>
              <Controller
                control={form.control}
                name="schoolId"
                render={({ field }) => (
                  <div className="space-y-2">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-[22px] border border-border bg-background px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50"
                      disabled={pending}
                      onClick={() => setSchoolPickerOpen((prev) => !prev)}
                    >
                      <span className={selectedSchool ? "text-foreground" : "text-muted-foreground"}>
                        {selectedSchool?.name ?? "학교 선택"}
                      </span>
                      {schoolPickerOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {schoolPickerOpen ? (
                      <>
                        <Input
                          value={schoolQuery}
                          onChange={(event) => setSchoolQuery(event.target.value)}
                          placeholder="학교 검색"
                          disabled={pending}
                        />
                        <div className="max-h-64 overflow-y-auto rounded-[22px] border border-border bg-background">
                          {filteredSchoolOptions.map((school) => {
                            const selected = field.value === school.id;

                            return (
                              <button
                                key={school.id}
                                type="button"
                                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                                  selected
                                    ? "bg-primary/10 font-medium text-primary"
                                    : "border-b border-gray-100 text-foreground last:border-b-0 hover:bg-gray-50"
                                }`}
                                disabled={pending}
                                onClick={() => {
                                  field.onChange(school.id);
                                  setSchoolPickerOpen(false);
                                  setSchoolQuery("");
                                }}
                              >
                                <span>{school.name}</span>
                                {selected ? <span className="text-xs">선택됨</span> : null}
                              </button>
                            );
                          })}
                          {filteredSchoolOptions.length === 0 ? (
                            <div className="px-4 py-6 text-sm text-muted-foreground">
                              검색 결과가 없습니다.
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              />
              {form.formState.errors.schoolId ? (
                <p className="text-sm text-rose-600">
                  {form.formState.errors.schoolId.message}
                </p>
              ) : null}
            </div>
            {form.watch("userType") === "student" ? (
              <div className="space-y-2">
                <Label>학교 메일</Label>
                <Input
                  placeholder="예: your-id@university.ac.kr"
                  disabled={pending}
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
                    학교 메일을 입력하고 인증 요청을 누르면 대학생 권한이 열립니다.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canRequestCollegeVerification || pending}
                >
                  {isMatchingPendingState
                    ? "학교 메일 인증 다시 요청"
                    : "학교 메일 인증 요청"}
                </Button>
                <p className="text-xs text-muted-foreground">{verificationInputHint}</p>
                <p className="text-xs text-muted-foreground">
                  인증 메일을 누르면 바로 대학생 권한으로 전환됩니다.
                </p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>학과</Label>
                <Input placeholder="예: 경영학과" disabled={pending} {...form.register("department")} />
              </div>
              <div className="space-y-2">
                <Label>학년</Label>
                <Input placeholder="예: 3" disabled={pending} {...form.register("grade")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>한줄 소개</Label>
              <Textarea
                rows={3}
                placeholder="예: 강의평과 입시 질문을 자주 봅니다."
                disabled={pending}
                {...form.register("bio")}
              />
            </div>
            {form.watch("userType") !== "student" ? (
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

function appendSearchParam(path: string, key: string, value: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}
