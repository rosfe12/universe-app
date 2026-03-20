"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { isSupabaseEnabled, upsertUserProfile, hasCompletedOnboarding } from "@/lib/supabase/app-data";
import { generateAutoNickname, getDefaultVisibilityLevel } from "@/lib/user-identity";

const onboardingSchema = z.object({
  userType: z.enum(["college", "highSchool", "parent"]),
  schoolId: z.string().min(1),
  department: z.string().optional(),
  grade: z.string().optional(),
  bio: z.string().optional(),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/home";
  const { currentUser, schools, loading, isAuthenticated, refresh } = useAppRuntime();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const schoolOptions = useMemo(
    () => schools.map((school) => ({ id: school.id, name: school.name })),
    [schools],
  );

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      userType: currentUser.userType,
      schoolId: currentUser.schoolId ?? schoolOptions[0]?.id ?? "",
      department: currentUser.department ?? "",
      grade: currentUser.grade ? String(currentUser.grade) : "",
      bio: currentUser.bio ?? "",
    },
  });

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (hasCompletedOnboarding(currentUser)) {
      router.replace(nextPath);
    }
  }, [currentUser, isAuthenticated, loading, nextPath, router]);

  useEffect(() => {
    if (loading) return;

    form.reset({
      userType: currentUser.userType,
      schoolId: currentUser.schoolId ?? schoolOptions[0]?.id ?? "",
      department: currentUser.department ?? "",
      grade: currentUser.grade ? String(currentUser.grade) : "",
      bio: currentUser.bio ?? "",
    });
  }, [
    currentUser.bio,
    currentUser.department,
    currentUser.grade,
    currentUser.schoolId,
    currentUser.userType,
    form,
    loading,
    schoolOptions,
  ]);

  const onSubmit = form.handleSubmit(async (values) => {
    setErrorMessage("");

    if (!isSupabaseEnabled()) {
      router.push("/home");
      return;
    }

    setPending(true);
    const selectedSchool = schools.find((school) => school.id === values.schoolId) ?? null;
    const result = await upsertUserProfile({
      ...currentUser,
      userType: values.userType,
      schoolId: values.schoolId,
      nickname: generateAutoNickname({
        id: currentUser.id,
        email: currentUser.email,
        school: selectedSchool,
      }),
      department: values.department?.trim() || undefined,
      grade: values.grade ? Number(values.grade) : undefined,
      bio: values.bio?.trim() || undefined,
      defaultVisibilityLevel: getDefaultVisibilityLevel({
        userType: values.userType,
        schoolId: values.schoolId,
      }),
    });
    setPending(false);

    if (result.error) {
      setErrorMessage(result.error.message);
      return;
    }

    await refresh();
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
              유저 타입과 학교만 선택하면 바로 글쓰기와 댓글을 사용할 수 있습니다.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {["로그인", "유형 선택", "학교 선택"].map((step, index) => (
              <div
                key={step}
                className={`rounded-2xl border px-3 py-3 text-center text-sm ${
                  index < 3 ? "border-primary/20 bg-primary/10 text-primary" : "bg-secondary"
                }`}
              >
                {step}
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
              <Select
                value={form.watch("userType")}
                onValueChange={(value) =>
                  form.setValue("userType", value as OnboardingFormValues["userType"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="유저 타입 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="college">대학생</SelectItem>
                  <SelectItem value="highSchool">고등학생</SelectItem>
                  <SelectItem value="parent">학부모</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>학교</Label>
              <Select
                value={form.watch("schoolId")}
                onValueChange={(value) => form.setValue("schoolId", value)}
              >
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>학과 선택 입력</Label>
                <Input placeholder="예: 경영학과" {...form.register("department")} />
              </div>
              <div className="space-y-2">
                <Label>학년 선택 입력</Label>
                <Input placeholder="예: 3" {...form.register("grade")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>한줄 소개 선택 입력</Label>
              <Textarea
                rows={3}
                placeholder="예: 강의평과 입시 질문을 자주 봅니다."
                {...form.register("bio")}
              />
            </div>
            <Button type="submit" className="w-full">
              시작하기
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
