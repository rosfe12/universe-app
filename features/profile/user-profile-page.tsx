"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { blockUser, getUserProfile, reportProfile, unblockUser } from "@/app/actions/profile-actions";
import { AppShell } from "@/components/layout/app-shell";
import { AccountRequiredCard } from "@/components/shared/account-required-card";
import { ActionFeedbackBanner } from "@/components/shared/action-feedback-banner";
import { LoadingState } from "@/components/shared/loading-state";
import { ProfileImage } from "@/components/shared/profile-image";
import { ProfileImageViewerDialog } from "@/components/shared/profile-image-viewer-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COMMUNITY_PROFILE_RESTRICTION_MESSAGE, canUseCommunityProfileFeature } from "@/lib/community-profile";
import { hasCompletedOnboarding } from "@/lib/supabase/app-data";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { CommunityProfileSection } from "@/features/profile/community-profile-section";
import type { AppRuntimeSnapshot, CommunityProfile } from "@/types";

export function UserProfilePage({
  userId,
  initialSnapshot,
  initialProfile,
  initialProfileError,
}: {
  userId: string;
  initialSnapshot?: AppRuntimeSnapshot;
  initialProfile?: CommunityProfile;
  initialProfileError?: string;
}) {
  const router = useRouter();
  const { currentUser, isAuthenticated, loading } = useAppRuntime(initialSnapshot, "chrome");
  const [profile, setProfile] = useState<CommunityProfile | null>(initialProfile ?? null);
  const [profileLoading, setProfileLoading] = useState(!initialProfile && !initialProfileError);
  const [error, setError] = useState<string | null>(initialProfileError ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetail, setReportDetail] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [pending, startTransition] = useTransition();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const viewableImages =
    profile?.images
      .filter((image) => Boolean(image.imageUrl))
      .map((image) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        alt: `${profile.displayName} 프로필 사진 ${image.imageOrder}`,
      })) ?? [];

  function openImageViewer(imageId: string) {
    const nextIndex = viewableImages.findIndex((image) => image.id === imageId);
    if (nextIndex < 0) return;
    setViewerIndex(nextIndex);
  }

  function handleBack() {
    if (typeof window === "undefined") {
      router.push("/home");
      return;
    }

    const canGoBack =
      window.history.length > 1 &&
      typeof document.referrer === "string" &&
      document.referrer.startsWith(window.location.origin);

    if (canGoBack) {
      router.back();
      return;
    }

    router.push("/home");
  }

  useEffect(() => {
    if (!isAuthenticated || loading || !canUseCommunityProfileFeature(currentUser)) {
      return;
    }

    if (initialProfile?.userId === userId || initialProfileError) {
      setProfileLoading(false);
      return;
    }

    let active = true;
    setError(null);
    setNotice(null);
    setProfileLoading(true);

    void getUserProfile(userId)
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setError(result.error);
          setProfile(null);
          setProfileLoading(false);
          return;
        }
        setProfile(result.profile);
        setProfileLoading(false);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : COMMUNITY_PROFILE_RESTRICTION_MESSAGE);
        setProfile(null);
        setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    currentUser?.email,
    currentUser?.id,
    currentUser?.verificationState,
    initialProfile?.userId,
    initialProfileError,
    isAuthenticated,
    loading,
    userId,
  ]);

  if (loading) {
    return (
      <AppShell
        title="프로필"
        showTopNavActions={false}
        topAction={
          <Button type="button" size="sm" variant="outline" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4" />
            돌아가기
          </Button>
        }
      >
        <LoadingState />
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppShell title="프로필" showTopNavActions={false}>
        <AccountRequiredCard
          isAuthenticated={false}
          nextPath={`/profile/${userId}`}
          title="로그인 후 프로필을 볼 수 있습니다"
          description="학생 인증을 완료하면 공개 범위에 따라 다른 대학생의 프로필을 볼 수 있습니다."
        />
      </AppShell>
    );
  }

  if (!hasCompletedOnboarding(currentUser) || !canUseCommunityProfileFeature(currentUser)) {
    return (
      <AppShell title="프로필" showTopNavActions={false}>
        <Card className="border-dashed border-white/10 bg-white/[0.03]">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">학생 인증이 필요합니다</p>
              <p className="text-sm text-muted-foreground">{COMMUNITY_PROFILE_RESTRICTION_MESSAGE}</p>
            </div>
            <Button asChild>
              <Link href="/onboarding?next=/profile&mode=verification">학생 인증 진행</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="프로필"
      showTopNavActions={false}
      topAction={
        <Button type="button" size="sm" variant="outline" onClick={handleBack}>
          <ChevronLeft className="h-4 w-4" />
          돌아가기
        </Button>
      }
    >
      {notice ? (
        <ActionFeedbackBanner
          title="프로필 상태가 업데이트되었습니다"
          message={notice}
          onClose={() => setNotice(null)}
        />
      ) : null}
      {profile ? (
        profile.isOwner ? (
          <CommunityProfileSection
            currentUser={currentUser}
            initialProfile={profile}
            onProfileChange={setProfile}
          />
        ) : (
          <>
            <Card className="app-section-surface overflow-hidden rounded-[28px] border-white/10 shadow-none">
              <CardContent className="space-y-4 p-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                      {profile.displayName}
                    </p>
                    {profile.schoolName ? <Badge variant="secondary">{profile.schoolName}</Badge> : null}
                    {profile.department ? <Badge variant="outline">{profile.department}</Badge> : null}
                    {profile.admissionYear ? <Badge variant="outline">{profile.admissionYear}학번</Badge> : null}
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {profile.bio || "등록된 한줄 소개가 없습니다."}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {profile.images.length > 0 ? (
                    profile.images.map((image) => (
                      <div
                        key={image.id}
                        className="app-muted-surface overflow-hidden rounded-[20px] border border-white/10"
                      >
                        <div className="aspect-[0.92] w-full">
                          {image.imageUrl ? (
                            <button
                              type="button"
                              className="block h-full w-full"
                              onClick={() => openImageViewer(image.id)}
                            >
                              <ProfileImage
                                src={image.imageUrl}
                                alt={`${profile.displayName} 프로필 사진 ${image.imageOrder}`}
                                width={480}
                                height={520}
                                className="h-full w-full object-cover"
                                fallback={
                                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                    이미지 준비 중
                                  </div>
                                }
                              />
                            </button>
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                              이미지 준비 중
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 rounded-[20px] border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground">
                      공개된 프로필 사진이 없습니다.
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {profile.interests.length > 0 ? (
                    profile.interests.map((interest) => (
                      <Badge key={interest} variant="secondary" className="rounded-full px-3 py-1">
                        {interest}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">등록된 관심사가 없습니다.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setReportOpen(true)}>
                    신고
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending || blocked}
                    onClick={() => {
                      if (
                        typeof window !== "undefined" &&
                        !window.confirm("이 사용자를 차단하면 서로 프로필을 볼 수 없습니다. 계속할까요?")
                      ) {
                        return;
                      }

                      startTransition(() => {
                        void (async () => {
                          try {
                            await blockUser(userId);
                            setBlocked(true);
                            setNotice("사용자를 차단했습니다.");
                          } catch (cause) {
                            setError(cause instanceof Error ? cause.message : "차단하지 못했습니다.");
                          }
                        })();
                      });
                    }}
                  >
                    차단
                  </Button>
                  {blocked ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        startTransition(() => {
                          void (async () => {
                            try {
                              await unblockUser(userId);
                              setBlocked(false);
                              setError(null);
                              setNotice("차단을 해제했습니다.");
                            } catch (cause) {
                              setError(cause instanceof Error ? cause.message : "차단을 해제하지 못했습니다.");
                            }
                          })();
                        });
                      }}
                    >
                      차단 해제
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {error ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>프로필 신고</DialogTitle>
                <DialogDescription>신고 사유를 적으면 운영 검토가 진행됩니다.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-report-reason">신고 사유</Label>
                  <Input
                    id="profile-report-reason"
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                    placeholder="예: 얼굴 사진 업로드, 연락처 노출"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-report-detail">상세 내용</Label>
                  <Textarea
                    id="profile-report-detail"
                    rows={4}
                    value={reportDetail}
                    onChange={(event) => setReportDetail(event.target.value)}
                    placeholder="운영자가 확인할 수 있게 간단히 적어주세요."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setReportOpen(false)}>
                  닫기
                </Button>
                <Button
                  type="button"
                  disabled={pending || reportReason.trim().length < 1}
                  onClick={() => {
                    startTransition(() => {
                      void (async () => {
                        try {
                          await reportProfile(userId, reportReason, reportDetail);
                          setReportOpen(false);
                          setReportReason("");
                          setReportDetail("");
                          setError(null);
                          setNotice("프로필 신고가 접수되었습니다.");
                        } catch (cause) {
                          setError(cause instanceof Error ? cause.message : "신고를 처리하지 못했습니다.");
                        }
                      })();
                    });
                  }}
                >
                  신고 접수
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
            <ProfileImageViewerDialog
              open={viewerIndex !== null}
              images={viewableImages}
              initialIndex={viewerIndex ?? 0}
              onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                  setViewerIndex(null);
                }
              }}
            />
          </>
        )
      ) : error ? (
        <Card className="border-dashed border-white/10 bg-white/[0.03]">
          <CardContent className="py-8 text-center">
            <p className="font-medium">{error}</p>
          </CardContent>
        </Card>
      ) : (
        profileLoading ? <LoadingState /> : null
      )}
    </AppShell>
  );
}
