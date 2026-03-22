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
import { EmptyState } from "@/components/shared/empty-state";
import { FeedList } from "@/components/shared/feed-list";
import { CommentThread } from "@/features/common/comment-thread";
import { PostAuthorRow } from "@/features/common/post-author-row";
import { FloatingComposeButton } from "@/components/shared/floating-compose-button";
import { LoadingState } from "@/components/shared/loading-state";
import { ReportBlockActions } from "@/components/shared/report-block-actions";
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
import { createPost } from "@/app/actions/content-actions";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { injectInlineAdSlots, isAdPlacementEnabled } from "@/lib/ads";
import { CAREER_BOARD_LABELS } from "@/lib/constants";
import { validatePostSubmission } from "@/lib/moderation";
import { canAccessSchoolFeatures, canWriteCareer, canWriteCommunity } from "@/lib/permissions";
import {
  addBlockToSnapshot,
  addPostToSnapshot,
  addReportToSnapshot,
} from "@/lib/runtime-mutations";
import {
  type CareerBoardKind,
  getCareerBoardKind,
  getCareerPosts,
  getCommunityPosts,
  getHotScore,
  getHotGalleryPosts,
  getLatestCommentPreview,
  getSchoolName,
  isRepeatedlyReportedUser,
} from "@/lib/mock-queries";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import {
  createBlockRecord,
  createReportRecord,
  getAuthFlowHref,
  hasCompletedOnboarding,
} from "@/lib/supabase/app-data";
import { getDefaultVisibilityLevel } from "@/lib/user-identity";
import { cn, formatRelativeLabel, getPostViewCount } from "@/lib/utils";
import type { AppRuntimeSnapshot, Post, ReportReason, VisibilityLevel } from "@/types";

const communitySchema = z.object({
  board: z.enum(["free", "advice", "ask", "hot", "careerInfo", "jobPosting"]),
  title: z.string().min(4, "제목을 4자 이상 입력해주세요."),
  content: z.string().min(10, "본문을 10자 이상 입력해주세요."),
  visibilityLevel: z.enum(["anonymous", "school", "schoolDepartment", "profile"]),
});

type CommunityFormValues = z.infer<typeof communitySchema>;
type SharedFilter = "all" | "free" | "advice" | "ask" | "hot" | "career";

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
  const careerBoard = getCareerBoardKind(post);
  if (careerBoard) return CAREER_BOARD_LABELS[careerBoard];
  if (post.subcategory === "free") return "자유";
  if (post.subcategory === "advice") return "고민";
  if (post.subcategory === "ask") return "무물";
  if (post.subcategory === "hot") return "핫갤";
  return "자유";
}

function getDefaultBoard(filter: SharedFilter): CommunityFormValues["board"] {
  if (filter === "free") return "free";
  if (filter === "advice") return "advice";
  if (filter === "ask") return "ask";
  if (filter === "hot") return "hot";
  if (filter === "career") return "careerInfo";
  return "free";
}

function getComposeLabel(filter: SharedFilter) {
  if (filter === "all") return "글쓰기";
  if (filter === "free") return "자유 글쓰기";
  if (filter === "ask") return "무물 글쓰기";
  if (filter === "hot") return "핫갤 글쓰기";
  if (filter === "career") return "취업 글쓰기";
  return "고민 글쓰기";
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
  if (post.subcategory === "free") return "free";
  if (post.subcategory === "ask") return "ask";
  if (post.subcategory === "hot") return "hot";
  return "advice";
}

function SharedFeedCard({
  post,
  hotScore,
  latestComment,
  onOpen,
  onReport,
  onBlock,
  repeatedlyReported,
}: {
  post: Post;
  hotScore?: number;
  latestComment?: string;
  onOpen: () => void;
  onReport: (input: { reason?: ReportReason; memo?: string }) => Promise<void> | void;
  onBlock: () => Promise<void> | void;
  repeatedlyReported: boolean;
}) {
  return (
    <article className="border-b border-gray-100 last:border-b-0">
      <div className="space-y-3 px-4 py-4 transition-colors duration-150 hover:bg-gray-50">
        <PostAuthorRow
          authorId={post.authorId}
          createdAt={post.createdAt}
          visibilityLevel={post.visibilityLevel}
          trailing={<span className="text-xs text-gray-400">{getCardLabel(post)}</span>}
        />
        <button
          type="button"
          onClick={onOpen}
          className="block w-full space-y-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            {post.subcategory === "hot" ? <span className="text-rose-500">19+</span> : null}
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
          <span>{formatRelativeLabel(post.createdAt)}</span>
        </div>
        {latestComment ? (
          <button
            type="button"
            onClick={onOpen}
            className="block w-full rounded-xl bg-gray-50 px-4 py-3 text-left text-sm text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            <span className="inline-flex items-center gap-1 font-medium text-gray-700">
              <MessageCircle className="h-4 w-4" />
              최근 댓글
            </span>
            <p className="mt-1 line-clamp-2 leading-6">{latestComment}</p>
          </button>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <Button type="button" size="sm" onClick={onOpen}>
            상세 보기
          </Button>
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
  } = useAppRuntime(initialSnapshot);
  const currentUser = runtimeUser;
  const [activeFilter, setActiveFilter] = useState<SharedFilter>(
    isSharedFilter(filterParam) ? filterParam : "all",
  );
  const [sortMode, setSortMode] = useState<"popular" | "latest">("popular");
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const canAccessCommunity =
    !isAuthenticated ||
    !hasCompletedOnboarding(currentUser) ||
    canAccessSchoolFeatures(currentUser);

  useEffect(() => {
    setActiveFilter(isSharedFilter(filterParam) ? filterParam : "all");
  }, [filterParam]);

  const freePosts = useMemo(() => getCommunityPosts("free"), []);
  const hotPosts = useMemo(() => getHotGalleryPosts(), []);
  const advicePosts = useMemo(() => getCommunityPosts("advice"), []);
  const askPosts = useMemo(() => getCommunityPosts("ask"), []);
  const careerPosts = useMemo(() => getCareerPosts(), []);

  const feedItems = useMemo(() => {
    const all = [...freePosts, ...advicePosts, ...hotPosts, ...askPosts, ...careerPosts];
    return [...all].sort((a, b) => b.likes - a.likes || +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [advicePosts, askPosts, careerPosts, freePosts, hotPosts]);

  useEffect(() => {
    if (!detailParam) {
      return;
    }

    const targetPost = feedItems.find((post) => post.id === detailParam);
    if (!targetPost) {
      return;
    }

    setActiveFilter(getFilterForPost(targetPost));
    setDetailPostId(targetPost.id);
  }, [detailParam, feedItems]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return feedItems;
    if (activeFilter === "free") return freePosts;
    if (activeFilter === "advice") return advicePosts;
    if (activeFilter === "hot") return hotPosts;
    if (activeFilter === "ask") return askPosts;
    if (activeFilter === "career") return careerPosts;
    return advicePosts;
  }, [activeFilter, advicePosts, askPosts, careerPosts, feedItems, freePosts, hotPosts]);
  const sortedItems = useMemo(() => {
    const items = [...filteredItems];
    if (sortMode === "latest") {
      return items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }

    return items.sort(
      (a, b) =>
        getPopularityScore(b) - getPopularityScore(a) ||
        b.likes - a.likes ||
        b.commentCount - a.commentCount ||
        +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  }, [filteredItems, sortMode]);
  const feedSlots = useMemo(() => injectInlineAdSlots(sortedItems), [sortedItems]);

  const detailPost = useMemo(
    () => feedItems.find((post) => post.id === detailPostId) ?? null,
    [detailPostId, feedItems],
  );

  const canComposeCommunity =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canWriteCommunity(currentUser);
  const canComposeCareer =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canWriteCareer(currentUser);
  const canCompose =
    activeFilter === "career" ? canComposeCareer : canComposeCommunity;

  const form = useForm<CommunityFormValues>({
    resolver: zodResolver(communitySchema),
    defaultValues: {
      board: getDefaultBoard(activeFilter),
      title: "",
      content: "",
      visibilityLevel: currentUser.defaultVisibilityLevel ?? getDefaultVisibilityLevel(currentUser),
    },
  });

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
    const communityBoard =
      values.board === "free" ||
      values.board === "advice" ||
      values.board === "ask" ||
      values.board === "hot"
        ? values.board
        : undefined;
    const tags = isCareerBoard
      ? [
          CAREER_BOARD_LABELS[values.board as CareerBoardKind],
          values.board === "careerInfo" ? "합격루틴" : "인턴",
        ]
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
      authorId: currentUser.id,
      schoolId: currentUser.schoolId,
      visibilityLevel: values.visibilityLevel as VisibilityLevel,
      title: values.title,
      content: values.content,
      createdAt,
      likes: 0,
      commentCount: 0,
      tags,
    };

    if (source === "supabase" && isAuthenticated) {
      startSubmitTransition(() => {
        void (async () => {
          try {
            await createPost({
              category: "community",
              subcategory: communityBoard,
              schoolId: currentUser.schoolId,
              visibilityLevel: values.visibilityLevel,
              title: values.title,
              content: values.content,
              tags,
            });
            await refresh();
            setComposerOpen(false);
            form.reset();
            setActiveFilter(getFilterFromBoard(values.board));
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
    setActiveFilter(getFilterFromBoard(values.board));
  });

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
            <Button type="button" onClick={() => router.push("/admission")}>
              입시 게시판으로 이동
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

      <section className="space-y-3">
        <div className="space-y-3">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all",
                  activeFilter === filter.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-white/85 bg-white/88 text-foreground",
                )}
              >
                <filter.icon className="h-4 w-4" />
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
          <Card className="shadow-none">
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">정렬</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={sortMode === "popular" ? "default" : "outline"}
                  onClick={() => setSortMode("popular")}
                >
                  인기순
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={sortMode === "latest" ? "default" : "outline"}
                  onClick={() => setSortMode("latest")}
                >
                  최신순
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        {filteredItems.length === 0 ? (
          <EmptyState
            title="표시할 글이 없습니다"
            description="다른 카테고리를 둘러보거나 새 글이 올라오기를 기다려보세요."
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
                onOpen={() => setDetailPostId(post.id)}
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

      {activeFilter === "hot" && isAdPlacementEnabled("hotGalleryFooter") ? (
        <AdPlaceholderCard placement="hotGalleryFooter" />
      ) : null}

      <Dialog open={Boolean(detailPost)} onOpenChange={(next) => !next && setDetailPostId(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          {detailPost ? (
            <>
              <DialogHeader>
                <DialogTitle>{detailPost.title}</DialogTitle>
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
                  />
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getCardVariant(detailPost)}>{getCardLabel(detailPost)}</Badge>
                    {detailPost.subcategory === "hot" ? <Badge variant="danger">19+</Badge> : null}
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">{detailPost.content}</p>
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
                </CardContent>
              </Card>
              <CommentThread postId={detailPost.id} />
            </>
          ) : null}
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
              <Input id="title" {...form.register("title")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <Textarea id="content" {...form.register("content")} />
            </div>
            <div className="space-y-2">
              <Label>공개 범위</Label>
              <VisibilityLevelSelect
                value={form.watch("visibilityLevel")}
                onChange={(value) => form.setValue("visibilityLevel", value, { shouldValidate: true })}
              />
            </div>
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
