"use client";
import { useTransition } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BriefcaseBusiness,
  CircleHelp,
  Eye,
  Flame,
  Heart,
  MessageCircle,
  Newspaper,
  Sparkles,
} from "lucide-react";

import { AdPlaceholderCard } from "@/components/ads/ad-placeholder-card";
import { AppShell } from "@/components/layout/app-shell";
import { ActionFeedbackBanner } from "@/components/shared/action-feedback-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FeedList } from "@/components/shared/feed-list";
import { PollCard } from "@/components/shared/poll-card";
import { RelativeTimeText } from "@/components/shared/relative-time-text";
import { SectionHeader } from "@/components/shared/section-header";
import { CommentThread } from "@/features/common/comment-thread";
import { PostAuthorRow } from "@/features/common/post-author-row";
import { FloatingComposeButton } from "@/components/shared/floating-compose-button";
import { LoadingState } from "@/components/shared/loading-state";
import { ReportBlockActions } from "@/components/shared/report-block-actions";
import { ShareActionGroup } from "@/components/shared/share-action-group";
import { VisibilityLevelSelect } from "@/components/shared/visibility-level-select";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
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
import { createPost, deletePost, trackPostView } from "@/app/actions/content-actions";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { injectInlineAdSlots, isAdPlacementEnabled } from "@/lib/ads";
import {
  CAREER_BOARD_LABELS,
  STANDARD_VISIBILITY_LEVELS,
} from "@/lib/constants";
import { classifyContentLevel, validatePostSubmission } from "@/lib/moderation";
import { canAccessSchoolFeatures, canWriteCareer, canWriteCommunity } from "@/lib/permissions";
import { isMasterAdminEmail } from "@/lib/admin/master-admin-shared";
import {
  addBlockToSnapshot,
  addPostToSnapshot,
  addReportToSnapshot,
  incrementPostViewInSnapshot,
  removePostFromSnapshot,
} from "@/lib/runtime-mutations";
import {
  type CareerBoardKind,
  getCareerBoardKind,
  getHotScore,
  getLatestCommentPreview,
  getAllCommunityFeedPosts,
  getMostCommentedPosts,
  getMostVotedPosts,
  getSchoolName,
  getSchoolCommunityFeedPosts,
  getTrendingCommunityPosts,
  isRepeatedlyReportedUser,
} from "@/lib/mock-queries";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import {
  createBlockRecord,
  createReportRecord,
  getAuthFlowHref,
  hasCompletedOnboarding,
} from "@/lib/supabase/app-data";
import { getStandardVisibilityLevel } from "@/lib/user-identity";
import { cn, getPostViewCount } from "@/lib/utils";
import type { AppRuntimeSnapshot, Post, ReportReason, VisibilityLevel } from "@/types";
import { createPostSharePayload } from "@/lib/share-utils";

const communitySchema = z.object({
  board: z.enum(["free", "advice", "ask", "anonymous", "hot", "careerInfo", "jobPosting"]),
  title: z.string().min(4, "제목을 4자 이상 입력해주세요."),
  content: z.string().min(10, "본문을 10자 이상 입력해주세요."),
  visibilityLevel: z.enum(["anonymous", "school", "schoolDepartment", "profile"]),
  pollEnabled: z.boolean().default(false),
  pollQuestion: z.string().max(140).optional(),
  pollOptions: z.array(z.string().max(80)).max(4).optional(),
});

type CommunityFormValues = z.infer<typeof communitySchema>;
type SharedFilter = "all" | "free" | "advice" | "ask" | "anonymous" | "hot" | "career";
type FeedScope = "school" | "all" | "hot";

const FILTERS: Array<{
  value: SharedFilter;
  label: string;
  icon: typeof Sparkles;
}> = [
  { value: "all", label: "전체", icon: Sparkles },
  { value: "free", label: "자유", icon: Newspaper },
  { value: "advice", label: "고민", icon: MessageCircle },
  { value: "hot", label: "핫갤", icon: Flame },
  { value: "ask", label: "무물", icon: CircleHelp },
  { value: "anonymous", label: "익명", icon: MessageCircle },
  { value: "career", label: "취업", icon: BriefcaseBusiness },
] as const;

function isSharedFilter(value: string | null): value is SharedFilter {
  return FILTERS.some((filter) => filter.value === value);
}

function getCardVariant(post: Post): BadgeProps["variant"] {
  const careerBoard = getCareerBoardKind(post);
  if (careerBoard === "jobPosting") return "warning";
  if (careerBoard === "careerInfo") return "secondary";
  if (post.subcategory === "hot") return "danger";
  if (post.subcategory === "ask") return "outline";
  if (post.subcategory === "advice") return "outline";
  return "secondary";
}

function getCardLabel(post: Post) {
  if (post.postType === "balance") return "밸런스게임";
  if (post.postType === "poll") return "투표";
  if (post.postType === "question") return "질문";
  const careerBoard = getCareerBoardKind(post);
  if (careerBoard) return CAREER_BOARD_LABELS[careerBoard];
  if (post.subcategory === "free") return "자유";
  if (post.subcategory === "advice") return "고민";
  if (post.subcategory === "ask") return "무물";
  if (post.subcategory === "anonymous") return "익명";
  if (post.subcategory === "hot") return "핫갤";
  return "자유";
}

function getDefaultBoard(filter: SharedFilter): CommunityFormValues["board"] {
  if (filter === "free") return "free";
  if (filter === "advice") return "advice";
  if (filter === "ask") return "ask";
  if (filter === "anonymous") return "anonymous";
  if (filter === "hot") return "hot";
  if (filter === "career") return "careerInfo";
  return "free";
}

function getComposeLabel(filter: SharedFilter) {
  if (filter === "all") return "글쓰기";
  if (filter === "free") return "자유 글쓰기";
  if (filter === "ask") return "무물 글쓰기";
  if (filter === "anonymous") return "익명 글쓰기";
  if (filter === "hot") return "핫갤 글쓰기";
  if (filter === "career") return "취업 글쓰기";
  return "고민 글쓰기";
}

function getBoardTitlePlaceholder(board: CommunityFormValues["board"]) {
  if (board === "free") return "예: 시험 끝나고 다들 뭐 하나요?";
  if (board === "advice") return "예: 취업 준비 늦은 것 같을 때 뭐부터 정리하나요?";
  if (board === "ask") return "예: 자취 시작할 때 꼭 사야 하는 것만 추천해주세요";
  if (board === "anonymous") return "예: 오늘은 그냥 익명으로 털어놓고 싶은 말";
  if (board === "hot") return "예: 연애할 때 이건 진짜 이해 안 되는 포인트";
  if (board === "jobPosting") return "예: 이번 주 대외활동·인턴 마감 일정 모음";
  return "예: 상반기 서류 준비 순서 어떻게 가져가고 있나요?";
}

function getBoardContentPlaceholder(board: CommunityFormValues["board"]) {
  if (board === "free") return "가볍게 공유하고 싶은 학교 밖 이야기나 요즘 분위기를 적어보세요.";
  if (board === "advice") return "지금 상황, 고민 포인트, 이미 해본 것까지 적으면 더 좋은 답이 붙습니다.";
  if (board === "ask") return "딱 하나 궁금한 질문부터 적어보세요. 짧을수록 답이 빨리 붙습니다.";
  if (board === "anonymous") return "개인 감정이나 속마음을 적어도 됩니다. 개인정보만 빼고 편하게 적어보세요.";
  if (board === "hot") return "반응이 붙기 쉬운 주제여도 노골적 표현, 도배, 개인정보 노출은 제한됩니다.";
  if (board === "jobPosting") return "공고 일정, 지원 조건, 링크 요약을 함께 적으면 저장 가치가 높아집니다.";
  return "정리한 정보, 커피챗 후기, 면접 후기처럼 실제 도움이 되는 내용을 적어보세요.";
}

function getBoardGuide(board: CommunityFormValues["board"]) {
  if (board === "free") {
    return {
      title: "자유 게시판은 가볍고 빠르게",
      description: "짧은 근황이나 한 줄 토픽도 좋지만, 질문이나 공감 포인트가 있으면 반응이 더 빨리 붙습니다.",
      tips: ["핵심 주제를 제목에 먼저", "본문은 2~4줄이면 충분", "읽는 사람이 바로 댓글 달 수 있게 마무리"],
    };
  }
  if (board === "advice") {
    return {
      title: "고민 게시판은 상황 설명이 중요합니다",
      description: "배경, 현재 고민, 원하는 답변 방향이 있으면 훨씬 좋은 댓글이 달립니다.",
      tips: ["상황 1줄 요약", "내가 막히는 포인트", "비슷한 경험 있는 사람에게 묻기"],
    };
  }
  if (board === "ask") {
    return {
      title: "무물은 질문 하나에 집중",
      description: "여러 질문을 섞기보다 하나만 명확하게 물어보면 답변 속도와 질이 올라갑니다.",
      tips: ["질문은 한 문장으로", "필요하면 조건만 짧게", "답정너 표현은 줄이기"],
    };
  }
  if (board === "anonymous") {
    return {
      title: "익명 게시판은 부담 없이",
      description: "글과 댓글이 모두 익명 처리됩니다. 다만 개인정보, 실명 언급, 특정인 저격은 제한됩니다.",
      tips: ["신상 정보는 빼기", "감정은 솔직하게", "특정인 비방은 피하기"],
    };
  }
  if (board === "hot") {
    return {
      title: "핫갤은 반응이 빠른 주제 중심",
      description: "자극적인 주제여도 노골적 음란 표현이나 반복 도배는 자동 제한됩니다.",
      tips: ["밸런스게임/토론형 주제", "짧고 강한 제목", "댓글 붙을 포인트 남기기"],
    };
  }
  if (board === "jobPosting") {
    return {
      title: "채용공고는 정보형으로",
      description: "기업명, 일정, 지원 포인트를 정리해주면 저장 가치가 높고 공유도 잘 됩니다.",
      tips: ["마감 일정 표기", "누가 보면 좋은지", "링크나 모집 핵심 요약"],
    };
  }
  return {
    title: "취업정보는 바로 도움 되는 내용으로",
    description: "자소서, 면접, 커피챗, 인턴 후기처럼 실제 취준에 도움 되는 내용을 정리해보세요.",
    tips: ["핵심 배운 점부터", "실제 사례 중심", "읽고 바로 적용 가능한 팁"],
  };
}

function getFilterFromBoard(board: CommunityFormValues["board"]): SharedFilter {
  if (board === "careerInfo" || board === "jobPosting") return "career";
  return board;
}

function getPopularityScore(post: Post) {
  return post.likes * 5 + post.commentCount * 8;
}

function getFilterForPost(post: Post): SharedFilter {
  if (getCareerBoardKind(post)) return "career";
  if (post.subcategory === "anonymous") return "anonymous";
  if (post.subcategory === "free") return "free";
  if (post.subcategory === "ask") return "ask";
  if (post.subcategory === "hot") return "hot";
  return "advice";
}

function SharedFeedCard({
  post,
  hotScore,
  latestComment,
  schoolHighlighted,
  onOpen,
  onReport,
  onBlock,
  repeatedlyReported,
}: {
  post: Post;
  hotScore?: number;
  latestComment?: string;
  schoolHighlighted?: boolean;
  onOpen: () => void;
  onReport: (input: { reason?: ReportReason; memo?: string }) => Promise<void> | void;
  onBlock: () => Promise<void> | void;
  repeatedlyReported: boolean;
}) {
  return (
    <article className="border-b border-gray-100 last:border-b-0">
      <div className="space-y-3 px-4 py-4 transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/5">
        <PostAuthorRow
          authorId={post.authorId}
          createdAt={post.createdAt}
          visibilityLevel={post.visibilityLevel}
          contentSchoolId={post.schoolId}
          anonymousMode={post.subcategory === "anonymous"}
          showPrimaryImage
          trailing={
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {schoolHighlighted ? (
                <span className="rounded-full bg-indigo-500/10 px-2 py-1 font-medium text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
                  우리 학교
                </span>
              ) : null}
              <span>{getCardLabel(post)}</span>
            </div>
          }
        />
        <button
          type="button"
          onClick={onOpen}
          className="block w-full space-y-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            {post.subcategory === "hot" ? (
              <span className="rounded-full bg-rose-500/10 px-2 py-1 font-medium text-rose-500">19+</span>
            ) : null}
            {post.subcategory === "hot" && hotScore ? <span>인기 점수 {hotScore}</span> : null}
          </div>
          <CardTitle className="text-base font-semibold leading-6 text-gray-900">{post.title}</CardTitle>
          <CardDescription className="line-clamp-2 text-sm leading-6 text-gray-500">
            {post.content}
          </CardDescription>
        </button>
      </div>
      <div className="space-y-3 px-4 pb-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {getPostViewCount(post)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-4 w-4" />
            {post.likes}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            {post.commentCount}
          </span>
          <RelativeTimeText dateString={post.createdAt} />
        </div>
        {latestComment ? (
          <button
            type="button"
            onClick={onOpen}
            className="block w-full border-l border-gray-200 pl-3 text-left text-sm text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 dark:border-white/10"
          >
            <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-gray-200">
              <MessageCircle className="h-4 w-4" />
              최근 댓글
            </span>
            <p className="mt-1 line-clamp-2 leading-6">{latestComment}</p>
          </button>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          <ReportBlockActions
            compact
            targetType="post"
            targetId={post.id}
            targetUserId={post.authorId}
            repeatedlyReported={repeatedlyReported}
            onReport={async ({ reason, memo }) => onReport({ reason, memo })}
            onBlock={async () => onBlock()}
          />
        </div>
      </div>
    </article>
  );
}

export function CommunityPage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const detailParam = searchParams.get("post");
  const {
    loading,
    currentUser: runtimeUser,
    source,
    isAuthenticated,
    refresh,
    setSnapshot,
  } = useAppRuntime(initialSnapshot, "community");
  const currentUser = runtimeUser;
  const [activeFilter, setActiveFilter] = useState<SharedFilter>(
    isSharedFilter(filterParam) ? filterParam : "all",
  );
  const [feedScope, setFeedScope] = useState<FeedScope>(
    currentUser.schoolId ? "school" : "all",
  );
  const [sortMode, setSortMode] = useState<"popular" | "latest" | "trending">("latest");
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [sensitivePost, setSensitivePost] = useState<Post | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const canAccessCommunity =
    !isAuthenticated ||
    !hasCompletedOnboarding(currentUser) ||
    canAccessSchoolFeatures(currentUser);
  const showInitialLoading = loading && source === "mock";
  const canViewSchoolScope =
    isAuthenticated &&
    hasCompletedOnboarding(currentUser) &&
    Boolean(currentUser.schoolId);

  useEffect(() => {
    setActiveFilter(isSharedFilter(filterParam) ? filterParam : "all");
  }, [filterParam]);

  useEffect(() => {
    if (!canViewSchoolScope && feedScope === "school") {
      setFeedScope("all");
    }
  }, [canViewSchoolScope, feedScope]);

  const schoolFeedItems = useMemo(
    () => getSchoolCommunityFeedPosts(currentUser.schoolId),
    [currentUser.schoolId],
  );
  const allFeedItems = useMemo(() => getAllCommunityFeedPosts(), []);
  const hotFeedItems = useMemo(() => getTrendingCommunityPosts(), []);
  const canAccessAnonymousBoard =
    (isAuthenticated && canWriteCommunity(currentUser)) || isMasterAdminEmail(currentUser.email);
  const accessibleAllFeedItems = useMemo(
    () => allFeedItems.filter((post) => canAccessAnonymousBoard || post.subcategory !== "anonymous"),
    [allFeedItems, canAccessAnonymousBoard],
  );
  const accessibleHotFeedItems = useMemo(
    () => hotFeedItems.filter((post) => canAccessAnonymousBoard || post.subcategory !== "anonymous"),
    [canAccessAnonymousBoard, hotFeedItems],
  );
  const accessibleSchoolFeedItems = useMemo(
    () => schoolFeedItems.filter((post) => canAccessAnonymousBoard || post.subcategory !== "anonymous"),
    [canAccessAnonymousBoard, schoolFeedItems],
  );
  const mostVotedPosts = useMemo(
    () =>
      getMostVotedPosts()
        .filter((post) => canAccessAnonymousBoard || post.subcategory !== "anonymous")
        .slice(0, 4),
    [canAccessAnonymousBoard],
  );
  const mostCommentedPosts = useMemo(
    () =>
      getMostCommentedPosts()
        .filter((post) => canAccessAnonymousBoard || post.subcategory !== "anonymous")
        .slice(0, 4),
    [canAccessAnonymousBoard],
  );

  const feedItems = useMemo(() => {
    if (feedScope === "hot") return accessibleHotFeedItems;
    if (feedScope === "all") return accessibleAllFeedItems;
    return accessibleSchoolFeedItems;
  }, [accessibleAllFeedItems, accessibleHotFeedItems, accessibleSchoolFeedItems, feedScope]);

  useEffect(() => {
    if (!detailParam) {
      return;
    }

    const targetPost = accessibleAllFeedItems.find((post) => post.id === detailParam);
    if (!targetPost) {
      return;
    }

    setActiveFilter(getFilterForPost(targetPost));
    if (
      targetPost.subcategory === "hot" ||
      classifyContentLevel(`${targetPost.title} ${targetPost.content}`) === "sensitive"
    ) {
      setSensitivePost(targetPost);
      setDetailPostId(null);
      return;
    }

    setSensitivePost(null);
    setDetailPostId(targetPost.id);
  }, [accessibleAllFeedItems, detailParam]);

  function openPost(post: Post) {
    if (post.subcategory === "anonymous" && !canAccessAnonymousBoard) {
      router.push(
        getAuthFlowHref({
          isAuthenticated,
          user: currentUser,
          nextPath: pathname,
        }),
      );
      return;
    }

    if (
      post.subcategory === "hot" ||
      classifyContentLevel(`${post.title} ${post.content}`) === "sensitive"
    ) {
      setSensitivePost(post);
      setDetailPostId(null);
      return;
    }

    setSensitivePost(null);
    setDetailPostId(post.id);
  }

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return feedItems;
    return feedItems.filter((post) => getFilterForPost(post) === activeFilter);
  }, [activeFilter, feedItems]);
  const sortedItems = useMemo(() => {
    const items = [...filteredItems];
    if (sortMode === "latest") {
      return items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }

    if (sortMode === "trending") {
      return items.sort(
        (a, b) =>
          getHotScore(b) - getHotScore(a) ||
          b.commentCount - a.commentCount ||
          +new Date(b.createdAt) - +new Date(a.createdAt),
      );
    }

    return items.sort(
      (a, b) =>
        getPopularityScore(b) - getPopularityScore(a) ||
        b.likes - a.likes ||
        b.commentCount - a.commentCount ||
        +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  }, [filteredItems, sortMode]);
  const featuredItem = sortedItems[0] ?? null;
  const risingItems = sortedItems.slice(1, 4);
  const schoolFocusPosts = useMemo(
    () => {
      if (!canViewSchoolScope) return [];

      return accessibleSchoolFeedItems
        .filter((post) => post.schoolId === currentUser.schoolId)
        .sort(
          (a, b) =>
            getHotScore(b) - getHotScore(a) ||
            getPopularityScore(b) - getPopularityScore(a),
        )
        .slice(0, 3);
    },
    [accessibleSchoolFeedItems, canViewSchoolScope, currentUser.schoolId],
  );
  const topicChips = useMemo(() => {
    const counts = new Map<string, number>();
    sortedItems.slice(0, 16).forEach((post) => {
      (post.tags ?? []).forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [sortedItems]);
  const feedSlots = useMemo(() => injectInlineAdSlots(sortedItems), [sortedItems]);

  const detailPost = useMemo(
    () => accessibleAllFeedItems.find((post) => post.id === detailPostId) ?? null,
    [accessibleAllFeedItems, detailPostId],
  );

  const canComposeCommunity =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canWriteCommunity(currentUser);
  const canComposeCareer =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canWriteCareer(currentUser);
  const canCompose =
    activeFilter === "career" ? canComposeCareer : canComposeCommunity;
  const availableFilters = useMemo(
    () => FILTERS.filter((filter) => filter.value !== "anonymous" || canAccessAnonymousBoard),
    [canAccessAnonymousBoard],
  );

  const form = useForm<CommunityFormValues>({
    resolver: zodResolver(communitySchema),
    defaultValues: {
      board: getDefaultBoard(activeFilter),
      title: "",
      content: "",
      visibilityLevel: getStandardVisibilityLevel(
        currentUser.defaultVisibilityLevel,
        currentUser,
      ),
      pollEnabled: false,
      pollQuestion: "",
      pollOptions: ["", ""],
    },
  });
  const composingBoard = form.watch("board");
  const composingGuide = getBoardGuide(composingBoard);

  useEffect(() => {
    if (activeFilter === "anonymous" && !canAccessAnonymousBoard) {
      setActiveFilter("all");
    }
  }, [activeFilter, canAccessAnonymousBoard]);

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const createdAt = new Date().toISOString();
    const validationError = validatePostSubmission(getRuntimeSnapshot(), {
      authorId: currentUser.id,
      category: "community",
      title: values.title,
      content: values.content,
      createdAt,
    });

    if (validationError) {
      form.setError("root", { message: validationError });
      return;
    }

    const isCareerBoard = values.board === "careerInfo" || values.board === "jobPosting";
    const isAnonymousBoard = values.board === "anonymous";
    const normalizedPollOptions = (values.pollOptions ?? []).map((option) => option.trim()).filter(Boolean);
    const hasPoll = values.pollEnabled && normalizedPollOptions.length >= 2 && Boolean(values.pollQuestion?.trim());
    const communityBoard =
      values.board === "free" ||
      values.board === "advice" ||
      values.board === "ask" ||
      values.board === "anonymous" ||
      values.board === "hot"
        ? values.board
        : undefined;
    const postType = hasPoll
      ? normalizedPollOptions.length === 2
        ? "balance"
        : "poll"
      : values.board === "ask"
        ? "question"
        : "normal";
    const tags = isCareerBoard
      ? [
          CAREER_BOARD_LABELS[values.board as CareerBoardKind],
          values.board === "careerInfo" ? "합격루틴" : "인턴",
        ]
      : values.board === "anonymous"
        ? ["익명"]
      : values.board === "hot"
        ? ["19+", "익명"]
        : values.board === "free"
          ? ["자유", "익명"]
          : values.board === "ask"
            ? ["무물", "익명"]
            : ["고민", "익명"];

    const localPost: Post = {
      id: `community-${values.board}-local-${feedItems.length + 1}`,
      category: "community",
      subcategory: communityBoard,
      postType,
      authorId: currentUser.id,
      schoolId: currentUser.schoolId,
      visibilityLevel: isAnonymousBoard
        ? "anonymous"
        : (values.visibilityLevel as VisibilityLevel),
      title: values.title,
      content: values.content,
      createdAt,
      likes: 0,
      commentCount: 0,
      pollVoteCount: hasPoll ? 0 : undefined,
      hotScore: 0,
      tags,
      poll: hasPoll
        ? {
            id: `poll-local-${feedItems.length + 1}`,
            postId: `community-${values.board}-local-${feedItems.length + 1}`,
            question: values.pollQuestion?.trim() ?? "",
            totalVotes: 0,
            votedOptionId: undefined,
            createdAt,
            options: normalizedPollOptions.map((option, index) => ({
              id: `poll-option-local-${index + 1}`,
              text: option,
              voteCount: 0,
              percentage: 0,
            })),
          }
        : null,
    };

    if (source === "supabase" && isAuthenticated) {
      startSubmitTransition(() => {
        void (async () => {
          try {
            await createPost({
              category: "community",
              subcategory: communityBoard,
              schoolId: currentUser.schoolId,
              visibilityLevel: isAnonymousBoard ? "anonymous" : values.visibilityLevel,
              title: values.title,
              content: values.content,
              tags,
              postType,
              pollQuestion: hasPoll ? values.pollQuestion?.trim() : undefined,
              pollOptions: hasPoll ? normalizedPollOptions : undefined,
            });
            setComposerOpen(false);
            form.reset();
            form.setValue("pollEnabled", false);
            form.setValue("pollQuestion", "");
            form.setValue("pollOptions", ["", ""]);
            setActiveFilter(getFilterFromBoard(values.board));
            setSuccessMessage("게시글이 등록되었습니다.");
            await refresh();
          } catch (error) {
            form.setError("root", {
              message: error instanceof Error ? error.message : "글 작성에 실패했습니다.",
            });
          }
        })();
      });
      return;
    } else {
      setSnapshot((current) => addPostToSnapshot(current, localPost));
    }

    setComposerOpen(false);
    form.reset();
    form.setValue("pollEnabled", false);
    form.setValue("pollQuestion", "");
    form.setValue("pollOptions", ["", ""]);
    setActiveFilter(getFilterFromBoard(values.board));
    setSuccessMessage("게시글이 등록되었습니다.");
  });

  useEffect(() => {
    if (!detailPostId || source !== "supabase") {
      return;
    }

    setSnapshot((current) => incrementPostViewInSnapshot(current, detailPostId));
    void trackPostView(detailPostId).catch(() => undefined);
  }, [detailPostId, setSnapshot, source]);

  if (showInitialLoading) {
    return (
      <AppShell title="커뮤니티">
        <LoadingState />
      </AppShell>
    );
  }

  if (!loading && !canAccessCommunity) {
    return (
      <AppShell title="커뮤니티" subtitle="대학생 중심 익명 커뮤니티">
        <Card className="border-dashed border-white/80 bg-white/92">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="space-y-1">
              <p className="font-semibold">입시생 계정은 입시 게시판만 사용할 수 있습니다</p>
              <p className="text-sm text-muted-foreground">
                자유, 고민, 핫갤, 무물, 취업 보드는 대학생 계정에서만 열립니다.
              </p>
            </div>
            <Button type="button" onClick={() => router.push("/school?tab=admission")}>
              지망학교 보기
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="커뮤니티"
      subtitle="공유 피드"
    >
      {loading ? <LoadingState /> : null}
      {successMessage ? (
        <ActionFeedbackBanner
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      ) : null}

      <section className="space-y-3">
        <div className="space-y-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-1">
            <div className="grid grid-cols-3 gap-1">
              {([
                { value: "all", label: "전체" },
                { value: "hot", label: "🔥 핫글" },
                { value: "school", label: "우리학교" },
              ] as const)
                .filter((scope) => scope.value !== "school" || canViewSchoolScope)
                .map((scope) => (
                <button
                  key={scope.value}
                  type="button"
                  onClick={() => setFeedScope(scope.value)}
                  className={cn(
                    "inline-flex min-w-0 items-center justify-center rounded-[18px] px-3 py-3 text-sm font-semibold transition-all",
                    feedScope === scope.value
                      ? "bg-primary text-primary-foreground shadow-[0_18px_30px_-20px_rgba(79,70,229,0.95)]"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                  )}
                >
                  <span className="truncate">{scope.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-1">
            {availableFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={cn(
                  "app-chip inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
                  activeFilter === filter.value
                    ? "border-primary/70 bg-primary/15 text-primary shadow-[0_14px_24px_-22px_rgba(79,70,229,0.95)]"
                    : "border-white/8 bg-transparent text-foreground/90",
                )}
              >
                <filter.icon className="h-4 w-4" />
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 border-b border-white/8 pb-1">
            {([
              { value: "latest", label: "최신순" },
              { value: "trending", label: "급상승" },
              { value: "popular", label: "인기순" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSortMode(option.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                  sortMode === option.value
                    ? "bg-white/[0.06] text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {featuredItem ? (
        <section className="space-y-4">
          <Card className="app-section-surface overflow-hidden rounded-[30px] border-white/10 shadow-none">
            <CardContent className="space-y-4 py-5">
              <SectionHeader
                eyebrow="탐색 피드"
                title={
                  feedScope === "school"
                    ? "우리학교에서 지금 뜨는 글"
                    : feedScope === "hot"
                      ? "지금 반응이 터지는 글"
                      : "지금 뜨는 글"
                }
              />
              <button
                type="button"
                onClick={() => openPost(featuredItem)}
                className="block w-full rounded-[24px] bg-slate-950/5 px-4 py-4 text-left transition-colors hover:bg-slate-950/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 font-medium text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
                    {getCardLabel(featuredItem)}
                  </span>
                  {featuredItem.schoolId === currentUser.schoolId ? (
                    <span className="rounded-full bg-sky-500/10 px-2.5 py-1 font-medium text-sky-600 dark:bg-sky-400/10 dark:text-sky-300">
                      우리 학교
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 text-[1.05rem] font-semibold leading-7 text-foreground">
                  {featuredItem.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {featuredItem.content}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {getPostViewCount(featuredItem)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {featuredItem.likes}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    {featuredItem.commentCount}
                  </span>
                </div>
              </button>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    급상승
                  </p>
                  <div className="space-y-2">
                    {risingItems.map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => openPost(post)}
                        className="app-muted-surface block w-full rounded-[20px] px-4 py-3 text-left"
                      >
                        <p className="text-sm font-semibold text-foreground">{post.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {getCardLabel(post)} · 댓글 {post.commentCount}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      지금 뜨는 주제
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {topicChips.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                  {mostVotedPosts.length ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        투표 참여 많은 글
                      </p>
                      <div className="mt-2 space-y-2">
                        {mostVotedPosts.slice(0, 2).map((post) => (
                          <button
                            key={post.id}
                            type="button"
                            onClick={() => openPost(post)}
                            className="app-muted-surface block w-full rounded-[20px] px-4 py-3 text-left"
                          >
                            <p className="text-sm font-semibold text-foreground">{post.title}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {post.pollVoteCount ?? post.poll?.totalVotes ?? 0}명 참여
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {schoolFocusPosts.length ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        우리 학교에서 많이 보는 글
                      </p>
                      <div className="mt-2 space-y-2">
                        {schoolFocusPosts.map((post) => (
                          <button
                            key={post.id}
                            type="button"
                            onClick={() => openPost(post)}
                            className="app-muted-surface block w-full rounded-[20px] px-4 py-3 text-left"
                          >
                            <p className="text-sm font-semibold text-foreground">{post.title}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {getCardLabel(post)} · {getSchoolName(post.schoolId)}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="space-y-4">
        {filteredItems.length === 0 ? (
          <EmptyState
            title="표시할 글이 없습니다"
            description="게시글이 없습니다."
          />
      ) : (
        <FeedList>
            {feedSlots.map((slot) => {
            if (slot.kind === "ad") {
              return (
                <div key={slot.id} className="border-b border-gray-100 last:border-b-0 px-4 py-4">
                  <AdPlaceholderCard placement={slot.placement} />
                </div>
              );
            }

            const post = slot.item;

              return (
                <SharedFeedCard
                  key={post.id}
                  post={post}
                  hotScore={post.subcategory === "hot" ? getHotScore(post) : undefined}
                  latestComment={getLatestCommentPreview(post.id)?.content}
                  schoolHighlighted={Boolean(currentUser.schoolId && post.schoolId === currentUser.schoolId)}
                  onOpen={() => openPost(post)}
                  repeatedlyReported={isRepeatedlyReportedUser(post.authorId)}
                  onReport={async ({ reason, memo }) => {
                    if (source === "supabase" && isAuthenticated) {
                      await createReportRecord({
                        reporterId: currentUser.id,
                        targetType: "post",
                        targetId: post.id,
                        reason,
                        memo,
                      });
                      await refresh();
                      return;
                    }

                    setSnapshot((current) =>
                      addReportToSnapshot(current, {
                        targetType: "post",
                        targetId: post.id,
                        reporterId: currentUser.id,
                        reason: reason ?? "other",
                        memo,
                      }),
                    );
                  }}
                  onBlock={async () => {
                    if (source === "supabase" && isAuthenticated) {
                      await createBlockRecord({
                        blockerId: currentUser.id,
                        blockedUserId: post.authorId,
                      });
                      await refresh();
                      return;
                    }

                    setSnapshot((current) =>
                      addBlockToSnapshot(current, {
                        blockerId: currentUser.id,
                        blockedUserId: post.authorId,
                      }),
                    );
                  }}
                />
              );
            })}
          </FeedList>
        )}
      </section>

      {mostCommentedPosts.length ? (
        <section className="space-y-4">
          <SectionHeader eyebrow="반응" title="댓글 반응 좋은 글" />
          <div className="grid gap-3">
            {mostCommentedPosts.slice(0, 3).map((post) => (
              <button
                key={`comment-focus-${post.id}`}
                type="button"
                onClick={() => openPost(post)}
                className="app-section-surface app-soft-hover rounded-[24px] border-white/10 px-4 py-4 text-left"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-sky-500/10 px-2.5 py-1 font-medium text-sky-300">
                    댓글 {post.commentCount}
                  </span>
                  {post.schoolId === currentUser.schoolId ? (
                    <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 font-medium text-indigo-300">
                      우리 학교
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-foreground">{post.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{post.content}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {activeFilter === "hot" && isAdPlacementEnabled("hotGalleryFooter") ? (
        <AdPlaceholderCard placement="hotGalleryFooter" />
      ) : null}

      <Dialog open={Boolean(detailPost)} onOpenChange={(next) => !next && setDetailPostId(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          {detailPost ? (
            <>
              <DialogHeader className="pr-10">
                <DialogTitle className="leading-8">{detailPost.title}</DialogTitle>
                <DialogDescription>
                  {getCardLabel(detailPost)} · {getSchoolName(detailPost.schoolId)}
                </DialogDescription>
              </DialogHeader>
              <Card className="shadow-none">
                <CardContent className="space-y-4 py-5">
                  <PostAuthorRow
                    authorId={detailPost.authorId}
                    createdAt={detailPost.createdAt}
                    visibilityLevel={detailPost.visibilityLevel}
                    contentSchoolId={detailPost.schoolId}
                    anonymousMode={detailPost.subcategory === "anonymous"}
                    showProfilePreview
                  />
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getCardVariant(detailPost)}>{getCardLabel(detailPost)}</Badge>
                    {detailPost.subcategory === "hot" ? <Badge variant="danger">19+</Badge> : null}
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">{detailPost.content}</p>
                  {detailPost.poll ? (
                    <PollCard
                      poll={detailPost.poll}
                      post={detailPost}
                      canVote={isAuthenticated}
                      onRequireAuth={() =>
                        router.push(
                          getAuthFlowHref({
                            isAuthenticated,
                            user: currentUser,
                            nextPath: pathname,
                          }),
                        )
                      }
                      onVoted={refresh}
                    />
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {getPostViewCount(detailPost)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {detailPost.likes}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        {detailPost.commentCount}
                      </span>
                    </div>
                  <ShareActionGroup
                      payload={createPostSharePayload(detailPost)}
                    />
                  </div>
                  <ReportBlockActions
                    targetType="post"
                    targetId={detailPost.id}
                    targetUserId={detailPost.authorId}
                    repeatedlyReported={isRepeatedlyReportedUser(detailPost.authorId)}
                    onReport={async ({ reason, memo }) => {
                      if (source === "supabase" && isAuthenticated) {
                        await createReportRecord({
                          reporterId: currentUser.id,
                          targetType: "post",
                          targetId: detailPost.id,
                          reason,
                          memo,
                        });
                        await refresh();
                        return;
                      }

                      setSnapshot((current) =>
                        addReportToSnapshot(current, {
                          targetType: "post",
                          targetId: detailPost.id,
                          reporterId: currentUser.id,
                          reason: reason ?? "other",
                          memo,
                        }),
                      );
                    }}
                    onBlock={async () => {
                      if (source === "supabase" && isAuthenticated) {
                        await createBlockRecord({
                          blockerId: currentUser.id,
                          blockedUserId: detailPost.authorId,
                        });
                        await refresh();
                        return;
                      }

                      setSnapshot((current) =>
                        addBlockToSnapshot(current, {
                          blockerId: currentUser.id,
                          blockedUserId: detailPost.authorId,
                        }),
                      );
                    }}
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
              <CommentThread postId={detailPost.id} initialSnapshot={initialSnapshot} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(sensitivePost)} onOpenChange={(next) => !next && setSensitivePost(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>민감한 내용이 포함될 수 있습니다</DialogTitle>
            <DialogDescription>
              연애나 성 관련 간접 표현이 포함된 글입니다. 노골적인 음란 표현은 등록되지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSensitivePost(null)}>
              닫기
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!sensitivePost) return;
                setDetailPostId(sensitivePost.id);
                setSensitivePost(null);
              }}
            >
              계속 보기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

          setComposerOpen(true);
          form.setValue("board", getDefaultBoard(activeFilter), {
            shouldValidate: true,
          });
        }}
        label={getComposeLabel(activeFilter)}
      />

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>글쓰기</DialogTitle>
            <DialogDescription>카테고리를 고르고 익명 글을 등록할 수 있습니다.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>카테고리</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.watch("board") === "free" ? "default" : "outline"}
                  onClick={() =>
                    form.setValue("board", "free", {
                      shouldValidate: true,
                    })
                  }
                >
                  자유
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.watch("board") === "advice" ? "default" : "outline"}
                  onClick={() =>
                    form.setValue("board", "advice", {
                      shouldValidate: true,
                    })
                  }
                >
                  고민
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.watch("board") === "ask" ? "default" : "outline"}
                  onClick={() =>
                    form.setValue("board", "ask", {
                      shouldValidate: true,
                    })
                  }
                >
                  무물
                </Button>
                {canAccessAnonymousBoard ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={form.watch("board") === "anonymous" ? "default" : "outline"}
                    onClick={() =>
                      form.setValue("board", "anonymous", {
                        shouldValidate: true,
                      })
                    }
                  >
                    익명
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant={form.watch("board") === "hot" ? "default" : "outline"}
                  onClick={() =>
                    form.setValue("board", "hot", {
                      shouldValidate: true,
                    })
                  }
                >
                  핫갤
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.watch("board") === "careerInfo" ? "default" : "outline"}
                  onClick={() =>
                    form.setValue("board", "careerInfo", {
                      shouldValidate: true,
                    })
                  }
                >
                  취업정보
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.watch("board") === "jobPosting" ? "default" : "outline"}
                  onClick={() =>
                    form.setValue("board", "jobPosting", {
                      shouldValidate: true,
                    })
                  }
                >
                  채용공고
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input id="title" placeholder={getBoardTitlePlaceholder(composingBoard)} {...form.register("title")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <Textarea id="content" placeholder={getBoardContentPlaceholder(composingBoard)} {...form.register("content")} />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{composingGuide.title}</p>
                <p className="text-xs leading-5 text-muted-foreground">{composingGuide.description}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {composingGuide.tips.map((tip) => (
                  <span
                    key={tip}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground"
                  >
                    {tip}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                노골적 음란 표현, 개인정보 노출, 반복 도배성 글은 자동 제한될 수 있습니다.
              </p>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">투표 추가</p>
                  <p className="text-xs text-muted-foreground">한 번 터치로 참여를 유도하는 선택형 글</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={form.watch("pollEnabled") ? "default" : "outline"}
                  onClick={() => form.setValue("pollEnabled", !form.watch("pollEnabled"))}
                >
                  {form.watch("pollEnabled") ? "사용 중" : "추가"}
                </Button>
              </div>
              {form.watch("pollEnabled") ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="pollQuestion">투표 질문</Label>
                    <Input id="pollQuestion" {...form.register("pollQuestion")} placeholder="예: 먼저 연락한다 vs 기다린다?" />
                  </div>
                  <div className="space-y-2">
                    <Label>선택지</Label>
                    <div className="space-y-2">
                      {(form.watch("pollOptions") ?? ["", ""]).map((_, index) => (
                        <Input
                          key={`poll-option-${index}`}
                          value={form.watch(`pollOptions.${index}` as const) ?? ""}
                          placeholder={`선택지 ${index + 1}`}
                          onChange={(event) => {
                            const nextOptions = [...(form.getValues("pollOptions") ?? ["", ""])];
                            nextOptions[index] = event.target.value;
                            form.setValue("pollOptions", nextOptions, { shouldValidate: true });
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {(form.getValues("pollOptions")?.length ?? 0) < 4 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const nextOptions = [...(form.getValues("pollOptions") ?? ["", ""]), ""].slice(0, 4);
                            form.setValue("pollOptions", nextOptions, { shouldValidate: true });
                          }}
                        >
                          선택지 추가
                        </Button>
                      ) : null}
                      {(form.getValues("pollOptions")?.length ?? 0) > 2 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const nextOptions = [...(form.getValues("pollOptions") ?? ["", ""])];
                            nextOptions.pop();
                            form.setValue("pollOptions", nextOptions, { shouldValidate: true });
                          }}
                        >
                          마지막 선택지 삭제
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            {form.watch("board") === "anonymous" ? (
              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                익명 게시판에서는 글과 댓글이 자동으로 익명 처리됩니다.
              </div>
            ) : (
              <div className="space-y-2">
                <Label>공개 범위</Label>
                <VisibilityLevelSelect
                  value={form.watch("visibilityLevel")}
                  levels={STANDARD_VISIBILITY_LEVELS}
                  onChange={(value) =>
                    form.setValue("visibilityLevel", value, { shouldValidate: true })
                  }
                />
              </div>
            )}
            {form.formState.errors.root?.message ? (
              <p className="text-sm text-rose-600">{form.formState.errors.root.message}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              등록하기
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
