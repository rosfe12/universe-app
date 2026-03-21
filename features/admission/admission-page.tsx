"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Filter, MessageSquarePlus } from "lucide-react";

import { AdPlaceholderCard } from "@/components/ads/ad-placeholder-card";
import { AppShell } from "@/components/layout/app-shell";
import { FloatingComposeButton } from "@/components/shared/floating-compose-button";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { LoadingState } from "@/components/shared/loading-state";
import { ReportBlockActions } from "@/components/shared/report-block-actions";
import { SectionHeader } from "@/components/shared/section-header";
import { VisibilityLevelSelect } from "@/components/shared/visibility-level-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { createPost } from "@/app/actions/content-actions";
import { PostAuthorRow } from "@/features/common/post-author-row";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { injectInlineAdSlots } from "@/lib/ads";
import { validatePostSubmission } from "@/lib/moderation";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import {
  addBlockToSnapshot,
  addPostToSnapshot,
  addReportToSnapshot,
} from "@/lib/runtime-mutations";
import {
  getAdmissionQuestions,
  getCurrentSchool,
  getSchoolName,
  isRepeatedlyReportedUser,
} from "@/lib/mock-queries";
import {
  createBlockRecord,
  createReportRecord,
  getAuthFlowHref,
  hasCompletedOnboarding,
} from "@/lib/supabase/app-data";
import { deleteImageByPublicUrl } from "@/lib/supabase/storage";
import { getDefaultVisibilityLevel } from "@/lib/user-identity";
import type { AppRuntimeSnapshot, VisibilityLevel } from "@/types";

const admissionSchema = z.object({
  title: z.string().min(4, "질문 제목을 입력해주세요."),
  region: z.string().min(2, "지역을 입력해주세요."),
  track: z.string().min(1, "계열을 선택해주세요."),
  scoreType: z.string().min(2, "성적 정보를 입력해주세요."),
  interestUniversity: z.string().min(2, "관심 대학을 입력해주세요."),
  interestDepartment: z.string().min(2, "관심 학과를 입력해주세요."),
  content: z.string().min(10, "질문 내용을 10자 이상 입력해주세요."),
  imageUrl: z.string().url().optional().or(z.literal("")),
  visibilityLevel: z.enum(["anonymous", "school", "schoolDepartment", "profile"]),
});

type AdmissionFormValues = z.infer<typeof admissionSchema>;

export function AdmissionPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    loading,
    posts,
    reports,
    blocks,
    currentUser: runtimeUser,
    source,
    isAuthenticated,
    refresh,
    setSnapshot,
  } = useAppRuntime(initialSnapshot);
  const currentUser = runtimeUser;
  const [open, setOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [isSubmitting, startSubmitTransition] = useTransition();
  const canCompose = isAuthenticated && hasCompletedOnboarding(currentUser);
  const currentSchool = getCurrentSchool();
  const questions = useMemo(
    () => getAdmissionQuestions(),
    [blocks, posts, reports],
  );

  const form = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      title: "",
      region: "서울",
      track: "문과",
      scoreType: "",
      interestUniversity: "",
      interestDepartment: "",
      content: "",
      imageUrl: "",
      visibilityLevel: currentUser.defaultVisibilityLevel ?? getDefaultVisibilityLevel(currentUser),
    },
  });

  const filteredQuestions = useMemo(
    () =>
      questions.filter((question) => {
        const matchesSchool =
          selectedSchool === "all" || question.schoolId === selectedSchool;
        const matchesDepartment =
          departmentFilter.length === 0 ||
          question.meta?.interestDepartment
            .toLowerCase()
            .includes(departmentFilter.toLowerCase());

        return matchesSchool && matchesDepartment;
      }),
    [departmentFilter, questions, selectedSchool],
  );
  const questionFeedSlots = useMemo(
    () => injectInlineAdSlots(filteredQuestions),
    [filteredQuestions],
  );
  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const createdAt = new Date().toISOString();
    const validationError = validatePostSubmission(
      getRuntimeSnapshot(),
      {
        authorId: currentUser.id,
        category: "admission",
        title: values.title,
        content: values.content,
        createdAt,
      },
    );
    if (validationError) {
      form.setError("root", { message: validationError });
      return;
    }

    const localQuestion = {
      id: `admission-local-${questions.length + 1}`,
      category: "admission" as const,
      authorId: currentUser.id,
      schoolId: currentUser.schoolId,
      visibilityLevel: values.visibilityLevel as VisibilityLevel,
      title: values.title,
      content: values.content,
      createdAt,
      likes: 0,
      commentCount: 0,
      tags: [values.track, values.interestUniversity],
      imageUrl: values.imageUrl || undefined,
      meta: {
        region: values.region,
        track: values.track as "문과" | "이과" | "예체능" | "기타",
        scoreType: values.scoreType,
        interestUniversity: values.interestUniversity,
        interestDepartment: values.interestDepartment,
      },
    };

    if (source === "supabase" && isAuthenticated) {
      startSubmitTransition(() => {
        void (async () => {
          try {
            await createPost({
              category: "admission",
              schoolId: currentUser.schoolId,
              visibilityLevel: values.visibilityLevel,
              title: values.title,
              content: values.content,
              imageUrl: values.imageUrl || undefined,
              tags: [values.track, values.interestUniversity],
              meta: localQuestion.meta,
            });
            await refresh();
            setOpen(false);
            form.reset();
          } catch (error) {
            await deleteImageByPublicUrl(values.imageUrl);
            form.setError("root", {
              message: error instanceof Error ? error.message : "질문 등록에 실패했습니다.",
            });
          }
        })();
      });
      return;
    } else {
      setSnapshot((current) => addPostToSnapshot(current, localQuestion));
    }

    setOpen(false);
    form.reset();
  });

  return (
    <AppShell
      title="입시 Q&A"
      subtitle="구조화된 질문답변으로 입시 정보를 빠르게 찾습니다"
      topAction={
        <Button asChild size="icon" variant="ghost">
          <Link href="/home">
            <Filter className="h-5 w-5" />
          </Link>
        </Button>
      }
    >
      {loading ? <LoadingState /> : null}
      <Card className="bg-secondary/70">
        <CardContent className="space-y-3 py-5">
          <SectionHeader
            title="질문 필터"
            description="학교 / 학과 기준으로 빠르게 좁혀보세요"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger>
                <SelectValue placeholder="관심 학교" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 학교</SelectItem>
                <SelectItem value={currentUser.schoolId ?? "school-default"}>
                  {currentSchool?.name ?? "내 학교"}
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="관심 학과 검색"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        {questionFeedSlots.map((slot) => {
          if (slot.kind === "ad") {
            return <AdPlaceholderCard key={slot.id} placement={slot.placement} />;
          }

          const question = slot.item;

          return (
            <Link key={question.id} href={`/admission/${question.id}`}>
              <Card>
                <CardHeader className="space-y-4">
                  <PostAuthorRow
                    authorId={question.authorId}
                    createdAt={question.createdAt}
                    visibilityLevel={question.visibilityLevel}
                  />
                  <div className="space-y-3">
                    <div>
                      <CardTitle className="leading-snug">{question.title}</CardTitle>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {question.content}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 rounded-[24px] bg-secondary/80 p-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">지역</p>
                        <p className="mt-1 font-medium">{question.meta?.region}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">계열</p>
                        <p className="mt-1 font-medium">{question.meta?.track}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">관심 대학</p>
                        <p className="mt-1 font-medium">{question.meta?.interestUniversity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">관심 학과</p>
                        <p className="mt-1 font-medium">{question.meta?.interestDepartment}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>{getSchoolName(question.schoolId)}</span>
                    <span>답변 {question.commentCount}개</span>
                  </div>
                  <ReportBlockActions
                    compact
                    targetType="post"
                    targetId={question.id}
                    targetUserId={question.authorId}
                    repeatedlyReported={isRepeatedlyReportedUser(question.authorId)}
                    onReport={async ({ targetId, targetType, reason, memo }) => {
                      if (!targetId || !targetType) return;

                      if (source === "supabase" && isAuthenticated) {
                        await createReportRecord({
                          reporterId: currentUser.id,
                          targetType,
                          targetId,
                          reason,
                          memo,
                        });
                        await refresh();
                        return;
                      }

                      setSnapshot((current) =>
                        addReportToSnapshot(current, {
                          targetType,
                          targetId,
                          reporterId: currentUser.id,
                          reason: reason ?? "other",
                          memo,
                        }),
                      );
                    }}
                    onBlock={async ({ targetUserId }) => {
                      if (!targetUserId) return;

                      if (source === "supabase" && isAuthenticated) {
                        await createBlockRecord({
                          blockerId: currentUser.id,
                          blockedUserId: targetUserId,
                        });
                        await refresh();
                        return;
                      }

                      setSnapshot((current) =>
                        addBlockToSnapshot(current, {
                          blockerId: currentUser.id,
                          blockedUserId: targetUserId,
                        }),
                      );
                    }}
                  />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <FloatingComposeButton
          onClick={() => {
            if (!canCompose) {
              router.push(
                getAuthFlowHref({
                  isAuthenticated,
                  user: currentUser,
                  nextPath: pathname,
                }),
              );
              return;
            }

            setOpen(true);
          }}
          label="질문 작성"
        />
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>입시 질문 작성</DialogTitle>
            <DialogDescription>
              정보형 질문답변 포맷으로 정리된 질문을 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="title">질문 제목</Label>
              <Input id="title" {...form.register("title")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>지역</Label>
                <Input {...form.register("region")} />
              </div>
              <div className="space-y-2">
                <Label>문/이과</Label>
                <Select
                  value={form.watch("track")}
                  onValueChange={(value) => form.setValue("track", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="계열 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="문과">문과</SelectItem>
                    <SelectItem value="이과">이과</SelectItem>
                    <SelectItem value="예체능">예체능</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>내신 또는 수능</Label>
              <Input {...form.register("scoreType")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>관심 대학</Label>
                <Input {...form.register("interestUniversity")} />
              </div>
              <div className="space-y-2">
                <Label>관심 학과</Label>
                <Input {...form.register("interestDepartment")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>질문 내용</Label>
              <Textarea {...form.register("content")} />
            </div>
            <ImageUploadField
              label="질문 이미지"
              helperText="자료 화면이나 참고 이미지를 함께 올릴 수 있습니다."
              value={form.watch("imageUrl")}
              onChange={(url) => form.setValue("imageUrl", url, { shouldValidate: true })}
              userId={currentUser.id}
              disabled={!canCompose}
            />
            <div className="space-y-2">
              <Label>공개 범위</Label>
              <VisibilityLevelSelect
                value={form.watch("visibilityLevel")}
                onChange={(value) =>
                  form.setValue("visibilityLevel", value, { shouldValidate: true })
                }
              />
            </div>
            {form.formState.errors.root?.message ? (
              <p className="text-sm text-rose-600">{form.formState.errors.root.message}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <MessageSquarePlus className="h-4 w-4" />
              질문 등록
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
