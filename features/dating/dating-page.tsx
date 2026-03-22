"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, Heart, MessageCircle, ShieldCheck, Users } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { AccountRequiredCard } from "@/components/shared/account-required-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FloatingComposeButton } from "@/components/shared/floating-compose-button";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { LoadingState } from "@/components/shared/loading-state";
import { ReportBlockActions } from "@/components/shared/report-block-actions";
import { TrustScoreBadge } from "@/components/shared/trust-score-badge";
import { VisibilityLevelSelect } from "@/components/shared/visibility-level-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createDatingPost } from "@/app/actions/content-actions";
import { CommentThread } from "@/features/common/comment-thread";
import { PostAuthorRow } from "@/features/common/post-author-row";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import {
  validateDatingWriteAccess,
  validatePostSubmission,
} from "@/lib/moderation";
import {
  addBlockToSnapshot,
  addPostToSnapshot,
  addReportToSnapshot,
} from "@/lib/runtime-mutations";
import {
  getDatingPosts,
  getDatingProfileByUserId,
  getPublicIdentitySummary,
  getSchoolName,
  isRepeatedlyReportedUser,
} from "@/lib/mock-queries";
import { canAccessDating } from "@/lib/permissions";
import { getRuntimeSnapshot } from "@/lib/runtime-state";
import {
  createBlockRecord,
  createReportRecord,
  getAuthFlowHref,
  hasCompletedOnboarding,
} from "@/lib/supabase/app-data";
import { deleteImageByPublicUrl } from "@/lib/supabase/storage";
import { getPostViewCount } from "@/lib/utils";
import type { AppRuntimeSnapshot, Post } from "@/types";

const datingSchema = z.object({
  subcategory: z.enum(["dating", "meeting"]),
  title: z.string().min(3),
  content: z.string().min(6),
  vibeTag: z.string().min(2),
  photoUrl: z.string().url().optional().or(z.literal("")),
  visibilityLevel: z.enum(["anonymous", "school", "schoolDepartment", "profile"]),
});

type DatingFormValues = z.infer<typeof datingSchema>;

export function DatingPage({
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
    datingProfiles,
    currentUser: runtimeUser,
    source,
    isAuthenticated,
    refresh,
    setSnapshot,
  } = useAppRuntime(initialSnapshot, "dating");
  const currentUser = runtimeUser;
  const [open, setOpen] = useState(false);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [items, setItems] = useState(getDatingPosts());
  const [isSubmitting, startSubmitTransition] = useTransition();
  const canCompose =
    isAuthenticated && hasCompletedOnboarding(currentUser) && canAccessDating(currentUser);

  useEffect(() => {
    setItems(getDatingPosts());
  }, [blocks, datingProfiles, posts, reports]);

  const profiles = useMemo(
    () =>
      items
        .map((item) => getDatingProfileByUserId(item.authorId))
        .filter(Boolean),
    [items],
  );
  const form = useForm<DatingFormValues>({
    resolver: zodResolver(datingSchema),
    defaultValues: {
      subcategory: "meeting",
      title: "",
      content: "",
      vibeTag: "카페 / 전시",
      photoUrl: "",
      visibilityLevel: "profile",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors("root");
    const accessError = validateDatingWriteAccess(currentUser);
    if (accessError) {
      form.setError("root", { message: accessError });
      return;
    }

    const createdAt = new Date().toISOString();
    const validationError = validatePostSubmission(getRuntimeSnapshot(), {
      authorId: currentUser.id,
      category: "dating",
      title: values.title,
      content: values.content,
      createdAt,
    });
    if (validationError) {
      form.setError("root", { message: validationError });
      return;
    }

    const profile = getDatingProfileByUserId(currentUser.id);
    const localProfile = {
      id: profile?.id ?? `dating-profile-local-${currentUser.id}`,
      userId: currentUser.id,
      intro: currentUser.bio ?? values.content,
      vibeTag: values.vibeTag,
      photoUrl: values.photoUrl || profile?.photoUrl,
      isVisible: true,
      visibilityLevel: values.visibilityLevel,
      schoolId: currentUser.schoolId ?? "",
      department: currentUser.department,
      grade: currentUser.grade ?? 1,
    };
    const localPost = {
      id: `dating-local-${items.length + 1}`,
      category: "dating" as const,
      subcategory: values.subcategory,
      authorId: currentUser.id,
      schoolId: currentUser.schoolId,
      visibilityLevel: values.visibilityLevel,
      title: values.title,
      content: values.content,
      createdAt,
      likes: 0,
      commentCount: 0,
      tags: [values.vibeTag, "새 글"],
      imageUrl: values.photoUrl || undefined,
    };

    if (source === "supabase" && isAuthenticated) {
      startSubmitTransition(() => {
        void (async () => {
          try {
            await createDatingPost({
              title: values.title,
              content: values.content,
              vibeTag: values.vibeTag,
              photoUrl: values.photoUrl || undefined,
              visibilityLevel: values.visibilityLevel,
              subcategory: values.subcategory,
            });
            await refresh();
            setOpen(false);
            form.reset();
          } catch (error) {
            await deleteImageByPublicUrl(values.photoUrl);
            form.setError("root", {
              message: error instanceof Error ? error.message : "미팅 글 등록에 실패했습니다.",
            });
          }
        })();
      });
      return;
    } else {
      setItems((current) => [localPost, ...current]);
      setSnapshot((current) => ({
        ...addPostToSnapshot(current, localPost),
        datingProfiles: current.datingProfiles.some((item) => item.userId === currentUser.id)
          ? current.datingProfiles.map((item) =>
              item.userId === currentUser.id ? localProfile : item,
            )
          : [localProfile, ...current.datingProfiles],
      }));
    }

    setOpen(false);
    form.reset();
  });

  if (!canAccessDating(currentUser)) {
    if (!isAuthenticated || !hasCompletedOnboarding(currentUser)) {
      return (
        <AppShell title="미팅 / 연애" subtitle="안전하게 연결되는 대학생 익명 피드" showTabs>
          <AccountRequiredCard
            isAuthenticated={isAuthenticated}
            user={currentUser}
            nextPath={pathname}
            title={isAuthenticated ? "프로필 설정을 마치면 바로 둘러볼 수 있습니다" : "로그인 후 미팅 / 연애 피드를 볼 수 있습니다"}
            description={
              isAuthenticated
                ? "학교와 기본 공개 범위를 정하면 프로필 카드와 글이 자연스럽게 이어집니다."
                : "로그인 후 프로필을 만들면 학교 기반 익명 매칭 피드를 바로 확인할 수 있습니다."
            }
            ctaLabel={isAuthenticated ? "프로필 설정 이어가기" : "로그인하고 보기"}
          />
        </AppShell>
      );
    }

    if (currentUser.userType === "applicant") {
      return (
        <AppShell title="미팅 / 연애" subtitle="대학생 중심 익명 관계 피드" showTabs>
          <EmptyState
            title="입시생 계정은 입시 탭부터 이용할 수 있습니다"
            description="연애와 미팅은 대학 생활 맥락에서 열리는 기능입니다. 지금은 입시 질문과 학교 정보를 먼저 살펴보세요."
            actionLabel="지망학교 보기"
            href="/school?tab=admission"
          />
        </AppShell>
      );
    }

    if (currentUser.userType === "freshman") {
      return (
        <AppShell title="미팅 / 연애" subtitle="대학생 중심 익명 관계 피드" showTabs>
          <EmptyState
            title="예비입학생은 새내기존과 커뮤니티부터 이용할 수 있습니다"
            description="미팅과 연애는 대학생 인증 뒤 열리는 공간입니다. 지금은 새내기존과 학교 생활 글부터 천천히 둘러보세요."
            actionLabel="새내기존 보기"
            href="/school?tab=freshman"
          />
        </AppShell>
      );
    }

    return (
      <AppShell title="미팅 / 연애" subtitle="대학생 전용" showTabs>
        <EmptyState
          title="학교 메일 인증을 마치면 바로 열립니다"
          description="안전한 이용을 위해 학교 메일 인증을 끝낸 대학생만 프로필 카드와 글쓰기를 사용할 수 있습니다."
          actionLabel="인증하러 가기"
          href="/onboarding?next=%2Fdating&mode=verification"
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="미팅 / 연애"
      subtitle="대학생 익명 관계 피드"
    >
      {loading ? <LoadingState /> : null}
      <Card className="border-amber-200 bg-amber-50/90">
        <CardContent className="py-4">
          <p className="text-sm font-medium text-amber-800">
            ⚠️ 개인정보 공유에 주의하세요
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">프로필 카드</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {profiles.map((profile) => {
            if (!profile) return null;
            const identity = getPublicIdentitySummary(
              profile.userId,
              profile.visibilityLevel ?? "profile",
            );

            return (
              <Card key={profile.id} className="min-w-[240px] overflow-hidden border-white/80 bg-white/94">
                <div className="relative flex h-28 w-full items-center justify-between bg-[linear-gradient(135deg,#fff1f2_0%,#ffe4e6_50%,#fdf2f8_100%)] px-5">
                  {profile.photoUrl ? (
                    <Image
                      src={profile.photoUrl}
                      alt={profile.vibeTag}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.4))]" />
                  <div className="relative space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{profile.vibeTag}</p>
                    <p className="text-xs text-muted-foreground">
                      {profile.photoUrl ? "업로드한 프로필 이미지" : "사진 1장 연결 구조만 유지"}
                    </p>
                  </div>
                  <div className="relative rounded-full bg-white/80 p-3 text-rose-500">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>
                <CardContent className="space-y-2 py-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{identity.label}</p>
                    <Badge variant="secondary">프로필 공개</Badge>
                  </div>
                  <TrustScoreBadge score={identity.trustScore} />
                  <p className="line-clamp-3 text-sm leading-6">{profile.intro}</p>
                  <ReportBlockActions
                    compact
                    targetType="user"
                    targetId={profile.userId}
                    targetUserId={profile.userId}
                    repeatedlyReported={isRepeatedlyReportedUser(profile.userId)}
                    onReport={async ({ reason, memo }) => {
                      if (source === "supabase" && isAuthenticated) {
                        await createReportRecord({
                          reporterId: currentUser.id,
                          targetType: "user",
                          targetId: profile.userId,
                          reason,
                          memo,
                        });
                        await refresh();
                        return;
                      }

                      setSnapshot((current) =>
                        addReportToSnapshot(current, {
                          targetType: "user",
                          targetId: profile.userId,
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
                          blockedUserId: profile.userId,
                        });
                        await refresh();
                        return;
                      }

                      setSnapshot((current) =>
                        addBlockToSnapshot(current, {
                          blockerId: currentUser.id,
                          blockedUserId: profile.userId,
                        }),
                      );
                    }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        {items.length === 0 ? (
          <EmptyState
            title="아직 올라온 글이 없습니다"
            description="가볍게 한 줄 소개만 적어도 이야기를 시작할 수 있어요."
          />
        ) : null}
        {items.map((post) => (
          <Card key={post.id} className="overflow-hidden border-white/80 bg-white/94 transition-transform hover:-translate-y-0.5">
            <CardHeader className="space-y-4">
              <PostAuthorRow
                authorId={post.authorId}
                createdAt={post.createdAt}
                visibilityLevel={post.visibilityLevel ?? "profile"}
              />
              <button
                type="button"
                onClick={() => setDetailPost(post)}
                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-[18px] leading-7">{post.title}</CardTitle>
                  <Badge variant={post.subcategory === "meeting" ? "warning" : "danger"}>
                    {post.subcategory === "meeting" ? "미팅" : "연애"}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {post.content}
                </p>
              </button>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {post.imageUrl ? (
                <button
                  type="button"
                  onClick={() => setDetailPost(post)}
                  className="block w-full overflow-hidden rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                >
                  <Image
                    src={post.imageUrl}
                    alt={post.title}
                    width={1200}
                    height={900}
                    className="h-48 w-full object-cover"
                  />
                </button>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {post.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
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
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setDetailPost(post)}>
                  상세 보기
                  </Button>
                  <ReportBlockActions
                    targetType="post"
                    targetId={post.id}
                    targetUserId={post.authorId}
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
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <FloatingComposeButton
        onClick={() => {
          if (!canCompose) {
            if (isAuthenticated && hasCompletedOnboarding(currentUser)) {
              router.push(`/onboarding?next=${encodeURIComponent(pathname)}`);
              return;
            }
            router.push(
              getAuthFlowHref({
                isAuthenticated,
                user: currentUser,
                nextPath: pathname,
              }),
            );
            return;
          }

          form.setValue("subcategory", "meeting", {
            shouldValidate: true,
          });
          setOpen(true);
        }}
        label="미팅 / 연애 글 작성"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.watch("subcategory") === "meeting" ? "미팅 글 작성" : "연애 글 작성"}</DialogTitle>
            <DialogDescription>
              제목, 한줄 태그, 내용만 입력하면 바로 올릴 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>카테고리</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.watch("subcategory") === "meeting" ? "default" : "outline"}
                  onClick={() =>
                    form.setValue("subcategory", "meeting", {
                      shouldValidate: true,
                    })
                  }
                >
                  미팅
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.watch("subcategory") === "dating" ? "default" : "outline"}
                  onClick={() =>
                    form.setValue("subcategory", "dating", {
                      shouldValidate: true,
                    })
                  }
                >
                  연애
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>제목</Label>
              <Input placeholder="예: 건대입구에서 카페 같이 갈 사람" {...form.register("title")} />
            </div>
            <div className="space-y-2">
              <Label>한줄 분위기 태그</Label>
              <Input placeholder="예: 카페 / 전시 / 담백한 대화" {...form.register("vibeTag")} />
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea
                placeholder="가볍게 보고 싶은 일정이나 분위기만 적어도 됩니다."
                {...form.register("content")}
              />
            </div>
            <ImageUploadField
              label="프로필 사진"
              helperText="미팅 프로필과 게시글 대표 이미지에 함께 사용됩니다."
              value={form.watch("photoUrl")}
              onChange={(url) => form.setValue("photoUrl", url, { shouldValidate: true })}
              userId={currentUser.id}
              target="profile"
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
              {isSubmitting ? "등록 중" : "등록하기"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailPost)} onOpenChange={(next) => !next && setDetailPost(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {detailPost ? (
            <>
              <DialogHeader>
                <DialogTitle>{detailPost.title}</DialogTitle>
                <DialogDescription>
                  {getSchoolName(detailPost.schoolId)} · 신고 / 차단 기능 상시 노출
                </DialogDescription>
              </DialogHeader>
              <Card className="shadow-none">
                <CardContent className="space-y-3 py-5">
                  <PostAuthorRow
                    authorId={detailPost.authorId}
                    createdAt={detailPost.createdAt}
                    visibilityLevel={detailPost.visibilityLevel ?? "profile"}
                  />
                  {detailPost.imageUrl ? (
                    <div className="relative overflow-hidden rounded-[22px]">
                      <Image
                        src={detailPost.imageUrl}
                        alt={detailPost.title}
                        width={1200}
                        height={900}
                        className="h-56 w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <p className="text-sm leading-6 text-muted-foreground">
                    {detailPost.content}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="warning">개인 연락처 요구 시 신고</Badge>
                    <Badge variant="outline">차단 시 즉시 피드 숨김</Badge>
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
                </CardContent>
              </Card>
              <CommentThread postId={detailPost.id} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
