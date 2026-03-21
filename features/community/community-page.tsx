"use client";

import Image from "next/image";
import { useTransition } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Flame, Heart, MessageCircle, Sparkles, Users2 } from "lucide-react";

import { AdPlaceholderCard } from "@/components/ads/ad-placeholder-card";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { CommentThread } from "@/features/common/comment-thread";
import { PostAuthorRow } from "@/features/common/post-author-row";
import { FloatingComposeButton } from "@/components/shared/floating-compose-button";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { LoadingState } from "@/components/shared/loading-state";
import { ReportBlockActions } from "@/components/shared/report-block-actions";
import { VisibilityLevelSelect } from "@/components/shared/visibility-level-select";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { validatePostSubmission } from "@/lib/moderation";
import { canAccessSchoolFeatures, canWriteCommunity } from "@/lib/permissions";
import {
  addBlockToSnapshot,
  addPostToSnapshot,
  addReportToSnapshot,
} from "@/lib/runtime-mutations";
import {
  getCurrentSchool,
  getDatingPosts,
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
import { cn, formatRelativeLabel } from "@/lib/utils";
import type { AppRuntimeSnapshot, Post, ReportReason, VisibilityLevel } from "@/types";
import { deleteImageByPublicUrl } from "@/lib/supabase/storage";

const communitySchema = z.object({
  title: z.string().min(4, "제목을 4자 이상 입력해주세요."),
  content: z.string().min(10, "본문을 10자 이상 입력해주세요."),
  imageUrl: z.string().url().optional().or(z.literal("")),
  visibilityLevel: z.enum(["anonymous", "school", "schoolDepartment", "profile"]),
});

type CommunityFormValues = z.infer<typeof communitySchema>;
type SharedFilter = "all" | "hot" | "dating" | "meeting";

const FILTERS: Array<{
  value: SharedFilter;
  label: string;
  icon: typeof Sparkles;
}> = [
  { value: "all", label: "전체", icon: Sparkles },
  { value: "hot", label: "핫갤", icon: Flame },
  { value: "dating", label: "연애", icon: Heart },
  { value: "meeting", label: "미팅", icon: Users2 },
] as const;

function isSharedFilter(value: string | null): value is SharedFilter {
  return FILTERS.some((filter) => filter.value === value);
}

function getCardVariant(post: Post): BadgeProps["variant"] {
  if (post.subcategory === "hot") return "danger";
  if (post.subcategory === "meeting") return "warning";
  return "secondary";
}

function getCardLabel(post: Post) {
  if (post.subcategory === "hot") return "핫갤";
  if (post.subcategory === "meeting") return "미팅";
  return "연애";
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
    <Card className="overflow-hidden border-white/80 bg-white/92 transition-transform hover:-translate-y-0.5">
      <CardHeader className="space-y-4">
        <PostAuthorRow
          authorId={post.authorId}
          createdAt={post.createdAt}
          visibilityLevel={post.visibilityLevel}
          trailing={<Badge variant={getCardVariant(post)}>{getCardLabel(post)}</Badge>}
        />
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {post.subcategory === "hot" ? <Badge variant="danger">HOT</Badge> : null}
            {post.subcategory === "hot" && hotScore ? (
              <Badge variant="outline">지수 {hotScore}</Badge>
            ) : null}
          </div>
          <CardTitle className="text-[19px] leading-7 tracking-tight">{post.title}</CardTitle>
          <CardDescription className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {post.content}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {post.imageUrl ? (
          <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-secondary/50">
            <Image
              src={post.imageUrl}
              alt={post.title}
              width={1200}
              height={900}
              className="h-52 w-full object-cover"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/70 px-3 py-1.5 font-medium">
            반응 {post.likes}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/70 px-3 py-1.5 font-medium">
            <MessageCircle className="h-3.5 w-3.5" />
            댓글 {post.commentCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/70 px-3 py-1.5 font-medium">
            {formatRelativeLabel(post.createdAt)}
          </span>
        </div>
        {latestComment ? (
          <div className="rounded-[18px] border border-white/75 bg-secondary/70 px-4 py-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <MessageCircle className="h-4 w-4" />
              최근 댓글
            </span>
            <p className="mt-1 line-clamp-2 leading-6">{latestComment}</p>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <Button type="button" size="sm" onClick={onOpen}>
            댓글 보기
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
      </CardContent>
    </Card>
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
  const [activeFilter, setActiveFilter] = useState<SharedFilter>(
    isSharedFilter(filterParam) ? filterParam : "all",
  );
  const [hotSort, setHotSort] = useState<"popular" | "latest">("popular");
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const canCompose =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canWriteCommunity(currentUser);
  const canAccessCommunity =
    !isAuthenticated ||
    !hasCompletedOnboarding(currentUser) ||
    canAccessSchoolFeatures(currentUser);

  useEffect(() => {
    setActiveFilter(isSharedFilter(filterParam) ? filterParam : "all");
  }, [filterParam]);

  const hotPosts = useMemo(() => getHotGalleryPosts(hotSort), [blocks, hotSort, posts, reports]);
  const datingPosts = useMemo(() => getDatingPosts("dating"), [blocks, posts, reports]);
  const meetingPosts = useMemo(() => getDatingPosts("meeting"), [blocks, posts, reports]);
  const currentSchool = getCurrentSchool();
  const schoolName = currentSchool?.name ?? "건국대학교";

  const feedItems = useMemo(() => {
    const all = [...hotPosts, ...datingPosts, ...meetingPosts];
    return [...all].sort((a, b) => b.likes - a.likes || +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [datingPosts, hotPosts, meetingPosts]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return feedItems;
    if (activeFilter === "hot") return hotPosts;
    if (activeFilter === "dating") return datingPosts;
    return meetingPosts;
  }, [activeFilter, datingPosts, feedItems, hotPosts, meetingPosts]);
  const feedSlots = useMemo(() => injectInlineAdSlots(filteredItems), [filteredItems]);

  const detailPost = useMemo(
    () => feedItems.find((post) => post.id === detailPostId) ?? null,
    [detailPostId, feedItems],
  );

  const counts = {
    all: feedItems.length,
    hot: hotPosts.length,
    dating: datingPosts.length,
    meeting: meetingPosts.length,
  };

  if (!loading && !canAccessCommunity) {
    return (
      <AppShell title="커뮤니티" subtitle="대학생 중심 익명 커뮤니티">
        <Card className="border-dashed border-white/80 bg-white/92">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="space-y-1">
              <p className="font-semibold">입시생 계정은 입시 게시판만 사용할 수 있습니다</p>
              <p className="text-sm text-muted-foreground">
                커뮤니티, 핫갤, 연애/미팅은 대학생 계정에서만 열립니다.
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

  const form = useForm<CommunityFormValues>({
    resolver: zodResolver(communitySchema),
    defaultValues: {
      title: "",
      content: "",
      imageUrl: "",
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

    const localPost: Post = {
      id: `community-hot-local-${feedItems.length + 1}`,
      category: "community",
      subcategory: "hot",
      authorId: currentUser.id,
      schoolId: currentUser.schoolId,
      visibilityLevel: values.visibilityLevel as VisibilityLevel,
      title: values.title,
      content: values.content,
      createdAt,
      likes: 0,
      commentCount: 0,
      tags: ["HOT", "자유글"],
      imageUrl: values.imageUrl || undefined,
    };

    if (source === "supabase" && isAuthenticated) {
      startSubmitTransition(() => {
        void (async () => {
          try {
            await createPost({
              category: "community",
              subcategory: "hot",
              schoolId: currentUser.schoolId,
              visibilityLevel: values.visibilityLevel,
              title: values.title,
              content: values.content,
              imageUrl: values.imageUrl || undefined,
              tags: ["HOT", "자유글"],
            });
            await refresh();
            setComposerOpen(false);
            form.reset();
            setActiveFilter("hot");
          } catch (error) {
            await deleteImageByPublicUrl(values.imageUrl);
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
    setActiveFilter("hot");
  });

  return (
    <AppShell
      title="커뮤니티"
      subtitle={`${schoolName} 밖으로 퍼지는 공유 영역: 핫갤, 연애, 미팅`}
    >
      {loading ? <LoadingState /> : null}

      <Card className="overflow-hidden bg-[linear-gradient(135deg,#111827_0%,#1f2937_50%,#f5e9cd_100%)] text-white">
        <CardContent className="space-y-4 py-5">
          <div className="flex items-center justify-between">
            <Badge className="border-white/10 bg-white/15 text-white">전체 공유 영역</Badge>
            <Sparkles className="h-5 w-5 text-amber-200" />
          </div>
          <div className="space-y-2">
            <p className="text-[26px] font-semibold tracking-tight">핫갤은 빠르게, 연애와 미팅은 자연스럽게</p>
            <p className="text-sm leading-6 text-white/80">
              학교 내부 정보는 우리학교 탭으로, 익명 인기글과 관계형 콘텐츠는 여기서 소비합니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[22px] border border-white/20 bg-white/10 px-3 py-3 backdrop-blur">
              <p className="text-[11px] text-white/70">핫갤</p>
              <p className="mt-1 text-sm font-semibold">{counts.hot}개</p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/10 px-3 py-3 backdrop-blur">
              <p className="text-[11px] text-white/70">연애</p>
              <p className="mt-1 text-sm font-semibold">{counts.dating}개</p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/10 px-3 py-3 backdrop-blur">
              <p className="text-[11px] text-white/70">미팅</p>
              <p className="mt-1 text-sm font-semibold">{counts.meeting}개</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px]">
                  {counts[filter.value]}
                </span>
              </button>
            ))}
          </div>
          {activeFilter === "hot" ? (
            <Card className="border-white/80 bg-white/90 shadow-none">
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-semibold">인기 기준</p>
                  <p className="text-sm text-muted-foreground">반응 x2 + 댓글 x3 기준으로 HOT 순위를 계산합니다.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={hotSort === "popular" ? "default" : "outline"}
                    onClick={() => setHotSort("popular")}
                  >
                    인기순
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={hotSort === "latest" ? "default" : "outline"}
                    onClick={() => setHotSort("latest")}
                  >
                    최신순
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        {filteredItems.length === 0 ? (
          <EmptyState
            title="표시할 글이 없습니다"
            description="다른 카테고리를 둘러보거나 새 글이 올라오기를 기다려보세요."
          />
        ) : (
          feedSlots.map((slot) => {
            if (slot.kind === "ad") {
              return <AdPlaceholderCard key={slot.id} placement={slot.placement} />;
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
          })
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
                    {detailPost.subcategory === "hot" ? <Badge variant="danger">HOT</Badge> : null}
                  </div>
                  {detailPost.imageUrl ? (
                    <div className="relative overflow-hidden rounded-[24px] border border-white/70 bg-secondary/50">
                      <Image
                        src={detailPost.imageUrl}
                        alt={detailPost.title}
                        width={1200}
                        height={900}
                        className="h-60 w-full object-cover"
                      />
                    </div>
                  ) : null}
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
        }}
        label="핫갤 글쓰기"
      />

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>핫갤 글쓰기</DialogTitle>
            <DialogDescription>학교 밖 공유 영역에 올라가는 자유 익명 글입니다.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input id="title" {...form.register("title")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <Textarea id="content" {...form.register("content")} />
            </div>
            <ImageUploadField
              label="대표 이미지"
              helperText="핫갤 글 사이에 노출될 이미지를 업로드합니다."
              value={form.watch("imageUrl")}
              onChange={(url) => form.setValue("imageUrl", url, { shouldValidate: true })}
              userId={currentUser.id}
              disabled={!canCompose}
            />
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
