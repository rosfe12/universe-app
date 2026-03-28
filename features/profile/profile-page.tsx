"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  BellRing,
  ChevronRight,
  GraduationCap,
  Shield,
  UserPlus2,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { AccountRequiredCard } from "@/components/shared/account-required-card";
import { AppSettingsSection } from "@/components/shared/app-settings-section";
import { EmptyState } from "@/components/shared/empty-state";
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
import { deleteCurrentAccount } from "@/app/actions/content-actions";
import {
  getMyBlockedProfiles,
  unblockUser,
} from "@/app/actions/profile-actions";
import {
  COMMUNITY_CATEGORY_LABELS,
  STANDARD_VISIBILITY_LEVELS,
  TRADE_STATUS_LABELS,
  VISIBILITY_LEVEL_LABELS,
} from "@/lib/constants";
import {
  getAnonymousHandle,
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
  getCurrentStudentVerification,
  hasCompletedOnboarding,
  invalidateClientRuntimeSnapshots,
  resetClientAuthRuntime,
  signOutFromSupabase,
  upsertUserProfile,
} from "@/lib/supabase/app-data";
import { isMasterAdminEmail } from "@/lib/admin/master-admin-shared";
import { canUseCommunityProfileFeature } from "@/lib/community-profile";
import {
  getStandardVisibilityLevel,
  getStudentVerificationBadge,
  getSchoolShortName,
} from "@/lib/user-identity";
import type { AppRuntimeSnapshot, BlockedProfileSummary } from "@/types";

const POST_CATEGORY_LABELS = {
  community: "커뮤니티",
  admission: "입시",
  dating: "연애",
} as const;

function getPostCategoryLabel(category: keyof typeof POST_CATEGORY_LABELS | string) {
  return POST_CATEGORY_LABELS[category as keyof typeof POST_CATEGORY_LABELS] ?? category;
}

function getSubcategoryLabel(subcategory?: string) {
  if (!subcategory) {
    return null;
  }

  return COMMUNITY_CATEGORY_LABELS[subcategory as keyof typeof COMMUNITY_CATEGORY_LABELS] ?? subcategory;
}

function getVisibilityLabel(visibilityLevel?: string) {
  if (!visibilityLevel) {
    return null;
  }

  return VISIBILITY_LEVEL_LABELS[visibilityLevel as keyof typeof VISIBILITY_LEVEL_LABELS] ?? visibilityLevel;
}

function getTradeStatusLabel(status: keyof typeof TRADE_STATUS_LABELS | string) {
  return TRADE_STATUS_LABELS[status as keyof typeof TRADE_STATUS_LABELS] ?? status;
}

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
  const verificationReview = searchParams.get("verification") === "manual_review";
  const verificationRejected = searchParams.get("verification") === "rejected";
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
  const [blockedUsers, setBlockedUsers] = useState<BlockedProfileSummary[]>([]);
  const [blockedUsersLoading, setBlockedUsersLoading] = useState(false);
  const [blockedUserActionId, setBlockedUserActionId] = useState<string | null>(null);
  const [blockedUsersError, setBlockedUsersError] = useState<string | null>(null);
  const [accountActionError, setAccountActionError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || canAccessAdmin || currentUser.userType !== "student") {
      return;
    }

    const needsVerificationSync =
      schoolVerified ||
      verificationPending ||
      verificationReview ||
      verificationRejected ||
      currentUser.studentVerificationStatus === "pending" ||
      currentUser.verificationState === "manual_review" ||
      currentUser.verificationState === "rejected";

    if (!needsVerificationSync) {
      return;
    }

    let active = true;

    void getCurrentStudentVerification().then((result) => {
      if (!active || result.error || !result.data) {
        return;
      }

      const verification = result.data;
      const nextState = verification.verificationState ?? currentUser.verificationState;
      const nextStatus =
        nextState === "student_verified"
          ? "verified"
          : nextState === "rejected"
            ? "rejected"
            : verification.schoolEmail
              ? "pending"
              : currentUser.studentVerificationStatus;

      setSnapshot((snapshot) => {
        if (snapshot.currentUser.id !== currentUser.id) {
          return snapshot;
        }

        const nextUser = {
          ...snapshot.currentUser,
          schoolEmail: verification.schoolEmail ?? snapshot.currentUser.schoolEmail,
          studentNumber: verification.studentNumber ?? snapshot.currentUser.studentNumber,
          department: verification.departmentName ?? snapshot.currentUser.department,
          admissionYear: verification.admissionYear ?? snapshot.currentUser.admissionYear,
          schoolEmailVerifiedAt:
            verification.emailVerifiedAt ?? snapshot.currentUser.schoolEmailVerifiedAt,
          verificationState: nextState,
          verificationScore: verification.score,
          verificationRequestedAt: verification.requestedAt,
          verificationReviewedAt:
            verification.reviewedAt ?? snapshot.currentUser.verificationReviewedAt,
          verificationRejectionReason:
            verification.rejectionReason ?? snapshot.currentUser.verificationRejectionReason,
          studentVerificationStatus: nextStatus,
          verified: nextState === "student_verified",
        };

        if (JSON.stringify(nextUser) === JSON.stringify(snapshot.currentUser)) {
          return snapshot;
        }

        return {
          ...snapshot,
          currentUser: nextUser,
        };
      });
    });

    return () => {
      active = false;
    };
  }, [
    canAccessAdmin,
    currentUser.id,
    currentUser.studentVerificationStatus,
    currentUser.userType,
    currentUser.verificationState,
    isAuthenticated,
    schoolVerified,
    setSnapshot,
    verificationPending,
    verificationRejected,
    verificationReview,
  ]);

  useEffect(() => {
    if (loading || !isAuthenticated || !hasCompletedOnboarding(currentUser)) {
      setBlockedUsers([]);
      setBlockedUsersLoading(false);
      setBlockedUsersError(null);
      return;
    }

    if (!canAccessAdmin && !canUseCommunityProfileFeature(currentUser)) {
      setBlockedUsers([]);
      setBlockedUsersLoading(false);
      setBlockedUsersError(null);
      return;
    }

    let active = true;
    setBlockedUsersLoading(true);
    setBlockedUsersError(null);

    void getMyBlockedProfiles()
      .then((items) => {
        if (!active) {
          return;
        }
        setBlockedUsers(items);
        setBlockedUsersLoading(false);
      })
      .catch((cause) => {
        if (!active) {
          return;
        }
        setBlockedUsers([]);
        setBlockedUsersLoading(false);
        setBlockedUsersError(
          cause instanceof Error ? cause.message : "차단 목록을 불러오지 못했습니다.",
        );
      });

    return () => {
      active = false;
    };
  }, [
    canAccessAdmin,
    currentUser.email,
    currentUser.id,
    currentUser.verificationState,
    isAuthenticated,
    loading,
  ]);

  const moveToPost = (postId: string) => {
    router.push(getPostHref(postId));
  };
  const moveToLectureReview = (lectureId: string) => {
    router.push(`/lectures/${lectureId}`);
  };
  const moveToTradePost = (postId: string) => {
    router.push(`/trade?post=${postId}`);
  };
  const showVerifiedBanner = schoolVerified || verificationBadge.status === "verified";
  const showManualReviewBanner =
    verificationReview || currentUser.verificationState === "manual_review";
  const showRejectedBanner =
    verificationRejected || currentUser.verificationState === "rejected";
  const showPendingBanner =
    verificationPending || currentUser.verificationState === "email_verified";
  const verificationActionLabel = showManualReviewBanner
    ? "추가 인증 보기"
    : showRejectedBanner
      ? "학생 인증 다시 진행"
      : showPendingBanner
        ? "인증 진행 상황 보기"
        : "대학생 인증 진행";

  if (loading && source === "mock") {
    return (
      <AppShell title="마이">
        <LoadingState />
      </AppShell>
    );
  }

  if (!loading && !isAuthenticated) {
    return (
      <AppShell title="마이">
        <AccountRequiredCard
          isAuthenticated={false}
          nextPath="/home"
          title="로그인 후 이용할 수 있습니다"
          description="내 활동과 설정은 로그인 후 확인할 수 있습니다."
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
          nextPath="/home"
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
      <section className="space-y-4 border-b border-border pb-5">
        <ProfileCard
          title={getAnonymousHandle(currentUser.id)}
          subtitle={adminAffiliationLabel}
          score={currentUser.trustScore}
          description="익명성과 신뢰를 함께 유지하는 기본 프로필"
        />
        <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">현재 상태</p>
            <UserLevelText score={currentUser.trustScore} className="ml-0 text-sm font-medium" />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{canAccessAdmin ? "운영 권한" : "학교 인증"}</p>
            <p className="text-sm font-medium text-foreground">
              {canAccessAdmin ? adminAffiliationLabel : verificationBadge.shortLabel}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs text-muted-foreground">읽지 않은 알림</p>
            <p className="text-sm font-medium text-foreground">{unreadNotifications.length}건</p>
          </div>
        </div>
        <MyPageLevelSection score={currentUser.trustScore} />
      </section>

      {canAccessAdmin ? (
        <section className="space-y-2 border-b border-border pb-5">
          <p className="text-sm font-semibold text-foreground">관리자 계정</p>
          <p className="text-sm text-muted-foreground">
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
      <section className="space-y-2 border-b border-border pb-5">
          {showVerifiedBanner ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              대학생 인증이 완료되었습니다. 글쓰기와 댓글, 쪽지, 채팅이 바로 열립니다.
            </div>
          ) : showManualReviewBanner ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              학교 메일 확인은 끝났습니다. 추가 인증 자료를 올리면 운영 검토가 이어집니다.
            </div>
          ) : showRejectedBanner ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              학생 인증이 반려되었습니다. 학번, 학과, 입학년도와 추가 인증 자료를 다시 확인해주세요.
            </div>
          ) : showPendingBanner ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              학교 메일 확인이 완료되면 학생 정보 자동 판정이 진행됩니다.
            </div>
          ) : null}
          <p className="text-sm font-semibold text-foreground">대학생 인증 상태</p>
          <p className="text-sm text-muted-foreground">
            {currentUser.schoolEmail
              ? `인증 대상 메일: ${currentUser.schoolEmail}`
              : "학교 메일이 아직 등록되지 않았습니다."}
          </p>
          <p className="text-sm text-muted-foreground">
            {verificationBadge.restrictionMessage}
          </p>
          {currentUser.verificationRejectionReason ? (
            <p className="text-sm text-rose-600">{currentUser.verificationRejectionReason}</p>
          ) : null}
          {verificationBadge.status !== "verified" ? (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => router.push("/onboarding?next=/profile&mode=verification")}
            >
              {verificationActionLabel}
            </Button>
          ) : null}
      </section>
      )}

      <section className="space-y-3">
        <SectionHeader title="내 활동 요약" description="내 활동을 한눈에 확인" />
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
        <SectionHeader title="기본 공개 범위" description="글과 댓글 작성의 기본 공개 범위입니다" />
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
              현재 기본 표시: {adminAffiliationLabel}
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
            {
              icon: UserPlus2,
              title: "친구 초대",
              description: "카카오톡이나 링크로 CAMVERSE를 공유합니다",
              href: "/invite",
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
        {accountActionError ? (
          <p className="text-sm text-rose-600">{accountActionError}</p>
        ) : null}
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            if (source === "supabase" && isAuthenticated) {
              await signOutFromSupabase();
              await refresh();
            }
            if (typeof window !== "undefined") {
              resetClientAuthRuntime();
              window.location.replace("/home");
              return;
            }
            router.replace("/home");
            router.refresh();
          }}
        >
          로그아웃
        </Button>
      </section>

      <section className="space-y-3 pt-1">
        <div className="rounded-2xl border border-border bg-card px-4 py-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">회원 탈퇴</p>
              <p className="text-xs leading-5 text-muted-foreground">
                계정과 활동 기록이 함께 삭제되며 복구할 수 없습니다.
              </p>
            </div>
          <Button
            variant="outline"
            size="sm"
            className="w-auto border-white/10 bg-transparent text-sm font-medium text-muted-foreground hover:border-rose-400/30 hover:bg-rose-400/5 hover:text-rose-300"
            disabled={isDeletingAccount}
            onClick={async () => {
              if (
                typeof window !== "undefined" &&
                !window.confirm(
                  "회원 탈퇴 시 내가 쓴 글, 댓글, 강의평, 매칭 글, 알림, 등급이 모두 삭제되며 복구할 수 없습니다. 탈퇴하시겠습니까?",
                )
              ) {
                return;
              }

              setAccountActionError(null);
              setIsDeletingAccount(true);

              try {
                await deleteCurrentAccount();
                try {
                  await signOutFromSupabase();
                } catch {
                  // noop
                }
                invalidateClientRuntimeSnapshots();
                resetClientAuthRuntime();
                if (typeof window !== "undefined") {
                  window.location.replace("/home");
                  return;
                }
                router.replace("/home");
                router.refresh();
              } catch (error) {
                setAccountActionError(
                  error instanceof Error ? error.message : "회원 탈퇴를 완료하지 못했습니다.",
                );
              } finally {
                setIsDeletingAccount(false);
              }
            }}
          >
            {isDeletingAccount ? "탈퇴 처리 중" : "회원 탈퇴"}
          </Button>
          </div>
        </div>
      </section>

      {profile ? (
        <section className="space-y-3">
          <SectionHeader title="내 연애 프로필" description="연애 탭에서 보여지는 내 소개" />
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
            {myPosts.length > 0 ? myPosts.map((post) => (
              <Card key={post.id} className="transition-colors hover:bg-muted/40">
                <button type="button" className="w-full cursor-pointer text-left" onClick={() => moveToPost(post.id)}>
                  <CardContent className="space-y-2 py-5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getPostCategoryLabel(post.category)}</Badge>
                      {post.subcategory ? (
                        <Badge variant="secondary">{getSubcategoryLabel(post.subcategory)}</Badge>
                      ) : null}
                      {post.visibilityLevel ? (
                        <Badge variant="secondary">{getVisibilityLabel(post.visibilityLevel)}</Badge>
                      ) : null}
                    </div>
                    <p className="font-semibold">{post.title}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
                  </CardContent>
                </button>
              </Card>
            )) : (
              <EmptyState title="작성한 글이 아직 없습니다" description="첫 글을 남기면 여기서 바로 확인할 수 있어요." />
            )}
          </TabsContent>
          <TabsContent value="comments" className="space-y-3">
            {myComments.length > 0 ? myComments.map((comment) => (
              <Card key={comment.id} className="transition-colors hover:bg-muted/40">
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
                      <Badge variant="secondary">{getVisibilityLabel(comment.visibilityLevel)}</Badge>
                    ) : null}
                    {comment.accepted ? <Badge variant="success">채택됨</Badge> : null}
                  </CardContent>
                </button>
              </Card>
            )) : (
              <EmptyState title="작성한 댓글이 아직 없습니다" description="댓글을 남기면 여기서 다시 볼 수 있어요." />
            )}
          </TabsContent>
          <TabsContent value="reviews" className="space-y-3">
            {myReviews.length > 0 ? myReviews.map((review) => (
              <Card key={review.id} className="transition-colors hover:bg-muted/40">
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
                        <Badge variant="secondary">{getVisibilityLabel(review.visibilityLevel)}</Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </button>
              </Card>
            )) : (
              <EmptyState title="작성한 강의평이 아직 없습니다" description="강의평을 남기면 여기서 모아볼 수 있어요." />
            )}
          </TabsContent>
          <TabsContent value="trade" className="space-y-3">
            {myTradePosts.length > 0 ? myTradePosts.map((post) => (
              <Card key={post.id} className="transition-colors hover:bg-muted/40">
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
                      <Badge variant="secondary">{getTradeStatusLabel(post.status)}</Badge>
                      <Badge variant="outline">{post.timeRange}</Badge>
                      {post.visibilityLevel ? (
                        <Badge variant="secondary">{getVisibilityLabel(post.visibilityLevel)}</Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </button>
              </Card>
            )) : (
              <EmptyState title="등록한 매칭 글이 아직 없습니다" description="수강신청 교환 글을 올리면 여기서 확인할 수 있어요." />
            )}
          </TabsContent>
        </Tabs>
      </section>

      <section className="space-y-3">
        <SectionHeader title="차단 관리" />
        <Card>
          <CardContent className="space-y-3 py-5">
            {blockedUsersError ? (
              <p className="text-sm text-rose-600">{blockedUsersError}</p>
            ) : blockedUsersLoading ? (
              <LoadingState />
            ) : !canAccessAdmin && !canUseCommunityProfileFeature(currentUser) ? (
              <p className="text-sm text-muted-foreground">
                학생 인증 완료 후 차단 관리를 사용할 수 있습니다.
              </p>
            ) : blockedUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">차단한 사용자가 없습니다.</p>
            ) : (
              blockedUsers.map((block) => (
                <div key={block.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-secondary p-3">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{block.displayName}</p>
                      {block.schoolName ? (
                        <p className="text-xs text-muted-foreground">{block.schoolName}</p>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={blockedUserActionId === block.blockedUserId}
                    onClick={() => {
                      if (
                        typeof window !== "undefined" &&
                        !window.confirm("이 사용자의 차단을 해제할까요?")
                      ) {
                        return;
                      }

                      setBlockedUsersError(null);
                      setBlockedUserActionId(block.blockedUserId);

                      void unblockUser(block.blockedUserId)
                        .then(() => {
                          setBlockedUsers((current) =>
                            current.filter((item) => item.blockedUserId !== block.blockedUserId),
                          );
                        })
                        .catch((cause) => {
                          setBlockedUsersError(
                            cause instanceof Error
                              ? cause.message
                              : "차단을 해제하지 못했습니다.",
                          );
                        })
                        .finally(() => {
                          setBlockedUserActionId((current) =>
                            current === block.blockedUserId ? null : current,
                          );
                        });
                    }}
                  >
                    {blockedUserActionId === block.blockedUserId ? "해제 중" : "해제"}
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
