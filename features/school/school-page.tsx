"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BookOpen,
  GraduationCap,
  Repeat2,
  School,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";

import { createPost } from "@/app/actions/content-actions";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { FeedList } from "@/components/shared/feed-list";
import { FloatingComposeButton } from "@/components/shared/floating-compose-button";
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
import { CommentThread } from "@/features/common/comment-thread";
import { FeedPostCard } from "@/features/common/feed-post-card";
import { LectureSummaryCard } from "@/features/common/lecture-summary-card";
import { PostAuthorRow } from "@/features/common/post-author-row";
import { TradePostCard } from "@/features/common/trade-post-card";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { validatePostSubmission } from "@/lib/moderation";
import {
  canWriteAdmissionQuestion,
  canWriteFreshmanZone,
} from "@/lib/permissions";
import { addPostToSnapshot } from "@/lib/runtime-mutations";
import {
  getAdmissionQuestions,
  getCommentsByPostId,
  getCommunityPosts,
  getCurrentSchool,
  getLectureSummaries,
  getTradePosts,
} from "@/lib/mock-queries";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import { getAuthFlowHref, hasCompletedOnboarding } from "@/lib/supabase/app-data";
import { getDefaultVisibilityLevel, getSchoolShortName } from "@/lib/user-identity";
import { getPostViewCount } from "@/lib/utils";
import type { AppRuntimeSnapshot, Post, VisibilityLevel } from "@/types";

const freshmanZoneSchema = z.object({
  title: z.string().trim().min(4, "제목을 4자 이상 입력해주세요."),
  content: z.string().trim().min(10, "본문을 10자 이상 입력해주세요."),
  visibilityLevel: z.enum(["anonymous", "school", "schoolDepartment", "profile"]),
});

const schoolAdmissionSchema = z.object({
  title: z.string().trim().min(4, "제목을 4자 이상 입력해주세요."),
  region: z.string().trim().min(2, "지역을 입력해주세요."),
  track: z.enum(["문과", "이과", "예체능", "기타"]),
  scoreType: z.string().trim().min(2, "성적 정보를 입력해주세요."),
  interestDepartment: z.string().trim().min(2, "관심 학과를 입력해주세요."),
  content: z.string().trim().min(10, "질문 내용을 10자 이상 입력해주세요."),
  visibilityLevel: z.enum(["anonymous", "school", "schoolDepartment", "profile"]),
});

type FreshmanZoneFormValues = z.infer<typeof freshmanZoneSchema>;
type SchoolAdmissionFormValues = z.infer<typeof schoolAdmissionSchema>;
type SchoolSection = "lectures" | "trade" | "club" | "food" | "freshman" | "admission";

const SECTION_VALUES: SchoolSection[] = [
  "lectures",
  "trade",
  "club",
  "food",
  "freshman",
  "admission",
];

function isSchoolSection(value: string | null): value is SchoolSection {
  return Boolean(value && SECTION_VALUES.includes(value as SchoolSection));
}

function matchesSchoolAdmission(post: Post, schoolId?: string, schoolName?: string) {
  const shortName = getSchoolShortName(schoolName);
  return (
    post.schoolId === schoolId ||
    post.meta?.interestUniversity?.includes(schoolName ?? "") ||
    post.meta?.interestUniversity?.includes(shortName)
  );
}

export function SchoolPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const highlightSection: SchoolSection | null = isSchoolSection(tabParam)
    ? tabParam
    : null;
  const {
    loading,
    currentUser: runtimeUser,
    isAuthenticated,
    source,
    refresh,
    setSnapshot,
  } = useAppRuntime(initialSnapshot);
  const currentUser = runtimeUser;
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [admissionComposerOpen, setAdmissionComposerOpen] = useState(false);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const currentSchool = getCurrentSchool();
  const schoolId = currentUser.schoolId;
  const schoolName = currentSchool?.name ?? "우리학교";
  const schoolShortName = getSchoolShortName(schoolName);
  const isApplicantMode = currentUser.userType === "highSchool";

  const lectures = getLectureSummaries()
    .filter((lecture) => !schoolId || lecture.schoolId === schoolId)
    .slice(0, 4);
  const tradeItems = getTradePosts()
    .filter((tradePost) => !schoolId || tradePost.schoolId === schoolId)
    .slice(0, 3);
  const clubPosts = getCommunityPosts("club")
    .filter((post) => !schoolId || post.schoolId === schoolId)
    .slice(0, 5);
  const foodPosts = getCommunityPosts("food")
    .filter((post) => !schoolId || post.schoolId === schoolId)
    .slice(0, 5);
  const freshmanZonePosts = getCommunityPosts("freshman")
    .filter((post) => !schoolId || post.schoolId === schoolId)
    .slice(0, 4);
  const admissionPosts = getAdmissionQuestions()
    .filter((post) => matchesSchoolAdmission(post, schoolId, schoolName))
    .slice(0, 4);
  const freshmanComposeEnabled =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canWriteFreshmanZone(currentUser);
  const freshmanCommentEnabled = freshmanComposeEnabled;
  const admissionWriteEnabled =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canWriteAdmissionQuestion(currentUser);
  const freshmanDetailPost = useMemo(
    () => freshmanZonePosts.find((post) => post.id === detailPostId) ?? null,
    [detailPostId, freshmanZonePosts],
  );
  const campusInfoCards = useMemo(
    () =>
      [
        ...clubPosts.map((post) => ({ ...post, boardLabel: "동아리" as const })),
        ...foodPosts.map((post) => ({ ...post, boardLabel: "맛집" as const })),
      ].sort((a, b) => b.likes - a.likes || b.commentCount - a.commentCount),
    [clubPosts, foodPosts],
  );

  const freshmanForm = useForm<FreshmanZoneFormValues>({
    resolver: zodResolver(freshmanZoneSchema),
    defaultValues: {
      title: "",
      content: "",
      visibilityLevel: currentUser.defaultVisibilityLevel ?? getDefaultVisibilityLevel(currentUser),
    },
  });
  const admissionForm = useForm<SchoolAdmissionFormValues>({
    resolver: zodResolver(schoolAdmissionSchema),
    defaultValues: {
      title: "",
      region: "서울",
      track: "문과",
      scoreType: "",
      interestDepartment: "",
      content: "",
      visibilityLevel: currentUser.defaultVisibilityLevel ?? getDefaultVisibilityLevel(currentUser),
    },
  });

  const quickTools = isApplicantMode
    ? [
        {
          key: "admission" as const,
          label: "입시 Q&A",
          icon: GraduationCap,
          href: "/school?tab=admission",
        },
        {
          key: "freshman" as const,
          label: "새내기 게시판",
          icon: Sparkles,
          href: "/school?tab=freshman",
        },
        {
          key: "lectures" as const,
          label: "강의정보",
          icon: BookOpen,
          href: "/lectures",
        },
        {
          key: "club" as const,
          label: "동아리",
          icon: Users,
          href: "/school?tab=club",
        },
      ]
    : [
        {
          key: "lectures" as const,
          label: "강의정보",
          icon: BookOpen,
          href: "/lectures",
        },
        {
          key: "trade" as const,
          label: "수강신청 교환",
          icon: Repeat2,
          href: "/trade",
        },
        {
          key: "freshman" as const,
          label: "새내기 게시판",
          icon: Sparkles,
          href: "/school?tab=freshman",
        },
        {
          key: "admission" as const,
          label: "입시 Q&A",
          icon: GraduationCap,
          href: "/school?tab=admission",
        },
      ];

  if (!loading && !isAuthenticated) {
    return (
      <AppShell title="우리학교">
        <Card className="border-dashed border-white/80 bg-white/92">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="space-y-1">
              <p className="font-semibold">로그인 후 우리학교가 열립니다</p>
            </div>
            <Button asChild>
              <Link href={getAuthFlowHref({ isAuthenticated, user: currentUser, nextPath: "/school" })}>
                로그인하기
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (!loading && isAuthenticated && !hasCompletedOnboarding(currentUser)) {
    return (
      <AppShell title="우리학교">
        <Card className="border-dashed border-white/80 bg-white/92">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="space-y-1">
              <p className="font-semibold">학교를 먼저 선택해주세요</p>
            </div>
            <Button asChild>
              <Link href="/onboarding">학교 선택하기</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (!loading && isAuthenticated && (!schoolId || !currentSchool)) {
    return (
      <AppShell title={isApplicantMode ? "지망학교" : "우리학교"}>
        <Card className="border-dashed border-white/80 bg-white/92">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="space-y-1">
              <p className="font-semibold">학교를 선택하면 학교 전용 공간이 열립니다</p>
            </div>
            <Button asChild>
              <Link href="/profile">프로필 설정하기</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title={isApplicantMode ? "지망학교" : "우리학교"}>
      {loading ? <LoadingState /> : null}

      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.14),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.94))]">
        <CardContent className="space-y-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <Badge variant={isApplicantMode ? "warning" : "secondary"} className="bg-white/85 text-foreground">
              {isApplicantMode ? "지망학교 모드" : "캠퍼스 라이브"}
            </Badge>
            <School className="h-5 w-5 text-primary" />
          </div>

          <div className="space-y-3">
            <h2 className="text-[30px] font-semibold tracking-tight text-slate-950 text-balance">
              {schoolName}
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[20px] border border-white/80 bg-white/90 px-4 py-3">
                <p className="text-[11px] text-muted-foreground">새내기 글</p>
                <p className="mt-1 text-[18px] font-semibold text-foreground">{freshmanZonePosts.length}</p>
              </div>
              <div className="rounded-[20px] border border-white/80 bg-white/90 px-4 py-3">
                <p className="text-[11px] text-muted-foreground">입시 질문</p>
                <p className="mt-1 text-[18px] font-semibold text-foreground">{admissionPosts.length}</p>
              </div>
              <div className="rounded-[20px] border border-white/80 bg-white/90 px-4 py-3">
                <p className="text-[11px] text-muted-foreground">강의</p>
                <p className="mt-1 text-[18px] font-semibold text-foreground">{lectures.length}</p>
              </div>
            </div>
          </div>

          {isApplicantMode ? (
            <div className="flex gap-3">
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  if (!admissionWriteEnabled) {
                    router.push(
                      getAuthFlowHref({
                        isAuthenticated,
                        user: currentUser,
                        nextPath: "/school?tab=admission",
                      }),
                    );
                    return;
                  }
                  setAdmissionComposerOpen(true);
                }}
              >
                질문하기
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/school?tab=freshman")}
              >
                새내기 글 보기
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <SectionHeader title="퀵 메뉴" />
        <div className="grid grid-cols-2 gap-3">
          {quickTools.map((tool) => (
            <Link key={tool.key} href={tool.href} className="block">
              <Card
                className={
                  highlightSection === tool.key
                    ? "border-primary/30 bg-primary/5 shadow-[0_20px_46px_-32px_rgba(99,102,241,0.38)]"
                    : "border-white/85 bg-white/94 shadow-none"
                }
              >
                <CardContent className="flex min-h-[118px] flex-col items-start justify-between gap-3 py-5">
                  <div className="rounded-[18px] bg-primary/10 p-3 text-primary">
                    <tool.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[17px] font-semibold leading-6 text-slate-950">{tool.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="캠퍼스 라이브" />

        <div
          className={
            highlightSection === "freshman"
              ? "rounded-[32px] border border-emerald-200/80 bg-emerald-50/40 p-4"
              : "space-y-4"
          }
        >
          <SectionHeader title="새내기 게시판" />
          {freshmanZonePosts.length === 0 ? (
            <EmptyState
              title="아직 새내기 글이 없습니다"
              description="오티, 기숙사, 시간표처럼 입학 전에 궁금한 내용을 가장 먼저 올려보세요."
            />
          ) : (
            <FeedList>
              {freshmanZonePosts.map((post) => (
                <FeedPostCard key={post.id} post={post} onOpen={() => setDetailPostId(post.id)} />
              ))}
            </FeedList>
          )}
        </div>

        <div
          className={
            highlightSection === "admission"
              ? "rounded-[32px] border border-amber-200/80 bg-amber-50/40 p-4"
              : "space-y-4"
          }
        >
          <div className="flex items-center justify-between gap-3">
            <SectionHeader title="입시 Q&A" />
            <Button
              type="button"
              size="sm"
              variant={isApplicantMode ? "default" : "outline"}
              onClick={() => {
                if (!admissionWriteEnabled) {
                  router.push(
                    getAuthFlowHref({
                      isAuthenticated,
                      user: currentUser,
                      nextPath: "/school?tab=admission",
                    }),
                  );
                  return;
                }
                setAdmissionComposerOpen(true);
              }}
            >
              질문하기
            </Button>
          </div>
          {admissionPosts.length === 0 ? (
            <EmptyState
              title={`${schoolShortName} 입시 질문이 아직 없습니다`}
              description="이 학교를 목표로 준비 중이라면 첫 질문을 남겨보세요."
              actionLabel="질문 남기기"
            />
          ) : (
            <FeedList>
              {admissionPosts.map((post) => (
                <FeedPostCard key={post.id} post={post} href={`/admission/${post.id}`} />
              ))}
            </FeedList>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="강의 정보" href="/lectures" />
        {lectures.length === 0 ? (
          <EmptyState
            title="아직 강의 정보가 없습니다"
            description="학교 강의 리뷰가 쌓이면 여기에 바로 보입니다."
            actionLabel="강의 보러 가기"
            href="/lectures"
          />
        ) : (
          <div className="space-y-3">
            {lectures.map((lecture) => (
              <LectureSummaryCard key={lecture.id} lecture={lecture} href={`/lectures/${lecture.id}`} />
            ))}
          </div>
        )}
      </section>

      {!isApplicantMode ? (
        <section
          className={
            highlightSection === "trade"
              ? "rounded-[32px] border border-violet-200/80 bg-violet-50/30 p-4"
              : "space-y-4"
          }
        >
          <SectionHeader title="수강신청 교환" href="/trade" />
          {tradeItems.length === 0 ? (
            <EmptyState
              title="아직 교환 글이 없습니다"
              description="같은 학교 교환 글이 올라오면 바로 이어서 볼 수 있습니다."
              actionLabel="교환 게시판 보기"
              href="/trade"
            />
          ) : (
            <div className="space-y-3">
              {tradeItems.map((tradePost) => (
                <TradePostCard key={tradePost.id} tradePost={tradePost} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionHeader title="탐색" />
        {campusInfoCards.length === 0 ? (
          <EmptyState
            title="둘러볼 학교 생활 글이 아직 없습니다"
            description="동아리 모집과 학교 주변 맛집 글이 차례로 보이게 됩니다."
          />
        ) : (
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {campusInfoCards.map((post) => (
              <Link
                key={`${post.boardLabel}-${post.id}`}
                href={post.boardLabel === "동아리" ? "/community" : "/school?tab=food"}
                className="block min-w-[280px] snap-start"
              >
                <Card
                  className={
                    highlightSection === (post.boardLabel === "동아리" ? "club" : "food")
                      ? "h-full border-primary/25 bg-primary/5"
                      : "h-full border-white/85 bg-white/94"
                  }
                >
                  <CardContent className="space-y-4 py-5">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant={post.boardLabel === "동아리" ? "secondary" : "warning"}>
                        {post.boardLabel}
                      </Badge>
                      {post.boardLabel === "동아리" ? (
                        <Users className="h-4 w-4 text-primary" />
                      ) : (
                        <UtensilsCrossed className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[18px] font-semibold leading-7 text-slate-950 line-clamp-2">
                        {post.title}
                      </p>
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {post.content}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>조회수 {getPostViewCount(post)}</span>
                      <span>좋아요 {post.likes}</span>
                      <span>댓글 {getCommentsByPostId(post.id).length}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(freshmanDetailPost)}
        onOpenChange={(next) => !next && setDetailPostId(null)}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          {freshmanDetailPost ? (
            <>
              <DialogHeader>
                <DialogTitle>{freshmanDetailPost.title}</DialogTitle>
                <DialogDescription>{schoolShortName} 새내기 게시판</DialogDescription>
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

      <Dialog open={admissionComposerOpen} onOpenChange={setAdmissionComposerOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{schoolShortName} 입시 질문하기</DialogTitle>
            <DialogDescription>지망학교 기준으로 궁금한 점을 바로 남길 수 있습니다.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={admissionForm.handleSubmit(async (values) => {
              admissionForm.clearErrors("root");
              const createdAt = new Date().toISOString();
              const validationError = validatePostSubmission(getRuntimeSnapshot(), {
                authorId: currentUser.id,
                category: "admission",
                title: values.title,
                content: values.content,
                createdAt,
              });

              if (validationError) {
                admissionForm.setError("root", { message: validationError });
                return;
              }

              const meta = {
                region: values.region,
                track: values.track,
                scoreType: values.scoreType,
                interestUniversity: schoolName,
                interestDepartment: values.interestDepartment,
              };

              const localPost: Post = {
                id: `school-admission-local-${admissionPosts.length + 1}`,
                category: "admission",
                authorId: currentUser.id,
                schoolId: currentUser.schoolId,
                visibilityLevel: values.visibilityLevel as VisibilityLevel,
                title: values.title,
                content: values.content,
                createdAt,
                likes: 0,
                commentCount: 0,
                tags: [values.track, schoolShortName],
                meta,
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
                        tags: [values.track, schoolShortName],
                        meta,
                      });
                      await refresh();
                      admissionForm.reset({
                        title: "",
                        region: "서울",
                        track: "문과",
                        scoreType: "",
                        interestDepartment: "",
                        content: "",
                        visibilityLevel:
                          currentUser.defaultVisibilityLevel ?? getDefaultVisibilityLevel(currentUser),
                      });
                      setAdmissionComposerOpen(false);
                    } catch (error) {
                      admissionForm.setError("root", {
                        message: error instanceof Error ? error.message : "입시 질문 등록에 실패했습니다.",
                      });
                    }
                  })();
                });
                return;
              }

              setSnapshot((current) => addPostToSnapshot(current, localPost));
              admissionForm.reset({
                title: "",
                region: "서울",
                track: "문과",
                scoreType: "",
                interestDepartment: "",
                content: "",
                visibilityLevel:
                  currentUser.defaultVisibilityLevel ?? getDefaultVisibilityLevel(currentUser),
              });
              setAdmissionComposerOpen(false);
            })}
          >
            <div className="space-y-2">
              <Label>제목</Label>
              <Input placeholder="예: 이 학교 교과전형 면접 분위기 궁금해요" {...admissionForm.register("title")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>지역</Label>
                <Input {...admissionForm.register("region")} />
              </div>
              <div className="space-y-2">
                <Label>계열</Label>
                <Input {...admissionForm.register("track")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>성적 정보</Label>
              <Input placeholder="예: 내신 2.3 / 수능 수학 2등급" {...admissionForm.register("scoreType")} />
            </div>
            <div className="space-y-2">
              <Label>관심 학과</Label>
              <Input placeholder="예: 경영학과" {...admissionForm.register("interestDepartment")} />
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea rows={5} placeholder="궁금한 포인트를 구체적으로 적어주세요." {...admissionForm.register("content")} />
            </div>
            <div className="space-y-2">
              <Label>공개 범위</Label>
              <VisibilityLevelSelect
                value={admissionForm.watch("visibilityLevel")}
                onChange={(value) =>
                  admissionForm.setValue("visibilityLevel", value, { shouldValidate: true })
                }
              />
            </div>
            {admissionForm.formState.errors.root?.message ? (
              <p className="text-xs text-rose-500">{admissionForm.formState.errors.root.message}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "등록 중" : "질문 올리기"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{schoolShortName} 새내기 게시판 글쓰기</DialogTitle>
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
                tags: ["새내기존", schoolShortName],
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
                        tags: ["새내기존", schoolShortName],
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
                        message: error instanceof Error ? error.message : "새내기 게시판 글 작성에 실패했습니다.",
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
              {isSubmitting ? "등록 중" : "새내기 게시판에 올리기"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {!isAuthenticated || currentUser.userType === "freshman" || isApplicantMode ? (
        <FloatingComposeButton
          onClick={() => {
            if (isApplicantMode) {
              if (!admissionWriteEnabled) {
                window.location.href = getAuthFlowHref({
                  isAuthenticated,
                  user: currentUser,
                  nextPath: "/school?tab=admission",
                });
                return;
              }
              router.push("/admission");
              return;
            }

            if (!freshmanComposeEnabled) {
              window.location.href = getAuthFlowHref({
                isAuthenticated,
                user: currentUser,
                nextPath: "/school?tab=freshman",
              });
              return;
            }

            setComposerOpen(true);
          }}
          label={isApplicantMode ? "질문하기" : "새내기 글쓰기"}
        />
      ) : null}
    </AppShell>
  );
}
