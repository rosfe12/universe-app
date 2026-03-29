"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, ChevronDown, ChevronUp, GraduationCap, School2, Sparkles, Trash2 } from "lucide-react";

import { AccountRequiredCard } from "@/components/shared/account-required-card";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { AUTH_PENDING_BIRTH_DATE_STORAGE_KEY } from "@/lib/app-preferences";
import {
  canUseSchoolVerificationEmail,
  normalizeSchoolEmail,
} from "@/lib/school-email";
import { createClient } from "@/lib/supabase/client";
import {
  deleteStudentVerificationDocument,
  getCurrentStudentVerification,
  hasCompletedOnboarding,
  isSupabaseEnabled,
  requestStudentVerificationEmail,
  uploadStudentVerificationDocument,
  upsertUserProfile,
} from "@/lib/supabase/app-data";
import {
  generateAutoNickname,
  getDefaultVisibilityLevel,
  getStudentVerificationBadge,
} from "@/lib/user-identity";
import { getVerificationRestrictionMessage } from "@/lib/student-verification";
import type { AppRuntimeSnapshot, StudentVerification } from "@/types";

const onboardingSchema = z.object({
  userType: z.enum(["student", "applicant", "freshman"]),
  birthDate: z.string().min(1, "생년월일을 입력해주세요."),
  schoolId: z.string().min(1),
  schoolEmail: z.string().email("학교 메일 형식이 필요합니다.").optional().or(z.literal("")),
  studentNumber: z.string().optional(),
  department: z.string().optional(),
  admissionYear: z.string().optional(),
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
  if (value.userType === "student" && !value.studentNumber?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["studentNumber"],
      message: "학번을 입력해주세요.",
    });
  }
  if (value.userType === "student" && !value.department?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["department"],
      message: "학과를 입력해주세요.",
    });
  }
  if (value.userType === "student" && !value.admissionYear?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["admissionYear"],
      message: "입학년도를 입력해주세요.",
    });
  }

  const birthDate = new Date(`${value.birthDate}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["birthDate"],
      message: "생년월일 형식을 확인해주세요.",
    });
    return;
  }

  const threshold = new Date(birthDate);
  threshold.setFullYear(threshold.getFullYear() + 14);

  if (threshold > new Date()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["birthDate"],
      message: "만 14세 이상만 가입할 수 있습니다.",
    });
  }
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export function OnboardingPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/home";
  const isVerificationMode = searchParams.get("mode") === "verification";
  const { currentUser, schools, loading, isAuthenticated, refresh } = useAppRuntime(initialSnapshot, "chrome");
  const [pending, setPending] = useState(false);
  const [verificationRequestPending, setVerificationRequestPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [verificationInfo, setVerificationInfo] = useState<StudentVerification | null>(null);
  const [documentPending, setDocumentPending] = useState(false);
  const verificationRequestFlowRef = useRef(false);

  const schoolOptions = useMemo(
    () => schools.map((school) => ({ id: school.id, name: school.name })),
    [schools],
  );
  const pendingBirthDate =
    typeof window === "undefined"
      ? ""
      : window.sessionStorage.getItem(AUTH_PENDING_BIRTH_DATE_STORAGE_KEY) ?? "";

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      userType: isVerificationMode ? "student" : currentUser.userType,
      birthDate: currentUser.birthDate ?? pendingBirthDate,
      schoolId: currentUser.schoolId ?? schoolOptions[0]?.id ?? "",
      schoolEmail: currentUser.schoolEmail ?? "",
      studentNumber: currentUser.studentNumber ?? "",
      department: currentUser.department ?? "",
      admissionYear: currentUser.admissionYear ? String(currentUser.admissionYear) : "",
      grade: currentUser.grade ? String(currentUser.grade) : "",
      bio: currentUser.bio ?? "",
    },
  });
  const selectedSchool = schools.find((school) => school.id === form.watch("schoolId"));
  const selectedUserType = form.watch("userType");
  const schoolEmailValue = form.watch("schoolEmail");
  const studentNumberValue = form.watch("studentNumber");
  const departmentValue = form.watch("department");
  const admissionYearValue = form.watch("admissionYear");
  const normalizedSchoolEmailValue = normalizeSchoolEmail(schoolEmailValue);
  const currentSchoolEmail = normalizeSchoolEmail(currentUser.schoolEmail);
  const isMatchingStudentInfo =
    selectedUserType === "student" &&
    currentUser.schoolId === selectedSchool?.id &&
    currentSchoolEmail === normalizedSchoolEmailValue &&
    (currentUser.studentNumber ?? "") === (studentNumberValue?.trim() ?? "") &&
    (currentUser.department ?? "") === (departmentValue?.trim() ?? "") &&
    String(currentUser.admissionYear ?? "") === (admissionYearValue?.trim() ?? "");
  const isMatchingVerifiedState =
    selectedUserType === "student" &&
    currentUser.verificationState === "student_verified" &&
    isMatchingStudentInfo;
  const isMatchingPendingState =
    selectedUserType === "student" &&
    (currentUser.verificationState === "email_verified" ||
      currentUser.verificationState === "manual_review") &&
    isMatchingStudentInfo;
  const isMatchingRejectedState =
    selectedUserType === "student" &&
    currentUser.verificationState === "rejected" &&
    isMatchingStudentInfo;
  const canRequestCollegeVerification =
    selectedUserType === "student" &&
    Boolean(selectedSchool?.id) &&
    Boolean(normalizedSchoolEmailValue) &&
    Boolean(studentNumberValue?.trim()) &&
    Boolean(departmentValue?.trim()) &&
    Boolean(admissionYearValue?.trim());
  const verificationInputHint = !selectedSchool?.id
    ? "학교를 선택해주세요."
    : !normalizedSchoolEmailValue
      ? "학교 메일을 입력해주세요."
      : !studentNumberValue?.trim()
        ? "학번을 입력해주세요."
        : !departmentValue?.trim()
          ? "학과를 입력해주세요."
          : !admissionYearValue?.trim()
            ? "입학년도를 입력해주세요."
      : !canUseSchoolVerificationEmail(normalizedSchoolEmailValue)
          ? "학교 메일은 ac.kr 주소만 사용할 수 있어요."
        : isMatchingPendingState
          ? "인증 검토가 진행 중이에요. 필요하면 아래 자료를 추가해 주세요."
          : "인증 요청을 보내면 자동 판정이 바로 시작됩니다.";
  const verificationPreview = getStudentVerificationBadge({
    userType: selectedUserType,
    studentVerificationStatus: currentUser.studentVerificationStatus,
    verificationState:
      selectedUserType !== "student"
        ? "guest"
        : isMatchingVerifiedState
          ? "student_verified"
          : isMatchingRejectedState
            ? "rejected"
            : isMatchingPendingState
              ? (currentUser.verificationState ?? "email_verified")
              : "guest",
    verified: isMatchingVerifiedState,
  });
  const currentLoginEmail =
    authEmail || (currentUser.email !== "guest@univers.app" ? currentUser.email : "");
  const birthDateLocked = Boolean(currentUser.birthDate);
  const typeGuide =
    selectedUserType === "student"
      ? {
          icon: GraduationCap,
          title: "대학생 권한",
          description: "학교 메일 확인 뒤 학생 정보 자동 판정이 이어지며, 필요하면 추가 인증 자료를 요청합니다.",
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
    if (
      loading ||
      pending ||
      verificationRequestPending ||
      verificationRequestFlowRef.current ||
      !isAuthenticated
    ) {
      return;
    }
    if (hasCompletedOnboarding(currentUser) && !isVerificationMode) {
      router.replace(nextPath);
    }
  }, [currentUser, isAuthenticated, isVerificationMode, loading, nextPath, pending, verificationRequestPending, router]);

  useEffect(() => {
    if (loading) return;

    form.reset({
      userType: isVerificationMode ? "student" : currentUser.userType,
      birthDate: currentUser.birthDate ?? pendingBirthDate,
      schoolId: currentUser.schoolId ?? schoolOptions[0]?.id ?? "",
      schoolEmail: currentUser.schoolEmail ?? "",
      studentNumber: currentUser.studentNumber ?? "",
      department: currentUser.department ?? "",
      admissionYear: currentUser.admissionYear ? String(currentUser.admissionYear) : "",
      grade: currentUser.grade ? String(currentUser.grade) : "",
      bio: currentUser.bio ?? "",
    });
    setSchoolQuery("");
    setSchoolPickerOpen(false);
  }, [
    currentUser.bio,
    currentUser.department,
    currentUser.grade,
    currentUser.birthDate,
    currentUser.studentNumber,
    currentUser.admissionYear,
    currentUser.schoolEmail,
    currentUser.schoolId,
    currentUser.verificationState,
    currentUser.userType,
    form,
    isVerificationMode,
    loading,
    pendingBirthDate,
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

  useEffect(() => {
    if (!isAuthenticated || !isSupabaseEnabled() || selectedUserType !== "student") {
      setVerificationInfo(null);
      return;
    }

    let active = true;
    void getCurrentStudentVerification().then((result) => {
      if (!active) return;
      setVerificationInfo(result.data ?? null);
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated, selectedUserType]);

  const saveProfile = async (
    values: OnboardingFormValues,
    options?: { redirectOnSuccess?: boolean },
  ) => {
    setErrorMessage("");

    if (!isSupabaseEnabled()) {
      router.push(nextPath);
      return false;
    }

    setPending(true);
    const selectedSchool = schools.find((school) => school.id === values.schoolId) ?? null;
    const normalizedSchoolEmail = normalizeSchoolEmail(values.schoolEmail);
    const keepsVerifiedStudentState =
      values.userType === "student" &&
      currentUser.verificationState === "student_verified" &&
      isMatchingStudentInfo;
    const keepsExistingVerificationState =
      values.userType === "student" &&
      isMatchingStudentInfo &&
      currentUser.verificationState &&
      currentUser.verificationState !== "guest";

    if (values.userType === "student" && !canUseSchoolVerificationEmail(normalizedSchoolEmail)) {
      setPending(false);
      form.setError("schoolEmail", {
        message: "학교 메일 형식을 확인해주세요.",
      });
      return false;
    }

    const result = await upsertUserProfile({
      ...currentUser,
      userType: values.userType,
      birthDate: values.birthDate,
      schoolId: values.schoolId,
      nickname:
        currentUser.nickname ||
        generateAutoNickname({
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
      studentNumber: values.userType === "student" ? values.studentNumber?.trim() : undefined,
      admissionYear:
        values.userType === "student" && values.admissionYear
          ? Number(values.admissionYear)
          : undefined,
      studentVerificationStatus:
        keepsVerifiedStudentState
          ? "verified"
          : keepsExistingVerificationState
            ? currentUser.studentVerificationStatus
            : values.userType === "student"
              ? "unverified"
              : "none",
      verificationState:
        keepsVerifiedStudentState
          ? "student_verified"
          : keepsExistingVerificationState
            ? currentUser.verificationState
            : values.userType === "student"
              ? "guest"
              : "guest",
      verificationScore: keepsExistingVerificationState ? currentUser.verificationScore : 0,
      verificationRequestedAt: keepsExistingVerificationState
        ? currentUser.verificationRequestedAt
        : undefined,
      verificationReviewedAt: keepsExistingVerificationState
        ? currentUser.verificationReviewedAt
        : undefined,
      verificationRejectionReason: keepsExistingVerificationState
        ? currentUser.verificationRejectionReason
        : undefined,
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
      return false;
    }

    await refresh();
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(AUTH_PENDING_BIRTH_DATE_STORAGE_KEY);
    }
    setPending(false);
    if (options?.redirectOnSuccess !== false) {
      router.push(nextPath);
    }
    return true;
  };

  const sendVerificationRequest = async (values: OnboardingFormValues) => {
    setErrorMessage("");

    if (!isSupabaseEnabled()) {
      router.push(nextPath);
      return false;
    }

    const normalizedSchoolEmail = normalizeSchoolEmail(values.schoolEmail);

    if (!values.schoolId) {
      form.setError("schoolId", {
        message: "학교를 선택해주세요.",
      });
      return false;
    }

    if (!canUseSchoolVerificationEmail(normalizedSchoolEmail)) {
      form.setError("schoolEmail", {
        message: "학교 메일 형식을 확인해주세요.",
      });
      return false;
    }

    setPending(true);

    const verificationResult = await requestStudentVerificationEmail({
      schoolId: values.schoolId,
      schoolEmail: normalizedSchoolEmail,
      studentNumber: values.studentNumber?.trim() ?? "",
      department: values.department?.trim() ?? "",
      admissionYear: Number(values.admissionYear),
      nextPath,
    });

    setPending(false);

    if (verificationResult.error) {
      setErrorMessage(verificationResult.error.message);
      return false;
    }

    await refresh();
    const latestVerification = await getCurrentStudentVerification();
    setVerificationInfo(latestVerification.data ?? null);
    const redirectTarget = verificationResult.data?.alreadyVerified
      ? appendSearchParam(nextPath, "schoolVerified", "1")
      : appendSearchParam(nextPath, "verification", "pending");
    router.push(redirectTarget);
    return true;
  };

  const handleVerificationDocumentUpload = async (file?: File | null) => {
    if (!file) return;
    setDocumentPending(true);
    setErrorMessage("");
    try {
      await uploadStudentVerificationDocument({ file, documentType: "student_proof" });
      const latestVerification = await getCurrentStudentVerification();
      setVerificationInfo(latestVerification.data ?? null);
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "추가 인증 자료 업로드에 실패했습니다.");
    } finally {
      setDocumentPending(false);
    }
  };

  const handleVerificationDocumentDelete = async (documentId: string) => {
    setDocumentPending(true);
    setErrorMessage("");
    try {
      await deleteStudentVerificationDocument(documentId);
      const latestVerification = await getCurrentStudentVerification();
      setVerificationInfo(latestVerification.data ?? null);
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "추가 인증 자료 삭제에 실패했습니다.");
    } finally {
      setDocumentPending(false);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    await saveProfile(values);
  });

  const onRequestVerification = form.handleSubmit(async (values) => {
    verificationRequestFlowRef.current = true;
    setVerificationRequestPending(true);
    try {
      const saved = await saveProfile(values, { redirectOnSuccess: false });
      if (!saved) {
        return;
      }

      await sendVerificationRequest(values);
    } finally {
      setVerificationRequestPending(false);
    }
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
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">CAMVERSE</p>
            <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground">CAMVERSE (캠버스)</p>
          </div>
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
                ? "학교 메일 확인 후 학생 정보 자동 판정이 진행되며, 필요하면 추가 인증을 요청합니다."
                : "계정은 자유롭게 만들고, 대학생 권한은 학생 인증이 완료된 뒤 열립니다."}
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
            <div className="space-y-2">
              <Label>생년월일</Label>
              <Input
                type="date"
                autoComplete="bday"
                disabled={pending || birthDateLocked}
                {...form.register("birthDate")}
              />
              {form.formState.errors.birthDate ? (
                <p className="text-sm text-rose-600">
                  {form.formState.errors.birthDate.message}
                </p>
              ) : birthDateLocked ? (
                <p className="text-xs text-muted-foreground">
                  생년월일 변경이 필요하면 문의하기로 요청해주세요.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  만 14세 이상 여부를 확인합니다.
                </p>
              )}
            </div>
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
              <div className="space-y-4">
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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>학번</Label>
                    <Input placeholder="예: 20241234" disabled={pending} {...form.register("studentNumber")} />
                    {form.formState.errors.studentNumber ? (
                      <p className="text-sm text-rose-600">
                        {form.formState.errors.studentNumber.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>입학년도</Label>
                    <Input placeholder="예: 2024" disabled={pending} {...form.register("admissionYear")} />
                    {form.formState.errors.admissionYear ? (
                      <p className="text-sm text-rose-600">
                        {form.formState.errors.admissionYear.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>학과</Label>
                  <Input placeholder="예: 경영학과" disabled={pending} {...form.register("department")} />
                  {form.formState.errors.department ? (
                    <p className="text-sm text-rose-600">
                      {form.formState.errors.department.message}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[22px] border border-primary/15 bg-primary/5 px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">{verificationPreview.label}</p>
                  <p className="mt-1 text-muted-foreground">
                    {getVerificationRestrictionMessage(
                      verificationInfo?.verificationState ?? currentUser.verificationState,
                    )}
                  </p>
                  {verificationInfo?.decisionReason ? (
                    <p className="mt-2 text-xs text-muted-foreground">{verificationInfo.decisionReason}</p>
                  ) : null}
                  {verificationInfo?.rejectionReason ? (
                    <p className="mt-2 text-xs text-rose-600">{verificationInfo.rejectionReason}</p>
                  ) : null}
                </div>

                <Button
                  type="button"
                  className="w-full"
                  disabled={!canRequestCollegeVerification || pending}
                  onClick={() => void onRequestVerification()}
                >
                  {isMatchingPendingState ? "대학생 인증 다시 요청" : "대학생 인증 요청"}
                </Button>
                <p className="text-xs text-muted-foreground">{verificationInputHint}</p>

                {verificationInfo?.autoChecks?.length ? (
                  <div className="rounded-[22px] border border-border bg-background px-4 py-4">
                    <p className="text-sm font-semibold text-foreground">자동 판정 항목</p>
                    <div className="mt-3 space-y-2">
                      {verificationInfo.autoChecks.map((check) => (
                        <div key={check.code} className="flex items-start justify-between gap-3 text-sm">
                          <div>
                            <p className="font-medium text-foreground">{check.label}</p>
                            {check.detail ? (
                              <p className="text-xs text-muted-foreground">{check.detail}</p>
                            ) : null}
                          </div>
                          <span className={check.passed ? "text-emerald-600" : "text-rose-600"}>
                            {check.passed ? `+${check.weight}` : "실패"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {verificationInfo?.requiresDocumentUpload ||
                currentUser.verificationState === "manual_review" ||
                currentUser.verificationState === "rejected" ? (
                  <div className="rounded-[22px] border border-border bg-background px-4 py-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">추가 인증 자료 업로드</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        학생증이나 포털 재학 화면처럼 학생 확인이 가능한 자료를 올려주세요.
                        주민번호, 바코드, QR 등 민감정보는 가린 뒤 업로드해 주세요.
                      </p>
                    </div>
                    <div className="mt-3 space-y-3">
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        disabled={documentPending}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.currentTarget.value = "";
                          void handleVerificationDocumentUpload(file);
                        }}
                      />
                      <div className="space-y-2">
                        {(verificationInfo?.documents ?? []).filter((item) => item.status !== "deleted").map((document) => (
                          <div
                            key={document.id}
                            className="flex items-center justify-between gap-3 rounded-[18px] border border-border px-3 py-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {document.fileName ?? "추가 인증 자료"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {document.uploadedAt.slice(0, 16)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {document.fileUrl ? (
                                <Button asChild type="button" size="sm" variant="outline">
                                  <a href={document.fileUrl} target="_blank" rel="noreferrer">
                                    보기
                                  </a>
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                disabled={documentPending}
                                onClick={() => void handleVerificationDocumentDelete(document.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {!(verificationInfo?.documents ?? []).some((item) => item.status !== "deleted") ? (
                          <div className="rounded-[18px] border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                            아직 업로드한 추가 인증 자료가 없습니다.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {!isVerificationMode && form.watch("userType") !== "student" ? (
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
            ) : !isVerificationMode ? (
              <div className="space-y-2">
                <Label>학년</Label>
                <Input placeholder="예: 3" disabled={pending} {...form.register("grade")} />
              </div>
            ) : null}
            {!isVerificationMode ? (
              <div className="space-y-2">
                <Label>한줄 소개</Label>
                <Textarea
                  rows={3}
                  placeholder="예: 강의평과 입시 질문을 자주 봅니다."
                  disabled={pending}
                  {...form.register("bio")}
                />
              </div>
            ) : null}
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
