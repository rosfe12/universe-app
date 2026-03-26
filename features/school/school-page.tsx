"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BookOpen,
  Eye,
  GraduationCap,
  Heart,
  ChevronDown,
  Check,
  MessageCircle,
  Repeat2,
  School,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";

import { createPost, deletePost } from "@/app/actions/content-actions";
import { AppShell } from "@/components/layout/app-shell";
import { ActionFeedbackBanner } from "@/components/shared/action-feedback-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FeedList } from "@/components/shared/feed-list";
import { FloatingComposeButton } from "@/components/shared/floating-compose-button";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeader } from "@/components/shared/section-header";
import { ShareActionGroup } from "@/components/shared/share-action-group";
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
import { STANDARD_VISIBILITY_LEVELS } from "@/lib/constants";
import { validatePostSubmission } from "@/lib/moderation";
import {
  canWriteAdmissionQuestion,
  canWriteFreshmanZone,
} from "@/lib/permissions";
import { addPostToSnapshot, removePostFromSnapshot } from "@/lib/runtime-mutations";
import { isMasterAdminEmail } from "@/lib/admin/master-admin-shared";
import {
  getAdmissionQuestion,
  getCommentsByPostId,
  getLectureReviews,
  getSchoolScopedAdmissionQuestions,
  getSchoolScopedCommunityPosts,
  getSchoolScopedLectureSummaries,
  getSchoolScopedTradePosts,
} from "@/lib/mock-queries";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import {
  getAuthFlowHref,
  hasCompletedOnboarding,
  invalidateClientRuntimeSnapshots,
  upsertUserProfile,
} from "@/lib/supabase/app-data";
import {
  getSchoolShortName,
  getStandardVisibilityLevel,
} from "@/lib/user-identity";
import { getPostViewCount } from "@/lib/utils";
import { createPostSharePayload } from "@/lib/share-utils";
import type { AppRuntimeSnapshot, Post, VisibilityLevel } from "@/types";

const freshmanZoneSchema = z.object({
  title: z.string().trim().min(4, "제목을 4자 이상 입력해주세요."),
  content: z.string().trim().min(10, "본문을 10자 이상 입력해주세요."),
  visibilityLevel: z.enum(["school", "schoolDepartment"]),
});

const schoolAdmissionSchema = z.object({
  title: z.string().trim().min(4, "제목을 4자 이상 입력해주세요."),
  region: z.string().trim().min(2, "지역을 입력해주세요."),
  track: z.enum(["문과", "이과", "예체능", "기타"]),
  scoreType: z.string().trim().min(2, "성적 정보를 입력해주세요."),
  interestDepartment: z.string().trim().min(2, "관심 학과를 입력해주세요."),
  content: z.string().trim().min(10, "질문 내용을 10자 이상 입력해주세요."),
  visibilityLevel: z.enum(["school", "schoolDepartment"]),
});

const schoolBoardSchema = z.object({
  title: z.string().trim().min(4, "제목을 4자 이상 입력해주세요."),
  content: z.string().trim().min(10, "본문을 10자 이상 입력해주세요."),
  visibilityLevel: z.enum(["school", "schoolDepartment"]),
});

type SchoolBoardFormValues = z.infer<typeof schoolBoardSchema>;
type FreshmanZoneFormValues = z.infer<typeof freshmanZoneSchema>;
type SchoolAdmissionFormValues = z.infer<typeof schoolAdmissionSchema>;
type SchoolSection =
  | "lectures"
  | "trade"
  | "club"
  | "food"
  | "school"
  | "freshman"
  | "admission";

const SECTION_VALUES: SchoolSection[] = [
  "lectures",
  "trade",
  "club",
  "food",
  "school",
  "freshman",
  "admission",
];
const RECENT_ACTIVITY_DAYS = 14;

function isRecentActivity(createdAt: string, days = RECENT_ACTIVITY_DAYS) {
  return Date.now() - new Date(createdAt).getTime() <= days * 24 * 60 * 60 * 1000;
}

function formatRecentCount(count: number) {
  return `+${count}`;
}

function isSchoolSection(value: string | null): value is SchoolSection {
  return Boolean(value && SECTION_VALUES.includes(value as SchoolSection));
}

export function SchoolPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const detailParam = searchParams.get("post");
  const highlightSection: SchoolSection | null = isSchoolSection(tabParam)
    ? tabParam
    : null;
  const {
    snapshot,
    loading,
    currentUser: runtimeUser,
    isAuthenticated,
    source,
    refresh,
    setSnapshot,
  } = useAppRuntime(initialSnapshot, "school");
  const currentUser = runtimeUser;
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [schoolBoardComposerOpen, setSchoolBoardComposerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [admissionComposerOpen, setAdmissionComposerOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isSwitchingSchool, startSchoolSwitchTransition] = useTransition();
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [schoolPickerQuery, setSchoolPickerQuery] = useState("");
  const [pendingAdminSchoolId, setPendingAdminSchoolId] = useState<string | null>(null);
  const lecturesSectionRef = useRef<HTMLElement | null>(null);
  const tradeSectionRef = useRef<HTMLElement | null>(null);
  const schoolBoardSectionRef = useRef<HTMLElement | null>(null);
  const freshmanSectionRef = useRef<HTMLElement | null>(null);
  const admissionSectionRef = useRef<HTMLElement | null>(null);
  const exploreSectionRef = useRef<HTMLElement | null>(null);
  const userSchoolId = currentUser.schoolId;
  const canPreviewAllSchools = isAuthenticated && isMasterAdminEmail(currentUser.email);
  const availableSchools = useMemo(
    () => [...snapshot.schools].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [snapshot.schools],
  );
  const currentSchool =
    availableSchools.find((school) => school.id === userSchoolId) ?? null;
  const activeSchool = currentSchool;
  const isAdminDashboardMode = canPreviewAllSchools && !activeSchool;
  const schoolId = activeSchool?.id;
  const schoolName = activeSchool?.name ?? (isAdminDashboardMode ? "관리자" : "우리학교");
  const schoolShortName = getSchoolShortName(schoolName);
  const selectedAdminSchoolId = pendingAdminSchoolId ?? userSchoolId ?? null;
  const selectedAdminSchool =
    availableSchools.find((school) => school.id === selectedAdminSchoolId) ?? null;
  const hasPendingAdminSchoolChange =
    canPreviewAllSchools && selectedAdminSchoolId !== (userSchoolId ?? null);
  const isApplicantMode = currentUser.userType === "applicant";
  const filteredAvailableSchools = useMemo(() => {
    const normalizedQuery = schoolPickerQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return availableSchools;
    }

    return availableSchools.filter((school) =>
      school.name.toLowerCase().includes(normalizedQuery),
    );
  }, [availableSchools, schoolPickerQuery]);

  const lectures = getSchoolScopedLectureSummaries(schoolId)
    .slice(0, 4);
  const tradeItems = getSchoolScopedTradePosts(schoolId)
    .slice(0, 3);
  const schoolBoardPosts = getSchoolScopedCommunityPosts(schoolId, "school")
    .slice(0, 6);
  const clubPosts = getSchoolScopedCommunityPosts(schoolId, "club")
    .slice(0, 5);
  const foodPosts = getSchoolScopedCommunityPosts(schoolId, "food")
    .slice(0, 5);
  const freshmanZonePosts = getSchoolScopedCommunityPosts(schoolId, "freshman")
    .slice(0, 4);
  const admissionPosts = getSchoolScopedAdmissionQuestions(schoolId)
    .slice(0, 4);
  const recentSchoolBoardCount = schoolBoardPosts.filter((post) => isRecentActivity(post.createdAt)).length;
  const recentFreshmanCount = freshmanZonePosts.filter((post) => isRecentActivity(post.createdAt)).length;
  const recentAdmissionCount = admissionPosts.filter((post) => isRecentActivity(post.createdAt)).length;
  const recentLectureCount = lectures.reduce(
    (count, lecture) => count + getLectureReviews(lecture.id).filter((review) => isRecentActivity(review.createdAt)).length,
    0,
  );
  const schoolBoardWriteEnabled =
    isAuthenticated &&
    hasCompletedOnboarding(currentUser) &&
    Boolean(currentUser.schoolId) &&
    !isApplicantMode;
  const freshmanComposeEnabled =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canWriteFreshmanZone(currentUser);
  const freshmanCommentEnabled = freshmanComposeEnabled;
  const admissionWriteEnabled =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canWriteAdmissionQuestion(currentUser);
  const campusInfoCards = useMemo(
    () =>
      [
        ...clubPosts.map((post) => ({ ...post, boardLabel: "동아리" as const })),
        ...foodPosts.map((post) => ({ ...post, boardLabel: "맛집" as const })),
      ].sort((a, b) => b.likes - a.likes || b.commentCount - a.commentCount),
    [clubPosts, foodPosts],
  );
  const schoolDetailPosts = useMemo(
    () => [...schoolBoardPosts, ...freshmanZonePosts, ...campusInfoCards, ...admissionPosts],
    [admissionPosts, campusInfoCards, freshmanZonePosts, schoolBoardPosts],
  );
  const detailPost = useMemo(
    () =>
      schoolDetailPosts.find((post) => post.id === detailPostId) ??
      (detailPostId ? getAdmissionQuestion(detailPostId) ?? null : null),
    [detailPostId, schoolDetailPosts],
  );
  if (loading && source === "mock") {
    return (
      <AppShell title="우리학교">
        <LoadingState />
      </AppShell>
    );
  }
  const defaultSchoolVisibilityLevel = getStandardVisibilityLevel(
    currentUser.defaultVisibilityLevel,
    currentUser,
  );

  const schoolBoardForm = useForm<SchoolBoardFormValues>({
    resolver: zodResolver(schoolBoardSchema),
    defaultValues: {
      title: "",
      content: "",
      visibilityLevel: defaultSchoolVisibilityLevel,
    },
  });
  const freshmanForm = useForm<FreshmanZoneFormValues>({
    resolver: zodResolver(freshmanZoneSchema),
    defaultValues: {
      title: "",
      content: "",
      visibilityLevel: defaultSchoolVisibilityLevel,
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
      visibilityLevel: defaultSchoolVisibilityLevel,
    },
  });

  const quickTools = isApplicantMode
    ? [
        {
          key: "admission" as const,
          label: "입시 Q&A",
          icon: GraduationCap,
        },
        {
          key: "freshman" as const,
          label: "새내기 게시판",
          icon: Sparkles,
        },
        {
          key: "lectures" as const,
          label: "강의정보",
          icon: BookOpen,
        },
        {
          key: "club" as const,
          label: "동아리",
          icon: Users,
        },
      ]
    : [
        {
          key: "lectures" as const,
          label: "강의정보",
          icon: BookOpen,
        },
        {
          key: "trade" as const,
          label: "수강신청 교환",
          icon: Repeat2,
        },
        {
          key: "school" as const,
          label: "학교 게시판",
          icon: MessageCircle,
        },
        {
          key: "freshman" as const,
          label: "새내기 게시판",
          icon: Sparkles,
        },
        {
          key: "admission" as const,
          label: "입시 Q&A",
          icon: GraduationCap,
        },
      ];

  const scrollToQuickSection = (key: (typeof quickTools)[number]["key"]) => {
    const sectionRef =
      key === "lectures"
        ? lecturesSectionRef
        : key === "trade"
          ? tradeSectionRef
          : key === "school"
            ? schoolBoardSectionRef
            : key === "freshman"
              ? freshmanSectionRef
              : key === "admission"
                ? admissionSectionRef
                : exploreSectionRef;

    window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const handleQuickToolClick = (key: (typeof quickTools)[number]["key"]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    params.delete("post");
    router.replace(`/school?${params.toString()}`, { scroll: false });
    setDetailPostId(null);
    scrollToQuickSection(key);
  };

  useEffect(() => {
    if (!canPreviewAllSchools) {
      return;
    }

    setPendingAdminSchoolId(userSchoolId ?? null);
  }, [canPreviewAllSchools, userSchoolId]);

  const applyAdminSchoolPreview = (nextSchoolId: string | null) => {
    startSchoolSwitchTransition(() => {
      const nextUser = {
        ...currentUser,
        schoolId: nextSchoolId ?? undefined,
      };

      setSnapshot((currentSnapshot) => ({
        ...currentSnapshot,
        currentUser: nextUser,
        users: currentSnapshot.users.map((user) =>
          user.id === currentSnapshot.currentUser.id
            ? { ...user, schoolId: nextSchoolId ?? undefined }
            : user,
        ),
      }));

      setDetailPostId(null);
      setSchoolPickerOpen(false);
      setSchoolPickerQuery("");

      void (async () => {
        if (source === "supabase" && isAuthenticated) {
          await upsertUserProfile(nextUser);
          invalidateClientRuntimeSnapshots();
          await refresh();
        }
        const params = new URLSearchParams(searchParams.toString());
        params.delete("post");
        params.delete("school");
        router.replace(`/school${params.size > 0 ? `?${params.toString()}` : ""}`);
        router.refresh();
      })();
    });
  };

  useEffect(() => {
    if (!detailParam) {
      return;
    }

    const targetPost =
      schoolDetailPosts.find((post) => post.id === detailParam) ??
      getAdmissionQuestion(detailParam);
    if (!targetPost) {
      return;
    }

    setDetailPostId(targetPost.id);
  }, [detailParam, schoolDetailPosts]);

  if (!loading && !isAuthenticated) {
    return (
      <AppShell title="우리학교">
        <Card className="border-dashed border-border bg-card">
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
        <Card className="border-dashed border-border bg-card">
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

  if (!loading && isAuthenticated && (!schoolId || !currentSchool) && !canPreviewAllSchools) {
    return (
      <AppShell title={isApplicantMode ? "지망학교" : "우리학교"}>
        <Card className="border-dashed border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="space-y-1">
              <p className="font-semibold">학교를 선택하면 학교 전용 공간이 열립니다</p>
            </div>
            <Button asChild>
              <Link href="/onboarding?next=%2Fschool&mode=verification">학교 인증하기</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title={isApplicantMode ? "지망학교" : "우리학교"}>
      {loading ? <LoadingState /> : null}
      {successMessage ? (
        <ActionFeedbackBanner
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      ) : null}

      <Card className="relative overflow-hidden border-border bg-card">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.16),_transparent_36%)] opacity-90 dark:opacity-35" />
        <CardContent className="relative z-10 space-y-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <Badge variant={isApplicantMode ? "warning" : "secondary"} className="border-border bg-background/80 text-foreground">
              {isApplicantMode ? "지망학교 모드" : "캠퍼스 라이브"}
            </Badge>
            <School className="h-5 w-5 text-primary" />
          </div>

          <div className="space-y-3">
            <h2 className="text-[30px] font-semibold tracking-tight text-foreground text-balance">
              {schoolName}
            </h2>
            {canPreviewAllSchools ? (
              <div className="max-w-[280px] space-y-2">
                <p className="text-xs font-medium text-muted-foreground">학교 선택</p>
                <div className="rounded-[24px] border border-border bg-background/80">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    onClick={() => setSchoolPickerOpen((open) => !open)}
                  >
                    <span className="truncate text-sm font-medium text-foreground">
                      {selectedAdminSchool ? selectedAdminSchool.name : "관리자"}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${schoolPickerOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {schoolPickerOpen ? (
                    <div className="space-y-3 border-t border-border px-3 py-3">
                      <Input
                        value={schoolPickerQuery}
                        onChange={(event) => setSchoolPickerQuery(event.target.value)}
                        placeholder="학교 검색"
                        className="bg-background"
                      />
                      {hasPendingAdminSchoolChange ? (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => applyAdminSchoolPreview(selectedAdminSchoolId)}
                            disabled={isSwitchingSchool}
                          >
                            적용
                          </Button>
                        </div>
                      ) : null}
                      <div className="max-h-72 overflow-y-auto rounded-2xl border border-border">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left text-sm hover:bg-muted/50"
                          onClick={() => setPendingAdminSchoolId(null)}
                        >
                          <span className="font-medium text-foreground">관리자</span>
                          {!selectedAdminSchoolId ? <Check className="h-4 w-4 text-primary" /> : null}
                        </button>
                        {filteredAvailableSchools.map((school) => (
                          <button
                            key={school.id}
                            type="button"
                            className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted/50"
                            onClick={() => setPendingAdminSchoolId(school.id)}
                          >
                            <span className="font-medium text-foreground">{school.name}</span>
                            {school.id === selectedAdminSchoolId ? <Check className="h-4 w-4 text-primary" /> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            {isAdminDashboardMode ? (
              <div className="rounded-[24px] border border-border bg-background/80 px-4 py-4">
                <p className="text-sm font-medium text-foreground">관리자 모드</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  학교를 선택하면 해당 학교 콘텐츠를 바로 미리 볼 수 있고, 관리자 기능은 아래 버튼으로 실행할 수 있습니다.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild size="sm">
                    <Link href="/admin">관리자 페이지</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[20px] border border-border bg-background/80 px-4 py-3">
                  <p className="text-[11px] text-muted-foreground">학교 글</p>
                  <p className="mt-1 text-[18px] font-semibold text-foreground">{formatRecentCount(recentSchoolBoardCount)}</p>
                </div>
                <div className="rounded-[20px] border border-border bg-background/80 px-4 py-3">
                  <p className="text-[11px] text-muted-foreground">{isApplicantMode ? "입시 질문" : "새내기 글"}</p>
                  <p className="mt-1 text-[18px] font-semibold text-foreground">
                    {formatRecentCount(isApplicantMode ? recentAdmissionCount : recentFreshmanCount)}
                  </p>
                </div>
                <div className="rounded-[20px] border border-border bg-background/80 px-4 py-3">
                  <p className="text-[11px] text-muted-foreground">{isApplicantMode ? "새내기 글" : "강의"}</p>
                  <p className="mt-1 text-[18px] font-semibold text-foreground">
                    {formatRecentCount(isApplicantMode ? recentFreshmanCount : recentLectureCount)}
                  </p>
                </div>
              </div>
            )}
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

      {!isAdminDashboardMode ? (
      <section className="space-y-4">
        <SectionHeader title="퀵 메뉴" />
        <div className="grid grid-cols-3 gap-2.5">
          {quickTools.map((tool) => (
            <button
              key={tool.key}
              type="button"
              onClick={() => handleQuickToolClick(tool.key)}
              className="block text-left"
            >
              <Card
                className={
                  highlightSection === tool.key
                    ? "border-primary/30 bg-primary/5 shadow-[0_18px_36px_-30px_rgba(99,102,241,0.34)]"
                    : "border-border bg-card shadow-none"
                }
              >
                <CardContent className="flex min-h-[92px] flex-col items-start justify-between gap-2 px-4 py-4">
                  <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                    <tool.icon className="h-[18px] w-[18px]" />
                  </div>
                  <p className="text-[14px] font-semibold leading-5 text-foreground">
                    {tool.label}
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </section>
      ) : null}

      {!isAdminDashboardMode ? (
      <section className="space-y-4">
        <SectionHeader title="캠퍼스 라이브" />

        <div
          ref={(node) => {
            schoolBoardSectionRef.current = node;
          }}
          className={
            highlightSection === "school"
              ? "rounded-[32px] border border-blue-200/80 bg-blue-50/35 p-4"
              : "space-y-4"
          }
        >
          <div className="flex items-center justify-between gap-3">
            <SectionHeader title="학교 게시판" />
            {!isApplicantMode ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!schoolBoardWriteEnabled) {
                    router.push(
                      getAuthFlowHref({
                        isAuthenticated,
                        user: currentUser,
                        nextPath: "/school?tab=school",
                      }),
                    );
                    return;
                  }
                  setSchoolBoardComposerOpen(true);
                }}
              >
                글쓰기
              </Button>
            ) : null}
          </div>
          {schoolBoardPosts.length === 0 ? (
            <EmptyState
              title="학교 게시판 글이 아직 없습니다"
              description="도서관, 학생식당, 통학, 팀플처럼 학교 안에서 바로 묻고 싶은 질문을 올려보세요."
            />
          ) : (
            <FeedList>
              {schoolBoardPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  href={`/school?tab=school&post=${post.id}`}
                  onOpen={() => setDetailPostId(post.id)}
                />
              ))}
            </FeedList>
          )}
        </div>

        <div
          ref={(node) => {
            freshmanSectionRef.current = node;
          }}
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
                <FeedPostCard
                  key={post.id}
                  post={post}
                  href={`/school?tab=freshman&post=${post.id}`}
                  onOpen={() => setDetailPostId(post.id)}
                />
              ))}
            </FeedList>
          )}
        </div>

        <div
          ref={(node) => {
            admissionSectionRef.current = node;
          }}
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
                <FeedPostCard key={post.id} post={post} href={`/school?tab=admission&post=${post.id}`} />
              ))}
            </FeedList>
          )}
        </div>
      </section>
      ) : null}

      {!isAdminDashboardMode ? (
      <section
        ref={(node) => {
          lecturesSectionRef.current = node;
        }}
        className="space-y-4"
      >
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
      ) : null}

      {!isApplicantMode && !isAdminDashboardMode ? (
        <section
          ref={(node) => {
            tradeSectionRef.current = node;
          }}
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

      {!isAdminDashboardMode ? (
      <section
        ref={(node) => {
          exploreSectionRef.current = node;
        }}
        className="space-y-4"
      >
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
                href={`/school?tab=${post.boardLabel === "동아리" ? "club" : "food"}&post=${post.id}`}
                className="block min-w-[280px] snap-start"
              >
                <Card
                  className={
                    highlightSection === (post.boardLabel === "동아리" ? "club" : "food")
                      ? "h-full border-primary/25 bg-primary/5"
                      : "h-full border-border bg-card"
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
                      <p className="text-[18px] font-semibold leading-7 text-foreground line-clamp-2">
                        {post.title}
                      </p>
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {post.content}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {getPostViewCount(post)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        {post.likes}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {getCommentsByPostId(post.id).length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
      ) : null}

      <Dialog
        open={Boolean(detailPost)}
        onOpenChange={(next) => {
          if (next) return;
          setDetailPostId(null);
          const nextParams = new URLSearchParams(searchParams.toString());
          nextParams.delete("post");
          router.replace(nextParams.size ? `${pathname}?${nextParams.toString()}` : pathname, {
            scroll: false,
          });
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          {detailPost ? (
            <>
              <DialogHeader>
                <DialogTitle>{detailPost.title}</DialogTitle>
                <DialogDescription>
                  {detailPost.category === "admission"
                    ? `${schoolShortName} 입시 Q&A`
                    : detailPost.subcategory === "school"
                    ? `${schoolShortName} 학교 게시판`
                    : detailPost.subcategory === "freshman"
                    ? `${schoolShortName} 새내기 게시판`
                    : detailPost.subcategory === "club"
                      ? `${schoolShortName} 동아리`
                      : `${schoolShortName} 맛집`}
                </DialogDescription>
              </DialogHeader>
              <Card className="shadow-none">
                <CardContent className="space-y-4 py-5">
                  <PostAuthorRow
                    authorId={detailPost.authorId}
                    createdAt={detailPost.createdAt}
                    visibilityLevel={detailPost.visibilityLevel}
                    trailing={
                      detailPost.category === "admission" ? (
                        <Badge variant="secondary">입시 Q&A</Badge>
                      ) : detailPost.subcategory === "school" ? (
                        <Badge variant="secondary">학교 게시판</Badge>
                      ) : detailPost.subcategory === "freshman" ? (
                        <Badge variant="success">새내기존</Badge>
                      ) : detailPost.subcategory === "club" ? (
                        <Badge variant="secondary">동아리</Badge>
                      ) : (
                        <Badge variant="warning">맛집</Badge>
                      )
                    }
                  />
                  <div className="rounded-[22px] bg-secondary/55 px-4 py-4">
                    <p className="text-sm leading-7 text-muted-foreground">{detailPost.content}</p>
                  </div>
                  <ShareActionGroup
                    payload={createPostSharePayload(detailPost)}
                  />
                  {isAuthenticated && currentUser.id === detailPost.authorId ? (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={async () => {
                          if (source === "supabase") {
                            await deletePost(detailPost.id);
                            setDetailPostId(null);
                            await refresh();
                            return;
                          }

                          setSnapshot((current) => removePostFromSnapshot(current, detailPost.id));
                          setDetailPostId(null);
                        }}
                      >
                        글 삭제
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              <CommentThread
                postId={detailPost.id}
                initialSnapshot={snapshot}
                canCommentOverride={
                  detailPost.subcategory === "freshman"
                    ? freshmanCommentEnabled
                    : isAuthenticated && hasCompletedOnboarding(currentUser)
                }
                accountRequiredTitle={
                  detailPost.subcategory === "freshman"
                    ? isAuthenticated
                      ? "새내기존 댓글은 같은 학교 예비입학생만 작성할 수 있습니다"
                      : "로그인 후 새내기존 댓글을 볼 수 있습니다"
                    : isAuthenticated
                      ? "학교 설정을 마치면 바로 댓글을 남길 수 있습니다"
                      : "로그인 후 학교 생활 글에 댓글을 남길 수 있습니다"
                }
                accountRequiredDescription={
                  detailPost.subcategory === "freshman"
                    ? isAuthenticated
                      ? "예비입학생 계정으로 온보딩을 마친 뒤 댓글을 남길 수 있습니다."
                      : "읽기는 자유롭게, 댓글은 예비입학생 계정 로그인 후 이용할 수 있습니다."
                    : isAuthenticated
                      ? "학교를 선택하고 기본 프로필을 마치면 댓글이 열립니다."
                      : "읽기는 자유롭게, 댓글은 로그인 후 이용할 수 있습니다."
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
                      setSuccessMessage("입시 질문이 등록되었습니다.");
                      admissionForm.reset({
                        title: "",
                        region: "서울",
                        track: "문과",
                        scoreType: "",
                        interestDepartment: "",
                        content: "",
                        visibilityLevel: defaultSchoolVisibilityLevel,
                      });
                      setAdmissionComposerOpen(false);
                      await refresh();
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
                visibilityLevel: defaultSchoolVisibilityLevel,
              });
              setAdmissionComposerOpen(false);
              setSuccessMessage("입시 질문이 등록되었습니다.");
            })}
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">입시 질문은 조건이 보여야 답이 붙습니다</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  지역, 계열, 성적 정보, 관심 학과를 같이 적으면 재학생이나 선배가 훨씬 구체적으로 답하기 쉽습니다.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["전형명/면접", "내신·수능 등급", "관심 학과", "현재 가장 궁금한 한 가지"].map((tip) => (
                  <span
                    key={tip}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground"
                  >
                    {tip}
                  </span>
                ))}
              </div>
            </div>
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
                levels={STANDARD_VISIBILITY_LEVELS}
                onChange={(value) =>
                  admissionForm.setValue("visibilityLevel", value as "school" | "schoolDepartment", {
                    shouldValidate: true,
                  })
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

      <Dialog open={schoolBoardComposerOpen} onOpenChange={setSchoolBoardComposerOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{schoolShortName} 학교 게시판 글쓰기</DialogTitle>
            <DialogDescription>도서관, 학생식당, 통학, 팀플처럼 학교 안에서 바로 묻고 싶은 내용을 올릴 수 있습니다.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={schoolBoardForm.handleSubmit(async (values) => {
              schoolBoardForm.clearErrors("root");
              const createdAt = new Date().toISOString();
              const validationError = validatePostSubmission(getRuntimeSnapshot(), {
                authorId: currentUser.id,
                category: "community",
                title: values.title,
                content: values.content,
                createdAt,
              });

              if (validationError) {
                schoolBoardForm.setError("root", { message: validationError });
                return;
              }

              const localPost: Post = {
                id: `school-board-local-${schoolBoardPosts.length + 1}`,
                category: "community",
                subcategory: "school",
                authorId: currentUser.id,
                schoolId: currentUser.schoolId,
                visibilityLevel: values.visibilityLevel as VisibilityLevel,
                title: values.title,
                content: values.content,
                createdAt,
                likes: 0,
                commentCount: 0,
                tags: ["학교 게시판"],
              };

              if (source === "supabase" && isAuthenticated) {
                startSubmitTransition(() => {
                  void (async () => {
                    try {
                      await createPost({
                        category: "community",
                        subcategory: "school",
                        schoolId: currentUser.schoolId,
                        visibilityLevel: values.visibilityLevel,
                        title: values.title,
                        content: values.content,
                        tags: ["학교 게시판"],
                      });
                      setSuccessMessage("학교 게시판 글이 등록되었습니다.");
                      schoolBoardForm.reset({
                        title: "",
                        content: "",
                        visibilityLevel: defaultSchoolVisibilityLevel,
                      });
                      setSchoolBoardComposerOpen(false);
                      await refresh();
                    } catch (error) {
                      schoolBoardForm.setError("root", {
                        message: error instanceof Error ? error.message : "학교 게시판 글 작성에 실패했습니다.",
                      });
                    }
                  })();
                });
                return;
              }

              setSnapshot((current) => addPostToSnapshot(current, localPost));
              schoolBoardForm.reset({
                title: "",
                content: "",
                visibilityLevel: defaultSchoolVisibilityLevel,
              });
              setSchoolBoardComposerOpen(false);
              setSuccessMessage("학교 게시판 글이 등록되었습니다.");
            })}
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">학교 게시판은 생활형 질문이 반응이 빠릅니다</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  도서관, 통학, 팀플, 학생식당처럼 학교 안에서 바로 겪는 상황을 적으면 실용적인 답이 빨리 붙습니다.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["장소/시간 포함", "내가 겪는 상황", "원하는 답변 방향"].map((tip) => (
                  <span
                    key={tip}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground"
                  >
                    {tip}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>제목</Label>
              <Input placeholder="예: 도서관 자리 보통 몇 시쯤 차나요?" {...schoolBoardForm.register("title")} />
              {schoolBoardForm.formState.errors.title ? (
                <p className="text-xs text-rose-500">{schoolBoardForm.formState.errors.title.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea
                rows={5}
                placeholder="학생식당, 통학, 팀플, 열람실처럼 학교 안에서 바로 묻고 싶은 내용을 적어보세요."
                {...schoolBoardForm.register("content")}
              />
              {schoolBoardForm.formState.errors.content ? (
                <p className="text-xs text-rose-500">{schoolBoardForm.formState.errors.content.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>공개 범위</Label>
              <VisibilityLevelSelect
                value={schoolBoardForm.watch("visibilityLevel")}
                levels={STANDARD_VISIBILITY_LEVELS}
                onChange={(value) =>
                  schoolBoardForm.setValue("visibilityLevel", value as "school" | "schoolDepartment", {
                    shouldValidate: true,
                  })
                }
              />
            </div>
            {schoolBoardForm.formState.errors.root?.message ? (
              <p className="text-xs text-rose-500">{schoolBoardForm.formState.errors.root.message}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "등록 중" : "학교 게시판에 올리기"}
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
                      setSuccessMessage("새내기 게시글이 등록되었습니다.");
                      freshmanForm.reset({
                        title: "",
                        content: "",
                        visibilityLevel: defaultSchoolVisibilityLevel,
                      });
                      setComposerOpen(false);
                      await refresh();
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
                visibilityLevel: defaultSchoolVisibilityLevel,
              });
              setComposerOpen(false);
              setSuccessMessage("새내기 게시글이 등록되었습니다.");
            })}
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">새내기 글은 경험 공유가 중요합니다</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  오티, 기숙사, 시간표, 동아리처럼 입학 전 불안한 포인트를 구체적으로 적으면 선배 답변이 더 잘 붙습니다.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["입학 전 궁금한 점", "생활 팁 질문", "준비물/복장/친구 사귀기"].map((tip) => (
                  <span
                    key={tip}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground"
                  >
                    {tip}
                  </span>
                ))}
              </div>
            </div>
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
                levels={STANDARD_VISIBILITY_LEVELS}
                onChange={(value) =>
                  freshmanForm.setValue("visibilityLevel", value as "school" | "schoolDepartment", {
                    shouldValidate: true,
                  })
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
              setAdmissionComposerOpen(true);
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
