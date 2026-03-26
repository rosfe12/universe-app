"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Pencil, Trash2 } from "lucide-react";

import {
  deleteProfileImage,
  getMyProfile,
  reorderProfileImages,
  setPrimaryProfileImage,
  updateMyProfile,
  uploadProfileImage,
} from "@/app/actions/profile-actions";
import { ActionFeedbackBanner } from "@/components/shared/action-feedback-banner";
import { ProfileImageEditorDialog } from "@/components/shared/profile-image-editor-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  COMMUNITY_PROFILE_RESTRICTION_MESSAGE,
  canUseCommunityProfileFeature,
  parseInterestTokens,
  validateCommunityProfileImageFile,
} from "@/lib/community-profile";
import { validateImageBeforeUpload } from "@/lib/profile-image-processing";
import type { FaceBox } from "@/lib/profile-image-processing";
import type { CommunityProfile, ProfileVisibility, User } from "@/types";

type CommunityProfileFormState = {
  displayName: string;
  bio: string;
  interestsInput: string;
  profileVisibility: ProfileVisibility;
  showDepartment: boolean;
  showAdmissionYear: boolean;
};

export function CommunityProfileSection({ currentUser }: { currentUser: User }) {
  const profileEnabled = canUseCommunityProfileFeature(currentUser);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [loading, setLoading] = useState(profileEnabled);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [uploadingOrder, setUploadingOrder] = useState<number | null>(null);
  const [formState, setFormState] = useState<CommunityProfileFormState>({
    displayName: "",
    bio: "",
    interestsInput: "",
    profileVisibility: "university_only",
    showDepartment: false,
    showAdmissionYear: false,
  });
  const [isPending, startTransition] = useTransition();
  const [editorState, setEditorState] = useState<{
    imageOrder: number;
    file: File;
    faceBoxes: FaceBox[];
    sensitiveTextDetected: boolean;
    qrDetected: boolean;
  } | null>(null);

  const orderedImages = useMemo(
    () => [...(profile?.images ?? [])].sort((a, b) => a.imageOrder - b.imageOrder),
    [profile],
  );

  useEffect(() => {
    if (!profileEnabled) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setNotice(null);

    void getMyProfile()
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setFormState({
          displayName: result.displayName,
          bio: result.bio ?? "",
          interestsInput: result.interests.join(", "),
          profileVisibility: result.profileVisibility,
          showDepartment: result.showDepartment,
          showAdmissionYear: result.showAdmissionYear,
        });
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : COMMUNITY_PROFILE_RESTRICTION_MESSAGE);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profileEnabled, currentUser.id]);

  const imageByOrder = useMemo(() => {
    const map = new Map<number, CommunityProfile["images"][number]>();
    for (const image of orderedImages) {
      map.set(image.imageOrder, image);
    }
    return map;
  }, [orderedImages]);

  function openEditor() {
    if (!profile) return;
    setError(null);
    setFormState({
      displayName: profile.displayName,
      bio: profile.bio ?? "",
      interestsInput: profile.interests.join(", "),
      profileVisibility: profile.profileVisibility,
      showDepartment: profile.showDepartment,
      showAdmissionYear: profile.showAdmissionYear,
    });
    setOpen(true);
  }

  async function handleSave() {
    startTransition(() => {
      void (async () => {
        try {
          const nextProfile = await updateMyProfile({
            displayName: formState.displayName,
            bio: formState.bio,
            interests: parseInterestTokens(formState.interestsInput),
            profileVisibility: formState.profileVisibility,
            showDepartment: formState.showDepartment,
            showAdmissionYear: formState.showAdmissionYear,
          });
          setProfile(nextProfile);
          setError(null);
          setNotice("프로필을 저장했습니다.");
          setOpen(false);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "프로필을 저장하지 못했습니다.");
        }
      })();
    });
  }

  async function uploadSelectedImage(
    order: number,
    file: File,
    flags?: { sensitiveTextDetected: boolean; qrDetected: boolean },
  ) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("imageOrder", String(order));
    if (flags?.sensitiveTextDetected) {
      formData.set("sensitiveDetected", "true");
    }
    if (flags?.qrDetected) {
      formData.set("qrDetected", "true");
    }
    setUploadingOrder(order);
    setError(null);
    setNotice(null);

    try {
      const nextImage = await uploadProfileImage(formData);
      setProfile((current) => {
        if (!current) return current;
        const nextImages = current.images
          .filter((image) => image.imageOrder !== order)
          .concat(nextImage)
          .sort((a, b) => a.imageOrder - b.imageOrder);
        return {
          ...current,
          images: nextImages,
        };
      });
      setNotice(`사진 ${order}번을 업로드했습니다.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "프로필 사진을 업로드하지 못했습니다.");
      throw cause;
    } finally {
      setUploadingOrder(null);
    }
  }

  async function handleImageUpload(order: number, file?: File | null) {
    if (!file) return;

    try {
      validateCommunityProfileImageFile(file);
      const analysis = await validateImageBeforeUpload(file);
      if (analysis.faceBoxes.length > 0 || analysis.sensitiveTextDetected || analysis.qrDetected) {
        setEditorState({
          imageOrder: order,
          file,
          faceBoxes: analysis.faceBoxes,
          sensitiveTextDetected: analysis.sensitiveTextDetected,
          qrDetected: analysis.qrDetected,
        });
        return;
      }

      await uploadSelectedImage(order, file);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "프로필 사진을 업로드하지 못했습니다.");
    }
  }

  async function handleImageDelete(imageId: string) {
    startTransition(() => {
      void (async () => {
        try {
          await deleteProfileImage(imageId);
          setProfile((current) =>
            current
              ? {
                  ...current,
                  images: current.images.filter((image) => image.id !== imageId),
                }
              : current,
          );
          setNotice("프로필 사진을 삭제했습니다.");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "프로필 사진을 삭제하지 못했습니다.");
        }
      })();
    });
  }

  async function handleMoveImage(imageId: string, direction: -1 | 1) {
    if (!profile) return;
    const currentIndex = orderedImages.findIndex((item) => item.id === imageId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedImages.length) {
      return;
    }

    const nextOrder = [...orderedImages];
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];

    startTransition(() => {
      void (async () => {
        try {
          const nextProfile = await reorderProfileImages(nextOrder.map((item) => item.id));
          setProfile(nextProfile);
          setNotice("프로필 사진 순서를 정리했습니다.");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "프로필 사진 순서를 바꾸지 못했습니다.");
        }
      })();
    });
  }

  async function handleSetPrimaryImage(imageId: string) {
    startTransition(() => {
      void (async () => {
        try {
          const nextProfile = await setPrimaryProfileImage(imageId);
          setProfile(nextProfile);
          setError(null);
          setNotice("대표 사진을 설정했습니다.");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "대표 사진을 설정하지 못했습니다.");
        }
      })();
    });
  }

  if (!profileEnabled) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">내 홈</p>
            <p className="text-sm text-muted-foreground">{COMMUNITY_PROFILE_RESTRICTION_MESSAGE}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {notice ? (
        <ActionFeedbackBanner
          title="프로필이 업데이트되었습니다"
          message={notice}
          onClose={() => setNotice(null)}
        />
      ) : null}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">내 홈</p>
            <p className="text-sm text-muted-foreground">
              공개 범위에 따라 전체 대학생 또는 같은 학교 학생에게 보입니다.
            </p>
          </div>
        <Button type="button" size="sm" variant="outline" onClick={openEditor} disabled={!profile || loading}>
          <Pencil className="h-4 w-4" />
          수정
        </Button>
      </div>

      <Card className="app-section-surface overflow-hidden rounded-[28px] border-white/10 shadow-none">
        <CardContent className="space-y-4 p-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-6 w-32 animate-pulse rounded-full bg-white/10" />
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="aspect-[0.92] animate-pulse rounded-[20px] bg-white/10" />
                ))}
              </div>
            </div>
          ) : profile ? (
            <>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xl font-semibold tracking-[-0.03em] text-foreground">
                    {profile.displayName}
                  </p>
                  {profile.schoolName ? <Badge variant="secondary">{profile.schoolName}</Badge> : null}
                  <Badge variant="outline">
                    {profile.profileVisibility === "university_only" ? "전체 대학생 공개" : "같은 학교만 공개"}
                  </Badge>
                  {profile.department ? <Badge variant="outline">{profile.department}</Badge> : null}
                  {profile.admissionYear ? <Badge variant="outline">{profile.admissionYear}학번</Badge> : null}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {profile.bio || "한줄 소개를 추가해보세요."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }, (_, index) => {
                  const image = imageByOrder.get(index + 1);
                  return (
                    <div
                      key={index}
                      className="app-muted-surface overflow-hidden rounded-[20px] border border-white/10"
                    >
                      <div className="aspect-[0.92] w-full">
                        {image?.imageUrl ? (
                          <Image
                            src={image.imageUrl}
                            alt={`프로필 사진 ${index + 1}`}
                            width={480}
                            height={520}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            사진 {index + 1}
                          </div>
                        )}
                      </div>
                      {image ? (
                        <div className="border-t border-white/10 px-3 py-2 text-[11px] text-muted-foreground">
                          {image.moderationStatus === "approved"
                            ? "공개 중"
                            : image.moderationStatus === "pending"
                              ? "검토 중"
                              : "차단됨"}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                {profile.interests.length > 0 ? (
                  profile.interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="rounded-full px-3 py-1">
                      {interest}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">관심사를 추가하면 프로필 분위기를 더 잘 보여줄 수 있어요.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">프로필을 불러오지 못했습니다.</p>
          )}

          {error ? <p className="text-sm text-rose-500">{error}</p> : null}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100vh-3rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>내 홈 수정</DialogTitle>
              <DialogDescription>
              얼굴 사진 없이, 학생 인증 사용자에게 보여줄 기본 정보만 정리합니다.
              </DialogDescription>
            </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="community-profile-display-name">닉네임</Label>
              <Input
                id="community-profile-display-name"
                value={formState.displayName}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                maxLength={24}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="community-profile-bio">한줄 소개</Label>
              <Textarea
                id="community-profile-bio"
                rows={3}
                maxLength={160}
                value={formState.bio}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    bio: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="community-profile-interests">관심사</Label>
              <Input
                id="community-profile-interests"
                value={formState.interestsInput}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    interestsInput: event.target.value,
                  }))
                }
                placeholder="예: 영화, 헬스, 전시, 축구"
              />
              <p className="text-xs text-muted-foreground">쉼표로 구분해서 최대 10개까지 입력할 수 있습니다.</p>
            </div>

            <div className="space-y-3">
              <Label>프로필 공개 범위</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className={`rounded-[20px] border px-4 py-3 text-left ${
                    formState.profileVisibility === "university_only"
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                  onClick={() =>
                    setFormState((current) => ({
                      ...current,
                      profileVisibility: "university_only",
                    }))
                  }
                >
                  <p className="font-medium">전체 대학생에게 공개</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    다른 학교 학생도 내 프로필을 볼 수 있어요
                  </p>
                </button>
                <button
                  type="button"
                  className={`rounded-[20px] border px-4 py-3 text-left ${
                    formState.profileVisibility === "same_school_only"
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                  onClick={() =>
                    setFormState((current) => ({
                      ...current,
                      profileVisibility: "same_school_only",
                    }))
                  }
                >
                  <p className="font-medium">같은 학교만 공개</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    같은 학교 학생에게만 내 프로필이 보여요
                  </p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-[20px] border px-4 py-3 text-left ${
                  formState.showDepartment ? "border-primary bg-primary/10" : "border-white/10 bg-white/[0.02]"
                }`}
                onClick={() =>
                  setFormState((current) => ({
                    ...current,
                    showDepartment: !current.showDepartment,
                  }))
                }
              >
                <p className="font-medium">학과 공개</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formState.showDepartment ? "프로필을 볼 수 있는 학생에게 보여집니다." : "기본 비공개"}
                </p>
              </button>
              <button
                type="button"
                className={`rounded-[20px] border px-4 py-3 text-left ${
                  formState.showAdmissionYear ? "border-primary bg-primary/10" : "border-white/10 bg-white/[0.02]"
                }`}
                onClick={() =>
                  setFormState((current) => ({
                    ...current,
                    showAdmissionYear: !current.showAdmissionYear,
                  }))
                }
              >
                <p className="font-medium">입학년도 공개</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formState.showAdmissionYear ? "프로필을 볼 수 있는 학생에게 보여집니다." : "기본 비공개"}
                </p>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-medium">프로필 사진</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  얼굴 사진 금지 · 연락처/SNS/QR/학생증 등 개인정보 포함 사진 금지
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => {
                  const order = index + 1;
                  const image = imageByOrder.get(order);
                  return (
                    <div key={order} className="space-y-2 rounded-[20px] border border-white/10 p-3">
                      <div className="app-muted-surface flex aspect-[0.92] items-center justify-center overflow-hidden rounded-[16px]">
                        {image?.imageUrl ? (
                          <Image
                            src={image.imageUrl}
                            alt={`프로필 사진 ${order}`}
                            width={480}
                            height={520}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
                            <ImagePlus className="h-4 w-4" />
                            <span>사진 {order}</span>
                          </div>
                        )}
                      </div>

                      {image ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={image.moderationStatus === "approved" ? "secondary" : "outline"}>
                              {image.moderationStatus === "approved"
                                ? "승인됨"
                                : image.moderationStatus === "pending"
                                  ? "검토 중"
                                  : "차단됨"}
                            </Badge>
                            {image.isPrimary ? <Badge variant="success">대표 사진</Badge> : null}
                            {image.moderationReason ? (
                              <span className="text-[11px] text-muted-foreground">
                                {image.moderationReason}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              disabled={isPending || orderedImages[0]?.id === image.id}
                              onClick={() => void handleMoveImage(image.id, -1)}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              disabled={isPending || orderedImages[orderedImages.length - 1]?.id === image.id}
                              onClick={() => void handleMoveImage(image.id, 1)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant={image.isPrimary ? "secondary" : "outline"}
                              size="sm"
                              className="h-9 px-3 text-xs"
                              disabled={isPending || image.moderationStatus !== "approved" || image.isPrimary}
                              onClick={() => void handleSetPrimaryImage(image.id)}
                            >
                              {image.isPrimary ? "대표 사진" : "대표로 설정"}
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={isPending}
                              onClick={() => void handleImageDelete(image.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingOrder === order || isPending}
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] ?? null;
                          void handleImageUpload(order, nextFile);
                          event.currentTarget.value = "";
                        }}
                      />
                      {uploadingOrder === order ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          업로드 중
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              닫기
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={isPending || formState.displayName.trim().length < 2}
            >
              {isPending ? "저장 중" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProfileImageEditorDialog
        open={Boolean(editorState)}
        file={editorState?.file ?? null}
        imageOrder={editorState?.imageOrder ?? null}
        faceBoxes={editorState?.faceBoxes ?? []}
        sensitiveTextDetected={Boolean(editorState?.sensitiveTextDetected)}
        qrDetected={Boolean(editorState?.qrDetected)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditorState(null);
          }
        }}
        onReset={() => {
          setEditorState(null);
        }}
        onConfirm={async (file, flags) => {
          if (!editorState) return;
          await uploadSelectedImage(editorState.imageOrder, file, flags);
          setEditorState(null);
        }}
      />
    </section>
  );
}
