"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  BadgeCheck,
  BellRing,
  ChevronRight,
  GraduationCap,
  Shield,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { AccountRequiredCard } from "@/components/shared/account-required-card";
import { AppSettingsSection } from "@/components/shared/app-settings-section";
import { MyPageLevelSection } from "@/components/shared/my-page-level-section";
import { LoadingState } from "@/components/shared/loading-state";
import { ProfileCard } from "@/components/shared/profile-card";
import { SectionHeader } from "@/components/shared/section-header";
import { UserLevelText } from "@/components/shared/user-level-text";
import { VisibilityLevelSelect } from "@/components/shared/visibility-level-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { STANDARD_VISIBILITY_LEVELS } from "@/lib/constants";
import {
  getAnonymousHandle,
  getBlocks,
  getDatingProfileByUserId,
  getPublicIdentitySummary,
  getLectureTitle,
  getNotifications,
  getPostById,
  getPostHref,
  getUserComments,
  getUserLectureReviews,
  getUserPosts,
  getUserTradePosts,
  getUserVisibilityLevel,
} from "@/lib/mock-queries";
import {
  hasCompletedOnboarding,
  invalidateClientRuntimeSnapshots,
  signOutFromSupabase,
  upsertUserProfile,
} from "@/lib/supabase/app-data";
import { isMasterAdminEmail } from "@/lib/admin/master-admin-shared";
import {
  getStandardVisibilityLevel,
  getStudentVerificationBadge,
  getSchoolShortName,
} from "@/lib/user-identity";
import type { AppRuntimeSnapshot } from "@/types";

export function ProfilePage({
  initialSnapshot,
}: {
  initialSnapshot?: AppRuntimeSnapshot;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentUser: runtimeUser,
    loading,
    source,
    isAuthenticated,
    schools,
    refresh,
    setSnapshot,
  } = useAppRuntime(initialSnapshot, "profile");
  const currentUser = runtimeUser;
  const profile = getDatingProfileByUserId(currentUser.id);
  const blockedUsers = getBlocks();
  const unreadNotifications = getNotifications().filter((item) => !item.isRead);
  const myPosts = getUserPosts();
  const myComments = getUserComments();
  const myReviews = getUserLectureReviews();
  const myTradePosts = getUserTradePosts();
  const identity = getPublicIdentitySummary(
    currentUser.id,
    getUserVisibilityLevel(currentUser.id, currentUser.defaultVisibilityLevel),
  );
  const verificationBadge = getStudentVerificationBadge(currentUser);
  const schoolVerified = searchParams.get("schoolVerified") === "1";
  const verificationPending = searchParams.get("verification") === "pending";
  const canAccessAdmin = isMasterAdminEmail(currentUser.email);
  const adminPreviewSchool = schools.find((school) => school.id === currentUser.schoolId) ?? null;
  const adminAffiliationLabel = canAccessAdmin
    ? adminPreviewSchool
      ? `관리자(${getSchoolShortName(adminPreviewSchool.name)})`
      : "관리자"
    : identity.label;
  const [settings, setSettings] = useState({
    comment: true,
    answer: true,
    trade: true,
    marketing: false,
  });
  const moveToPost = (postId: string) => {
    router.push(getPostHref(postId));
  };
  const moveToLectureReview = (lectureId: string) => {
    router.push(`/lectures/${lectureId}`);
  };
  const moveToTradePost = (postId: string) => {
    router.push(`/trade?post=${postId}`);
  };

  if (!loading && !isAuthenticated) {
    return (
      <AppShell title="마이" subtitle="로그인 후 내 활동과 신뢰도를 관리합니다">
        <AccountRequiredCard
          isAuthenticated={false}
          nextPath="/profile"
          title="로그인 후 내 활동을 볼 수 있습니다"
          description="내 글, 내 댓글, 내 강의평, 내 매칭과 알림 설정은 로그인 후 사용할 수 있습니다."
        />
      </AppShell>
    );
  }

  if (!loading && isAuthenticated && !hasCompletedOnboarding(currentUser)) {
    return (
      <AppShell title="마이" subtitle="학교와 유저 타입만 설정하면 바로 시작할 수 있습니다">
        <AccountRequiredCard
          isAuthenticated
          user={currentUser}
          nextPath="/profile"
          title="프로필 설정이 아직 끝나지 않았습니다"
          description="유저 타입과 학교를 먼저 선택하면 글쓰기와 댓글이 바로 열립니다."
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="마이"
    >
      {loading ? <LoadingState /> : null}
      <section className="space-y-4 border-b border-gray-100 pb-5">
        <ProfileCard
          title={getAnonymousHandle(currentUser.id)}
          subtitle={adminAffiliationLabel}
          score={currentUser.trustScore}
          description="익명성과 신뢰를 함께 유지하는 기본 프로필"
        />
        <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-400">현재 상태</p>
            <UserLevelText score={currentUser.trustScore} className="ml-0 text-sm font-medium" />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">{canAccessAdmin ? "운영 권한" : "학교 인증"}</p>
            <p className="text-sm font-medium text-gray-900">
              {canAccessAdmin ? adminAffiliationLabel : verificationBadge.shortLabel}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs text-gray-400">읽지 않은 알림</p>
            <p className="text-sm font-medium text-gray-900">{unreadNotifications.length}건</p>
          </div>
        </div>
        <MyPageLevelSection score={currentUser.trustScore} />
      </section>

      <section className="space-y-2 border-b border-gray-100 pb-5">
        <p className="text-sm font-semibold text-gray-900">성인 인증 상태</p>
        <p className="text-sm text-gray-500">
          핫갤은 만 19세 이상 인증을 완료한 뒤에만 글쓰기와 댓글 작성이 가능합니다.
        </p>
        {currentUser.adultVerified ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            성인 인증 완료
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={async () => {
              const adultVerifiedAt = new Date().toISOString();
              const previousUser = currentUser;
              const nextUser = {
                ...currentUser,
                adultVerified: true,
                adultVerifiedAt,
              };

              setSnapshot((snapshot) => ({
                ...snapshot,
                currentUser: {
                  ...snapshot.currentUser,
                  adultVerified: true,
                  adultVerifiedAt,
                },
                users: snapshot.users.map((user) =>
                  user.id === snapshot.currentUser.id
                    ? { ...user, adultVerified: true, adultVerifiedAt }
                    : user,
                ),
              }));

              if (source === "supabase" && isAuthenticated) {
                const { error } = await upsertUserProfile(nextUser);
                if (error) {
                  setSnapshot((snapshot) => ({
                    ...snapshot,
                    currentUser: {
                      ...snapshot.currentUser,
                      adultVerified: previousUser.adultVerified,
                      adultVerifiedAt: previousUser.adultVerifiedAt,
                    },
                    users: snapshot.users.map((user) =>
                      user.id === snapshot.currentUser.id
                        ? {
                            ...user,
                            adultVerified: previousUser.adultVerified,
                            adultVerifiedAt: previousUser.adultVerifiedAt,
                          }
                        : user,
                    ),
                  }));
                  return;
                }
                invalidateClientRuntimeSnapshots();
                await refresh();
                router.refresh();
              }
            }}
          >
            만 19세 이상 인증
          </Button>
        )}
      </section>

      {canAccessAdmin ? (
        <section className="space-y-2 border-b border-gray-100 pb-5">
          <p className="text-sm font-semibold text-gray-900">관리자 계정</p>
          <p className="text-sm text-gray-500">
            학교 인증 대신 학교 미리보기와 운영 권한을 사용합니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/school")}>
              학교 선택하기
            </Button>
            <Button type="button" onClick={() => router.push("/admin")}>
              관리자 페이지
            </Button>
          </div>
        </section>
      ) : (
      <section className="space-y-2 border-b border-gray-100 pb-5">
          {schoolVerified ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              학교 메일 인증이 완료되었습니다. 대학생 전용 기능이 바로 열립니다.
            </div>
          ) : null}
          {verificationPending ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              학교 메일로 인증 링크를 보냈습니다. 받은 메일에서 인증을 마치면 권한이 열립니다.
            </div>
          ) : null}
          <p className="text-sm font-semibold text-gray-900">학생 인증 상태</p>
          <p className="text-sm text-gray-500">
            {currentUser.schoolEmail
              ? `인증 대상 메일: ${currentUser.schoolEmail}`
              : "학교 메일이 아직 등록되지 않았습니다."}
          </p>
          <p className="text-sm text-gray-500">
            강의평, 수강신청 매칭, 미팅 기능은 학교 메일 인증이 끝나면 바로 열립니다.
          </p>
          {verificationBadge.status !== "verified" ? (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => router.push("/onboarding?next=/profile&mode=verification")}
            >
              학교 메일 다시 인증
            </Button>
          ) : null}
      </section>
      )}

      <section className="space-y-3">
        <SectionHeader title="내 활동 요약" description="반복 사용 지표를 바로 확인" />
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">내 글</p>
              <p className="mt-1 text-lg font-semibold">{myPosts.length}개</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">내 댓글</p>
              <p className="mt-1 text-lg font-semibold">{myComments.length}개</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">내 강의평</p>
              <p className="mt-1 text-lg font-semibold">{myReviews.length}개</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">내 매칭</p>
              <p className="mt-1 text-lg font-semibold">{myTradePosts.length}개</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="기본 공개 범위" description="게시글과 댓글 작성 시 기본값으로 사용됩니다" />
        <Card>
          <CardContent className="space-y-3 py-5">
            <VisibilityLevelSelect
              value={getStandardVisibilityLevel(
                currentUser.defaultVisibilityLevel,
                currentUser,
              )}
              levels={STANDARD_VISIBILITY_LEVELS}
              onChange={async (value) => {
                setSnapshot((snapshot) => ({
                  ...snapshot,
                  currentUser: {
                    ...snapshot.currentUser,
                    defaultVisibilityLevel: value,
                  },
                  users: snapshot.users.map((user) =>
                    user.id === snapshot.currentUser.id
                      ? { ...user, defaultVisibilityLevel: value }
                      : user,
                  ),
                }));

                if (source === "supabase" && isAuthenticated) {
                  await upsertUserProfile({
                    ...currentUser,
                    defaultVisibilityLevel: value,
                  });
                  await refresh();
                }
              }}
            />
            <div className="rounded-[22px] bg-secondary/60 p-4 text-sm text-muted-foreground">
              현재 기본 공개 메타: {adminAffiliationLabel}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeader title="알림 설정" />
        <div className="space-y-3">
          {[
            { key: "comment", title: "내 글 댓글 알림", description: "게시글과 커뮤니티 댓글 반응" },
            { key: "answer", title: "입시 답변 / 채택 알림", description: "질문 답변과 채택 상태" },
            { key: "trade", title: "수강신청 매칭 알림", description: "매칭 후보와 관심 반응" },
            { key: "marketing", title: "추천 소식 받기", description: "인기 글과 신규 기능 소식" },
          ].map((item) => {
            const enabled = settings[item.key as keyof typeof settings];

            return (
              <Card key={item.key}>
                <CardContent className="flex items-center justify-between gap-3 py-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-secondary p-3">
                      <BellRing className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={enabled ? "default" : "outline"}
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        [item.key]: !current[item.key as keyof typeof current],
                      }))
                    }
                  >
                    {enabled ? "ON" : "OFF"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <AppSettingsSection />

      <section className="space-y-3">
        <SectionHeader title="계정 관리" />
        <div className="space-y-3">
          {[
            {
              icon: GraduationCap,
              title: canAccessAdmin ? "학교 선택 / 미리보기" : "학교 인증",
              description: canAccessAdmin
                ? "관리자 기준으로 학교 콘텐츠를 전환합니다"
                : "학교 이메일과 재학정보를 확인합니다",
              href: canAccessAdmin ? "/school" : "/onboarding?next=%2Fprofile&mode=verification",
            },
            {
              icon: BadgeCheck,
              title: "알림 페이지",
              description: "내 알림 피드를 전체 확인",
              href: "/notifications",
            },
            ...(canAccessAdmin
              ? [
                  {
                    icon: Shield,
                    title: "관리자 / 신고 현황",
                    description: "신고 처리 상태 확인",
                    href: "/admin",
                  },
                ]
              : []),
          ].map((item) => (
            <Link key={item.title} href={item.href}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 py-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-secondary p-3">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            if (source === "supabase" && isAuthenticated) {
              await signOutFromSupabase();
              await refresh();
            }
            router.push("/home");
          }}
        >
          로그아웃
        </Button>
      </section>

      {profile ? (
        <section className="space-y-3">
          <SectionHeader title="내 연애 프로필" description="추후 스토리 / 미디어 기능으로 확장 가능" />
          <Card>
            <CardContent className="space-y-3 py-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{profile.vibeTag}</p>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/dating">관리</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{profile.intro}</p>
              <p className="text-sm">
                {profile.department} · {profile.grade}학년
              </p>
              <UserLevelText score={currentUser.trustScore} className="ml-0" />
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="space-y-3">
        <SectionHeader title="내 활동" description="내가 쓴 글, 댓글, 강의평, 매칭 글을 한 번에 확인" />
        <Tabs defaultValue="posts" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="posts">내 글</TabsTrigger>
            <TabsTrigger value="comments">내 댓글</TabsTrigger>
            <TabsTrigger value="reviews">내 강의평</TabsTrigger>
            <TabsTrigger value="trade">내 매칭 글</TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="space-y-3">
            {myPosts.map((post) => (
              <Card key={post.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                <button type="button" className="w-full cursor-pointer text-left" onClick={() => moveToPost(post.id)}>
                  <CardContent className="space-y-2 py-5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{post.category}</Badge>
                      {post.subcategory ? <Badge variant="secondary">{post.subcategory}</Badge> : null}
                      {post.visibilityLevel ? <Badge variant="secondary">{post.visibilityLevel}</Badge> : null}
                    </div>
                    <p className="font-semibold">{post.title}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
                  </CardContent>
                </button>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="comments" className="space-y-3">
            {myComments.map((comment) => (
              <Card key={comment.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                <button
                  type="button"
                  className="w-full cursor-pointer text-left"
                  onClick={() => moveToPost(comment.postId)}
                >
                  <CardContent className="space-y-2 py-5">
                    <p className="font-semibold">
                      {getPostById(comment.postId)?.title ?? comment.postId}
                    </p>
                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                    {comment.visibilityLevel ? (
                      <Badge variant="secondary">{comment.visibilityLevel}</Badge>
                    ) : null}
                    {comment.accepted ? <Badge variant="success">채택됨</Badge> : null}
                  </CardContent>
                </button>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="reviews" className="space-y-3">
            {myReviews.map((review) => (
              <Card key={review.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                <button
                  type="button"
                  className="w-full cursor-pointer text-left"
                  onClick={() => moveToLectureReview(review.lectureId)}
                >
                  <CardContent className="space-y-2 py-5">
                    <p className="font-semibold">{getLectureTitle(review.lectureId)}</p>
                    <p className="text-sm text-muted-foreground">{review.shortComment}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">꿀강 {review.honeyScore}/5</Badge>
                      <Badge variant="outline">{review.semester}</Badge>
                      {review.visibilityLevel ? (
                        <Badge variant="secondary">{review.visibilityLevel}</Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </button>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="trade" className="space-y-3">
            {myTradePosts.map((post) => (
              <Card key={post.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                <button
                  type="button"
                  className="w-full cursor-pointer text-left"
                  onClick={() => moveToTradePost(post.id)}
                >
                  <CardContent className="space-y-2 py-5">
                    <p className="font-semibold">
                      {getLectureTitle(post.haveLectureId)} ↔ {getLectureTitle(post.wantLectureId)}
                    </p>
                    <p className="text-sm text-muted-foreground">{post.note}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{post.status}</Badge>
                      <Badge variant="outline">{post.timeRange}</Badge>
                      {post.visibilityLevel ? (
                        <Badge variant="secondary">{post.visibilityLevel}</Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </button>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </section>

      <section className="space-y-3">
        <SectionHeader title="차단 관리" />
        <Card>
          <CardContent className="space-y-3 py-5">
            {blockedUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">차단한 사용자가 없습니다.</p>
            ) : (
              blockedUsers.map((block) => (
                <div key={block.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-secondary p-3">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">
                      {getPublicIdentitySummary(block.blockedUserId).label}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    해제
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
