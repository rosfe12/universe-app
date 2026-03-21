"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BookOpen,
  MessageCircle,
  Repeat2,
  School,
  Sparkles,
  UtensilsCrossed,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { FloatingComposeButton } from "@/components/shared/floating-compose-button";
import { FeedPostCard } from "@/features/common/feed-post-card";
import { CommentThread } from "@/features/common/comment-thread";
import { LectureSummaryCard } from "@/features/common/lecture-summary-card";
import { PostAuthorRow } from "@/features/common/post-author-row";
import { TradePostCard } from "@/features/common/trade-post-card";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeader } from "@/components/shared/section-header";
import { VisibilityLevelSelect } from "@/components/shared/visibility-level-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPost } from "@/app/actions/content-actions";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { validatePostSubmission } from "@/lib/moderation";
import { canAccessSchoolFeatures, canWriteFreshmanZone } from "@/lib/permissions";
import { addPostToSnapshot } from "@/lib/runtime-mutations";
import {
  getCommunityPosts,
  getCurrentSchool,
  getLectureSummaries,
  getTradePosts,
} from "@/lib/mock-queries";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import { getAuthFlowHref, hasCompletedOnboarding } from "@/lib/supabase/app-data";
import { getDefaultVisibilityLevel } from "@/lib/user-identity";
import type { AppRuntimeSnapshot, Post, VisibilityLevel } from "@/types";

const freshmanZoneSchema = z.object({
  title: z.string().trim().min(4, "제목을 4자 이상 입력해주세요."),
  content: z.string().trim().min(10, "본문을 10자 이상 입력해주세요."),
  visibilityLevel: z.enum(["anonymous", "school", "schoolDepartment", "profile"]),
});

type FreshmanZoneFormValues = z.infer<typeof freshmanZoneSchema>;
type SchoolTab = "lectures" | "trade" | "club" | "food" | "freshman";

const SCHOOL_SECTIONS = [
  {
    value: "lectures",
    label: "강의",
    title: "강의 정보",
    icon: BookOpen,
    href: "/lectures",
  },
  {
    value: "trade",
    label: "수강신청",
    title: "수강신청 교환",
    icon: Repeat2,
    href: "/lectures?view=trade",
  },
  {
    value: "club",
    label: "동아리",
    title: "동아리",
    icon: Users,
    href: "/school?tab=club",
  },
  {
    value: "food",
    label: "맛집",
    title: "맛집",
    icon: UtensilsCrossed,
    href: "/school?tab=food",
  },
  {
    value: "freshman",
    label: "새내기존",
    title: "새내기존",
    icon: Sparkles,
    href: "/school?tab=freshman",
  },
] as const satisfies ReadonlyArray<{
  value: SchoolTab;
  label: string;
  title: string;
  icon: typeof BookOpen;
  href: string;
}>;

function isSchoolTab(value: string | null): value is SchoolTab {
  return SCHOOL_SECTIONS.some((section) => section.value === value);
}

export function SchoolPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: SchoolTab = isSchoolTab(tabParam) ? tabParam : "lectures";
  const {
    loading,
    lectures: runtimeLectures,
    lectureReviews,
    tradePosts: runtimeTradePosts,
    posts,
    currentUser: runtimeUser,
    isAuthenticated,
    source,
    refresh,
    setSnapshot,
  } = useAppRuntime(initialSnapshot);
  const currentUser = runtimeUser;
  const [activeTab, setActiveTab] = useState<SchoolTab>(initialTab);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const currentSchool = getCurrentSchool();
  const schoolName = currentSchool?.name ?? "건국대학교";

  useEffect(() => {
    setActiveTab(isSchoolTab(tabParam) ? tabParam : "lectures");
  }, [tabParam]);

  const lectures = useMemo(() => getLectureSummaries().slice(0, 6), [runtimeLectures, lectureReviews]);
  const tradeItems = useMemo(() => getTradePosts().slice(0, 6), [runtimeTradePosts]);
  const clubPosts = useMemo(() => getCommunityPosts("club").slice(0, 6), [posts]);
  const foodPosts = useMemo(() => getCommunityPosts("food").slice(0, 6), [posts]);
  const freshmanZonePosts = useMemo(
    () =>
      getCommunityPosts("freshman")
        .filter((post) => post.schoolId === (currentUser.schoolId ?? currentSchool?.id))
        .slice(0, 8),
    [currentSchool?.id, posts],
  );
  const freshmanComposeEnabled =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canWriteFreshmanZone(currentUser);
  const freshmanCommentEnabled = freshmanComposeEnabled;
  const freshmanDetailPost = useMemo(
    () => freshmanZonePosts.find((post) => post.id === detailPostId) ?? null,
    [detailPostId, freshmanZonePosts],
  );

  const freshmanForm = useForm<FreshmanZoneFormValues>({
    resolver: zodResolver(freshmanZoneSchema),
    defaultValues: {
      title: "",
      content: "",
      visibilityLevel: currentUser.defaultVisibilityLevel ?? getDefaultVisibilityLevel(currentUser),
    },
  });

  if (
    !loading &&
    isAuthenticated &&
    hasCompletedOnboarding(currentUser) &&
    !canAccessSchoolFeatures(currentUser)
  ) {
    return (
      <AppShell title={schoolName} subtitle="우리 학교 이야기">
        <Card className="border-dashed border-white/80 bg-white/92">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="space-y-1">
              <p className="font-semibold">고등학생 계정은 입시 게시판만 사용할 수 있습니다</p>
              <p className="text-sm text-muted-foreground">
                우리학교 탭은 대학생과 같은 학교 예비입학생 중심 기능만 제공합니다.
              </p>
            </div>
            <Button asChild>
              <Link href="/admission">입시 게시판으로 이동</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={schoolName}
      subtitle="우리 학교 이야기"
    >
      {loading ? <LoadingState /> : null}

      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.18),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,244,0.92))]">
        <CardContent className="space-y-5 py-6">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="secondary" className="bg-white/85 text-foreground">
              우리 학교 중심
            </Badge>
            <School className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-[28px] font-semibold tracking-tight text-slate-950">{schoolName}</h2>
            <p className="text-sm leading-6 text-slate-600">
              강의 정보, 수강신청 교환, 동아리, 맛집까지 학교에서 자주 찾는 메뉴를 모았습니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SCHOOL_SECTIONS.map((section) => (
              <Link key={section.value} href={`/school?tab=${section.value}`}>
                <Card className="h-full border-white/80 bg-white/86 shadow-none transition-transform hover:-translate-y-0.5">
                  <CardContent className="flex min-h-[112px] items-center gap-3 px-4 py-4">
                    <div className="shrink-0 rounded-[20px] bg-primary/10 p-3 text-primary">
                      <section.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="break-keep text-[17px] font-semibold leading-6 text-slate-950">
                        {section.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">우리 학교 전용</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SchoolTab)} className="space-y-4">
        <TabsList className="flex w-full justify-start gap-2 overflow-x-auto rounded-[28px] bg-secondary/75 p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SCHOOL_SECTIONS.map((section) => (
            <TabsTrigger
              key={section.value}
              value={section.value}
              className="h-11 shrink-0 px-4 text-[13px] font-semibold"
            >
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="lectures" className="space-y-3">
          <SectionHeader title="강의 정보" href="/lectures" />
          {lectures.map((lecture) => (
            <LectureSummaryCard key={lecture.id} lecture={lecture} href={`/lectures/${lecture.id}`} />
          ))}
          <Button asChild variant="outline" className="w-full">
            <Link href="/lectures">강의 정보 전체 보기</Link>
          </Button>
        </TabsContent>

        <TabsContent value="trade" className="space-y-3">
          <SectionHeader title="수강신청 교환" href="/lectures?view=trade" />
          {tradeItems.map((tradePost) => (
            <TradePostCard key={tradePost.id} tradePost={tradePost} />
          ))}
          <Button asChild variant="outline" className="w-full">
            <Link href="/lectures?view=trade">수강신청 교환 전체 보기</Link>
          </Button>
        </TabsContent>

        <TabsContent value="club" className="space-y-3">
          <SectionHeader title="동아리" />
          {clubPosts.map((post) => (
            <FeedPostCard key={post.id} post={post} />
          ))}
        </TabsContent>

        <TabsContent value="food" className="space-y-3">
          <SectionHeader title="맛집" />
          {foodPosts.map((post) => (
            <FeedPostCard key={post.id} post={post} />
          ))}
        </TabsContent>

        <TabsContent value="freshman" className="space-y-4">
          <Card className="overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#ecfeff_100%)]">
            <CardContent className="space-y-4 py-5">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="success">{schoolName.replace("대학교", "대")} 새내기존</Badge>
                <Sparkles className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">같은 학교 예비입학생끼리 먼저 친해지기</h3>
                <p className="text-sm leading-6 text-slate-600">
                  합격 직후 궁금한 기숙사, 수강신청 감, 오티 분위기를 익명으로 가볍게 나누는 공간입니다.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[20px] border border-emerald-200 bg-white/85 px-3 py-3">
                  <p className="text-[11px] text-muted-foreground">학교</p>
                  <p className="mt-1 text-sm font-semibold">{schoolName.replace("대학교", "대")}</p>
                </div>
                <div className="rounded-[20px] border border-emerald-200 bg-white/85 px-3 py-3">
                  <p className="text-[11px] text-muted-foreground">글 수</p>
                  <p className="mt-1 text-sm font-semibold">{freshmanZonePosts.length}개</p>
                </div>
                <div className="rounded-[20px] border border-emerald-200 bg-white/85 px-3 py-3">
                  <p className="text-[11px] text-muted-foreground">작성 권한</p>
                  <p className="mt-1 text-sm font-semibold">{freshmanComposeEnabled ? "예비입학생" : "읽기 전용"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!freshmanComposeEnabled && currentUser.userType === "college" ? (
            <Card className="border-white/80 bg-white/92">
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="space-y-1">
                  <p className="font-semibold">대학생 계정은 새내기존을 읽기 전용으로 볼 수 있습니다</p>
                  <p className="text-sm text-muted-foreground">
                    예비입학생 글을 읽고 학교 분위기를 먼저 살펴보세요.
                  </p>
                </div>
                <Badge variant="outline">읽기 전용</Badge>
              </CardContent>
            </Card>
          ) : null}

          {freshmanZonePosts.length === 0 ? (
            <EmptyState
              title="아직 새내기존 글이 없습니다"
              description="첫 글로 오티, 기숙사, 수강신청 궁금증을 먼저 열어보세요."
            />
          ) : (
            freshmanZonePosts.map((post) => (
              <div key={post.id} className="space-y-3">
                <FeedPostCard post={post} />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setDetailPostId(post.id)}
                >
                  <MessageCircle className="h-4 w-4" />
                  댓글 보기
                </Button>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(freshmanDetailPost)}
        onOpenChange={(next) => !next && setDetailPostId(null)}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          {freshmanDetailPost ? (
            <>
              <DialogHeader>
                <DialogTitle>{freshmanDetailPost.title}</DialogTitle>
                <DialogDescription>{schoolName.replace("대학교", "대")} 새내기존</DialogDescription>
              </DialogHeader>
              <Card className="shadow-none">
                <CardContent className="space-y-4 py-5">
                  <PostAuthorRow
                    authorId={freshmanDetailPost.authorId}
                    createdAt={freshmanDetailPost.createdAt}
                    visibilityLevel={freshmanDetailPost.visibilityLevel}
                    trailing={<Badge variant="success">새내기존</Badge>}
                  />
                  <div className="rounded-[22px] bg-secondary/55 px-4 py-4">
                    <p className="text-sm leading-7 text-muted-foreground">{freshmanDetailPost.content}</p>
                  </div>
                </CardContent>
              </Card>
              <CommentThread
                postId={freshmanDetailPost.id}
                canCommentOverride={freshmanCommentEnabled}
                accountRequiredTitle={
                  isAuthenticated
                    ? "새내기존 댓글은 같은 학교 예비입학생만 작성할 수 있습니다"
                    : "로그인 후 새내기존 댓글을 볼 수 있습니다"
                }
                accountRequiredDescription={
                  isAuthenticated
                    ? "예비입학생 계정으로 온보딩을 마친 뒤 댓글을 남길 수 있습니다."
                    : "읽기는 자유롭게, 댓글은 예비입학생 계정 로그인 후 이용할 수 있습니다."
                }
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{schoolName.replace("대학교", "대")} 새내기존 글쓰기</DialogTitle>
            <DialogDescription>예비입학생끼리 입학 전 궁금한 점과 생활 팁을 익명으로 나눌 수 있습니다.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={freshmanForm.handleSubmit(async (values) => {
              freshmanForm.clearErrors("root");
              const createdAt = new Date().toISOString();
              const validationError = validatePostSubmission(getRuntimeSnapshot(), {
                authorId: currentUser.id,
                category: "community",
                title: values.title,
                content: values.content,
                createdAt,
              });

              if (validationError) {
                freshmanForm.setError("root", { message: validationError });
                return;
              }

              const localPost: Post = {
                id: `freshman-zone-local-${freshmanZonePosts.length + 1}`,
                category: "community",
                subcategory: "freshman",
                authorId: currentUser.id,
                schoolId: currentUser.schoolId,
                visibilityLevel: values.visibilityLevel as VisibilityLevel,
                title: values.title,
                content: values.content,
                createdAt,
                likes: 0,
                commentCount: 0,
                tags: ["새내기존", schoolName.replace("대학교", "대")],
              };

              if (source === "supabase" && isAuthenticated) {
                startSubmitTransition(() => {
                  void (async () => {
                    try {
                      await createPost({
                        category: "community",
                        subcategory: "freshman",
                        schoolId: currentUser.schoolId,
                        visibilityLevel: values.visibilityLevel,
                        title: values.title,
                        content: values.content,
                        tags: ["새내기존", schoolName.replace("대학교", "대")],
                      });
                      await refresh();
                      freshmanForm.reset({
                        title: "",
                        content: "",
                        visibilityLevel:
                          currentUser.defaultVisibilityLevel ?? getDefaultVisibilityLevel(currentUser),
                      });
                      setComposerOpen(false);
                    } catch (error) {
                      freshmanForm.setError("root", {
                        message: error instanceof Error ? error.message : "새내기존 글 작성에 실패했습니다.",
                      });
                    }
                  })();
                });
                return;
              }

              setSnapshot((current) => addPostToSnapshot(current, localPost));
              freshmanForm.reset({
                title: "",
                content: "",
                visibilityLevel:
                  currentUser.defaultVisibilityLevel ?? getDefaultVisibilityLevel(currentUser),
              });
              setComposerOpen(false);
            })}
          >
            <div className="space-y-2">
              <Label>제목</Label>
              <Input placeholder="예: 오티 복장 어느 정도로 맞추나요?" {...freshmanForm.register("title")} />
              {freshmanForm.formState.errors.title ? (
                <p className="text-xs text-rose-500">{freshmanForm.formState.errors.title.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea
                rows={5}
                placeholder="기숙사, 오티, 시간표, 친구 사귀기처럼 입학 전 궁금한 내용을 적어보세요."
                {...freshmanForm.register("content")}
              />
              {freshmanForm.formState.errors.content ? (
                <p className="text-xs text-rose-500">{freshmanForm.formState.errors.content.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>공개 범위</Label>
              <VisibilityLevelSelect
                value={freshmanForm.watch("visibilityLevel")}
                onChange={(value) =>
                  freshmanForm.setValue("visibilityLevel", value, { shouldValidate: true })
                }
              />
            </div>
            {freshmanForm.formState.errors.root?.message ? (
              <p className="text-xs text-rose-500">{freshmanForm.formState.errors.root.message}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "등록 중" : "새내기존에 올리기"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {!isAuthenticated || currentUser.userType === "freshman" ? (
        <FloatingComposeButton
          onClick={() => {
            if (!freshmanComposeEnabled) {
              window.location.href = getAuthFlowHref({
                isAuthenticated,
                user: currentUser,
                nextPath: "/school?tab=freshman",
              });
              return;
            }

            setActiveTab("freshman");
            setComposerOpen(true);
          }}
          label="새내기존 글쓰기"
        />
      ) : null}
    </AppShell>
  );
}
