"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Camera, Check, ChevronLeft, ChevronRight, ImagePlus, Loader2, Pencil, Trash2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";

import {
  getMyProfile,
  saveCommunityProfileDraft,
  updateMyProfile,
} from "@/app/actions/profile-actions";
import { ActionFeedbackBanner } from "@/components/shared/action-feedback-banner";
import { ProfileImage } from "@/components/shared/profile-image";
import { ProfileImageEditorDialog } from "@/components/shared/profile-image-editor-dialog";
import { ProfileImageViewerDialog } from "@/components/shared/profile-image-viewer-dialog";
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
import {
  COMMUNITY_PROFILE_RESTRICTION_MESSAGE,
  canUseCommunityProfileFeature,
  parseInterestTokens,
  validateCommunityProfileImageFile,
} from "@/lib/community-profile";
import { captureImageFromNativeCamera } from "@/lib/native-camera";
import { prepareProfileImageForUpload, validateImageBeforeUpload } from "@/lib/profile-image-processing";
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

type DraftProfileImage = CommunityProfile["images"][number] & {
  localFile?: File | null;
  localPreviewUrl?: string;
  wasProcessed?: boolean;
};

function cloneDraftImages(images: CommunityProfile["images"]) {
  return images.map((image) => ({ ...image })) as DraftProfileImage[];
}

function withSinglePrimary(images: DraftProfileImage[]) {
  const approvedImages = images.filter((image) => image.moderationStatus === "approved");
  const activePrimaryId =
    approvedImages.find((image) => image.isPrimary)?.id ?? approvedImages[0]?.id;

  return images.map((image) => ({
    ...image,
    isPrimary: Boolean(activePrimaryId) && image.id === activePrimaryId,
  }));
}

function buildImageDraftSignature(images: DraftProfileImage[]) {
  return [...images]
    .sort((a, b) => a.imageOrder - b.imageOrder)
    .map((image) => ({
      id: image.id,
      imageOrder: image.imageOrder,
      isPrimary: image.isPrimary,
      moderationStatus: image.moderationStatus,
      localFile: Boolean(image.localFile),
      wasProcessed: Boolean(image.wasProcessed),
    }));
}

function buildProfileFormState(profile: CommunityProfile): CommunityProfileFormState {
  return {
    displayName: profile.displayName,
    bio: profile.bio ?? "",
    interestsInput: profile.interests.join(", "),
    profileVisibility: profile.profileVisibility,
    showDepartment: profile.showDepartment,
    showAdmissionYear: profile.showAdmissionYear,
  };
}

export function CommunityProfileSection({
  currentUser,
  initialProfile,
  onProfileChange,
}: {
  currentUser: User;
  initialProfile?: CommunityProfile | null;
  onProfileChange?: (profile: CommunityProfile) => void;
}) {
  const profileEnabled = canUseCommunityProfileFeature(currentUser);
  const [profile, setProfile] = useState<CommunityProfile | null>(initialProfile ?? null);
  const [loading, setLoading] = useState(profileEnabled && !initialProfile);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState(initialProfile?.displayName ?? "");
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
    processedFile: File | null;
  } | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [draftImages, setDraftImages] = useState<DraftProfileImage[]>([]);
  const [activeImageOrder, setActiveImageOrder] = useState<1 | 2 | 3>(1);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const skipDiscardConfirmRef = useRef(false);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const supportsNativeCamera = Capacitor.isNativePlatform();
  const isSaving = Boolean(saveStatus);

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

    if (initialProfile) {
      setProfile(initialProfile);
      setDisplayNameDraft(initialProfile.displayName);
      onProfileChange?.(initialProfile);
      setFormState(buildProfileFormState(initialProfile));
      setLoading(false);
      setError(null);
      setUploadError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setUploadError(null);
    setNotice(null);

    void getMyProfile()
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setDisplayNameDraft(result.displayName);
        onProfileChange?.(result);
        setFormState(buildProfileFormState(result));
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
  }, [profileEnabled, currentUser.id, initialProfile, onProfileChange]);

  const imageByOrder = useMemo(() => {
    const map = new Map<number, CommunityProfile["images"][number]>();
    for (const image of orderedImages) {
      map.set(image.imageOrder, image);
    }
    return map;
  }, [orderedImages]);
  const viewableImages = useMemo(
    () =>
      orderedImages
        .filter((image) => Boolean(image.imageUrl))
        .map((image) => ({
          id: image.id,
          imageUrl: image.imageUrl,
          alt: `프로필 사진 ${image.imageOrder}`,
        })),
    [orderedImages],
  );
  const orderedDraftImages = useMemo(
    () => [...draftImages].sort((a, b) => a.imageOrder - b.imageOrder),
    [draftImages],
  );
  const draftImageByOrder = useMemo(() => {
    const map = new Map<number, DraftProfileImage>();
    for (const image of orderedDraftImages) {
      map.set(image.imageOrder, image);
    }
    return map;
  }, [orderedDraftImages]);
  const viewableDraftImages = useMemo(
    () =>
      orderedDraftImages
        .filter((image) => Boolean(image.imageUrl))
        .map((image) => ({
          id: image.id,
          imageUrl: image.imageUrl,
          alt: `프로필 사진 ${image.imageOrder}`,
        })),
    [orderedDraftImages],
  );
  const hasDraftChanges = useMemo(() => {
    if (!profile) {
      return false;
    }

    const normalizedDisplayName = formState.displayName.trim();
    const normalizedBio = formState.bio.trim();
    const normalizedInterests = parseInterestTokens(formState.interestsInput);

    const textChanged =
      normalizedDisplayName !== profile.displayName ||
      normalizedBio !== (profile.bio ?? "") ||
      formState.profileVisibility !== profile.profileVisibility ||
      formState.showDepartment !== profile.showDepartment ||
      formState.showAdmissionYear !== profile.showAdmissionYear ||
      JSON.stringify(normalizedInterests) !== JSON.stringify(profile.interests);

    const imageChanged =
      JSON.stringify(buildImageDraftSignature(orderedDraftImages)) !==
      JSON.stringify(buildImageDraftSignature(profile.images as DraftProfileImage[]));

    return textChanged || imageChanged;
  }, [formState, orderedDraftImages, profile]);

  const hasTextDraftChanges = useMemo(() => {
    if (!profile) {
      return false;
    }

    const normalizedDisplayName = formState.displayName.trim();
    const normalizedBio = formState.bio.trim();
    const normalizedInterests = parseInterestTokens(formState.interestsInput);

    return (
      normalizedDisplayName !== profile.displayName ||
      normalizedBio !== (profile.bio ?? "") ||
      formState.profileVisibility !== profile.profileVisibility ||
      formState.showDepartment !== profile.showDepartment ||
      formState.showAdmissionYear !== profile.showAdmissionYear ||
      JSON.stringify(normalizedInterests) !== JSON.stringify(profile.interests)
    );
  }, [formState, profile]);

  const hasImageDraftChanges = useMemo(() => {
    if (!profile) {
      return false;
    }

    return (
      JSON.stringify(buildImageDraftSignature(orderedDraftImages)) !==
      JSON.stringify(buildImageDraftSignature(profile.images as DraftProfileImage[]))
    );
  }, [orderedDraftImages, profile]);

  function openImageViewer(imageId: string) {
    const sourceImages = open ? viewableDraftImages : viewableImages;
    const nextIndex = sourceImages.findIndex((image) => image.id === imageId);
    if (nextIndex < 0) return;
    setViewerIndex(nextIndex);
  }

  function cleanupDraftPreviewUrls(images: DraftProfileImage[]) {
    for (const image of images) {
      if (image.localPreviewUrl) {
        URL.revokeObjectURL(image.localPreviewUrl);
      }
    }
  }

  function openEditor() {
    if (!profile) return;
    setError(null);
    setUploadError(null);
    cleanupDraftPreviewUrls(draftImages);
    setFormState(buildProfileFormState(profile));
    setDraftImages(cloneDraftImages(profile.images));
    setActiveImageOrder(1);
    setOpen(true);
  }

  function resetDraftChanges() {
    if (!profile) {
      return;
    }

    cleanupDraftPreviewUrls(draftImages);
    setFormState(buildProfileFormState(profile));
    setDraftImages(cloneDraftImages(profile.images));
    setActiveImageOrder(1);
    setError(null);
    setUploadError(null);
  }

  function handleProfileVisibilityChange(nextVisibility: ProfileVisibility) {
    setFormState((current) => {
      if (current.profileVisibility === nextVisibility) {
        return current;
      }

      return {
        ...current,
        profileVisibility: nextVisibility,
      };
    });
  }

  function handleProfileFlagToggle(key: "showDepartment" | "showAdmissionYear") {
    setFormState((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function requestCloseEditor() {
    if (hasDraftChanges && typeof window !== "undefined") {
      const confirmed = window.confirm("저장하지 않은 변경사항이 있어요. 닫으면 편집 내용이 사라집니다.");
      if (!confirmed) {
        return;
      }
    }

    skipDiscardConfirmRef.current = true;
    setOpen(false);
  }

  function openFilePicker(order: number) {
    if (uploadingOrder === order || isPending) {
      return;
    }

    fileInputRefs.current[order]?.click();
  }

  function moveActiveImageTab(direction: -1 | 1) {
    setActiveImageOrder((current) => {
      const next = current + direction;
      if (next < 1 || next > 3) {
        return current;
      }
      return next as 1 | 2 | 3;
    });
  }

  function handleImagePanelTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    swipeStartXRef.current = event.changedTouches[0]?.clientX ?? null;
    swipeStartYRef.current = event.changedTouches[0]?.clientY ?? null;
  }

  function handleImagePanelTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const startX = swipeStartXRef.current;
    const startY = swipeStartYRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    const endY = event.changedTouches[0]?.clientY ?? null;
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;

    if (startX === null || startY === null || endX === null || endY === null) {
      return;
    }

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    if (Math.abs(deltaX) < 64 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.4) {
      return;
    }

    moveActiveImageTab(deltaX < 0 ? 1 : -1);
  }

  async function handleSave() {
    if (!profile || isSaving) {
      return;
    }

    setSaveStatus("변경사항을 저장 중이에요.");
    try {
      const formData = new FormData();
      formData.set(
        "profile",
        JSON.stringify({
          displayName: formState.displayName,
          bio: formState.bio,
          interests: parseInterestTokens(formState.interestsInput),
          profileVisibility: formState.profileVisibility,
          showDepartment: formState.showDepartment,
          showAdmissionYear: formState.showAdmissionYear,
        }),
      );

      const imagePayload = orderedDraftImages.map((draftImage, index) => {
        const localFileField = draftImage.localFile ? `imageFile${index + 1}` : undefined;
        if (localFileField && draftImage.localFile) {
          formData.set(localFileField, draftImage.localFile);
        }

        return {
          id: draftImage.localFile ? undefined : draftImage.id,
          imageOrder: draftImage.imageOrder,
          isPrimary: draftImage.isPrimary,
          localFileField,
          sensitiveTextDetected: draftImage.moderationReason?.includes("개인정보"),
          qrDetected: draftImage.moderationReason?.includes("QR"),
          wasProcessed: draftImage.wasProcessed,
        };
      });
      formData.set("images", JSON.stringify(imagePayload));

      const nextProfile = await saveCommunityProfileDraft(formData);

      setError(null);
      setUploadError(null);
      setNotice("프로필을 저장했습니다.");
      cleanupDraftPreviewUrls(draftImages);
      setDraftImages(cloneDraftImages(nextProfile.images));
      setProfile(nextProfile);
      onProfileChange?.(nextProfile);
      skipDiscardConfirmRef.current = true;
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "프로필을 저장하지 못했습니다.");
    } finally {
      setSaveStatus(null);
    }
  }

  function handleDisplayNameSave() {
    if (!profile) {
      return;
    }

    const nextDisplayName = displayNameDraft.trim();
    if (nextDisplayName.length < 2) {
      setError("닉네임은 2자 이상 입력해주세요.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          await updateMyProfile({
            displayName: nextDisplayName,
            bio: profile.bio ?? "",
            interests: profile.interests,
            profileVisibility: profile.profileVisibility,
            showDepartment: profile.showDepartment,
            showAdmissionYear: profile.showAdmissionYear,
          });

          const nextProfile = {
            ...profile,
            displayName: nextDisplayName,
          };
          setProfile(nextProfile);
          setDisplayNameDraft(nextProfile.displayName);
          setFormState(buildProfileFormState(nextProfile));
          onProfileChange?.(nextProfile);
          setEditingDisplayName(false);
          setError(null);
          setNotice("닉네임을 저장했습니다.");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "닉네임을 저장하지 못했습니다.");
        }
      })();
    });
  }

  async function handleImageUpload(order: number, file?: File | null) {
    if (!file) return;

    setUploadingOrder(order);
    setUploadStatus("사진을 준비 중이에요.");
    try {
      setUploadError(null);
      const preparedFile = await prepareProfileImageForUpload(file);
      setUploadStatus("얼굴과 개인정보를 확인 중이에요.");
      validateCommunityProfileImageFile(preparedFile);
      const analysis = await validateImageBeforeUpload(preparedFile);
      setEditorState({
        imageOrder: order,
        file: preparedFile,
        faceBoxes: analysis.faceBoxes,
        sensitiveTextDetected: analysis.sensitiveTextDetected,
        qrDetected: analysis.qrDetected,
        processedFile: null,
      });
      setUploadingOrder(null);
      setUploadStatus(null);
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "프로필 사진을 업로드하지 못했습니다.");
      setUploadingOrder(null);
      setUploadStatus(null);
    }
  }

  async function handleCaptureFromCamera(order: number) {
    if (uploadingOrder === order || isPending) {
      return;
    }

    try {
      setUploadError(null);
      const capturedFile = await captureImageFromNativeCamera();
      if (!capturedFile) {
        return;
      }

      await handleImageUpload(order, capturedFile);
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "사진 촬영을 시작하지 못했습니다.");
    }
  }

  async function handleImageDelete(imageId: string) {
    setDraftImages((current) => {
      const target = current.find((image) => image.id === imageId);
      if (target?.localPreviewUrl) {
        URL.revokeObjectURL(target.localPreviewUrl);
      }
      return withSinglePrimary(current.filter((image) => image.id !== imageId));
    });
  }

  async function handleMoveImage(imageId: string, direction: -1 | 1) {
    const currentIndex = orderedDraftImages.findIndex((item) => item.id === imageId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedDraftImages.length) {
      return;
    }

    const nextOrder = [...orderedDraftImages];
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
    setDraftImages(
      nextOrder.map((image, index) => ({
        ...image,
        imageOrder: (index + 1) as 1 | 2 | 3,
      })),
    );
  }

  async function handleSetPrimaryImage(imageId: string) {
    setDraftImages((current) =>
      withSinglePrimary(
        current.map((image) => ({
          ...image,
          isPrimary: image.id === imageId && image.moderationStatus === "approved",
        })),
      ),
    );
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
      {!open && error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
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
                  {editingDisplayName ? (
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <Input
                        value={displayNameDraft}
                        onChange={(event) => setDisplayNameDraft(event.target.value)}
                        maxLength={24}
                        className="h-10 min-w-[180px] max-w-[260px]"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleDisplayNameSave}
                        disabled={isPending || displayNameDraft.trim().length < 2}
                      >
                        저장
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => {
                          setDisplayNameDraft(profile.displayName);
                          setEditingDisplayName(false);
                        }}
                      >
                        취소
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80"
                      onClick={() => {
                        setDisplayNameDraft(profile.displayName);
                        setEditingDisplayName(true);
                        setError(null);
                      }}
                    >
                      <p className="text-xl font-semibold tracking-[-0.03em] text-foreground">
                        {profile.displayName}
                      </p>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-muted-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  )}
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
                          <button
                            type="button"
                            className="relative block h-full w-full"
                            onClick={() => openImageViewer(image.id)}
                          >
                            <ProfileImage
                              src={image.imageUrl}
                              alt={`프로필 사진 ${index + 1}`}
                              width={480}
                              height={520}
                              className="h-full w-full object-cover"
                              fallback={
                                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                  사진 {index + 1}
                                </div>
                              }
                            />
                            {image.isPrimary ? (
                              <span className="absolute left-3 top-3 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-sm">
                                대표
                              </span>
                            ) : null}
                          </button>
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
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && viewerIndex !== null) {
            return;
          }

          if (!nextOpen) {
            if (skipDiscardConfirmRef.current) {
              skipDiscardConfirmRef.current = false;
            } else if (hasDraftChanges && typeof window !== "undefined") {
              const confirmed = window.confirm("저장하지 않은 변경사항이 있어요. 닫으면 편집 내용이 사라집니다.");
              if (!confirmed) {
                return;
              }
            }
            cleanupDraftPreviewUrls(draftImages);
            setDraftImages([]);
            setUploadError(null);
          }
          setOpen(nextOpen);
        }}
      >
        <DialogContent
          className="max-h-[calc(100vh-3rem)] overflow-y-auto"
          onInteractOutside={(event) => {
            if (viewerIndex !== null) {
              event.preventDefault();
            }
          }}
          onEscapeKeyDown={(event) => {
            if (viewerIndex !== null) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>내 홈 수정</DialogTitle>
            <DialogDescription>
              얼굴 사진 없이, 학생 인증 사용자에게 보여줄 기본 정보만 정리합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div
              aria-hidden={!hasDraftChanges}
              className={`min-h-[52px] rounded-2xl px-4 py-3 text-sm transition-all ${
                hasDraftChanges
                  ? "border border-primary/20 bg-primary/10 text-primary opacity-100"
                  : "border border-transparent bg-transparent text-transparent opacity-0"
              }`}
            >
              {hasDraftChanges ? (
                "저장 전 변경사항이 있어요. 저장해야 실제 프로필에 반영됩니다."
              ) : (
                <span>저장 전 변경사항이 있어요. 저장해야 실제 프로필에 반영됩니다.</span>
              )}
            </div>
            <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">프로필 사진</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    대표 사진 1장 포함 최대 3장까지 올릴 수 있어요.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <Badge variant="outline">최대 3장</Badge>
                  <Badge variant="outline">얼굴 노출 금지</Badge>
                </div>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                연락처, SNS 아이디, QR, 학생증 등 개인정보가 보이는 사진은 올릴 수 없어요.
              </p>
              {uploadError ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {uploadError}
                </div>
              ) : null}
              {uploadingOrder !== null && uploadStatus ? (
                <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadStatus}
                </div>
              ) : null}
              {saveStatus ? (
                <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {saveStatus}
                </div>
              ) : null}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {([1, 2, 3] as const).map((order) => {
                    const image = draftImageByOrder.get(order);
                    const active = activeImageOrder === order;

                    return (
                      <Button
                        key={order}
                        type="button"
                        variant={active ? "secondary" : "outline"}
                        className={`h-11 min-w-0 justify-center overflow-hidden rounded-[18px] px-3 text-xs ${
                          image?.isPrimary ? "border-emerald-400/60 ring-1 ring-emerald-400/25" : ""
                        }`}
                        onClick={() => setActiveImageOrder(order)}
                      >
                        <span className="truncate">사진 {order}</span>
                      </Button>
                    );
                  })}
                </div>

                {([1, 2, 3] as const).map((order) => {
                  const image = draftImageByOrder.get(order);
                  const active = activeImageOrder === order;

                  if (!active) {
                    return null;
                  }

                  return (
                    <div
                      key={order}
                      className={`space-y-3 rounded-[22px] border bg-slate-950/10 p-3 ${
                        image?.isPrimary ? "border-emerald-400/35" : "border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-foreground">
                            사진 {order}
                          </span>
                        </div>
                        {image ? (
                          <span className="text-[11px] text-muted-foreground">
                            {image.moderationStatus === "approved"
                              ? "공개 중"
                              : image.moderationStatus === "pending"
                                ? "검토 중"
                                : "차단됨"}
                          </span>
                        ) : null}
                      </div>

                      <div
                        className={`app-muted-surface flex aspect-[0.92] items-center justify-center overflow-hidden rounded-[18px] border ${
                          image?.isPrimary ? "border-emerald-400/55" : "border-white/10"
                        }`}
                        onTouchStart={handleImagePanelTouchStart}
                        onTouchEnd={handleImagePanelTouchEnd}
                      >
                        {image?.imageUrl ? (
                          <button
                            type="button"
                            className="relative block h-full w-full"
                            onClick={() => openImageViewer(image.id)}
                          >
                            <ProfileImage
                              src={image.imageUrl}
                              alt={`프로필 사진 ${order}`}
                              width={480}
                              height={520}
                              className="h-full w-full object-cover"
                              fallback={
                                <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
                                  <ImagePlus className="h-4 w-4" />
                                  <span>사진 {order}</span>
                                </div>
                              }
                            />
                          </button>
                        ) : (
                          <div className="flex flex-col items-center gap-2 px-4 text-center text-xs text-muted-foreground">
                            <ImagePlus className="h-4 w-4" />
                            <span>아직 사진이 없어요</span>
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
                            {image.localFile ? <Badge variant="outline">저장 전</Badge> : null}
                            {image.moderationReason ? (
                              <span className="text-[11px] text-muted-foreground">
                                {image.moderationReason}
                              </span>
                            ) : null}
                          </div>
                          <div
                            className={`grid gap-2 ${
                              supportsNativeCamera ? "grid-cols-3" : "grid-cols-2"
                            }`}
                          >
                            <Button
                              type="button"
                              variant={image.isPrimary ? "secondary" : "outline"}
                              size="sm"
                              className="h-9 justify-center text-xs"
                              disabled={isPending || isSaving || image.moderationStatus !== "approved" || image.isPrimary}
                              onClick={() => void handleSetPrimaryImage(image.id)}
                            >
                              {image.isPrimary ? "대표 사진" : "대표로 설정"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 justify-center text-xs"
                              disabled={uploadingOrder === order || isPending || isSaving}
                              onClick={() => openFilePicker(order)}
                            >
                              사진 교체
                            </Button>
                            {supportsNativeCamera ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 justify-center text-xs"
                                disabled={uploadingOrder === order || isPending || isSaving}
                                onClick={() => void handleCaptureFromCamera(order)}
                              >
                                <Camera className="h-4 w-4" />
                                사진 촬영
                              </Button>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 justify-center text-xs"
                              disabled={isPending || isSaving || orderedDraftImages[0]?.id === image.id}
                              onClick={() => void handleMoveImage(image.id, -1)}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              앞으로
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 justify-center text-xs"
                              disabled={isPending || isSaving || orderedDraftImages[orderedDraftImages.length - 1]?.id === image.id}
                              onClick={() => void handleMoveImage(image.id, 1)}
                            >
                              뒤로
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 justify-center text-xs text-rose-300 hover:text-rose-200"
                              disabled={isPending || isSaving}
                              onClick={() => void handleImageDelete(image.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              삭제
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      <input
                        ref={(node) => {
                          fileInputRefs.current[order] = node;
                        }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                        disabled={uploadingOrder === order || isPending || isSaving}
                        hidden
                        aria-hidden="true"
                        tabIndex={-1}
                        className="hidden"
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] ?? null;
                          void handleImageUpload(order, nextFile);
                          event.currentTarget.value = "";
                        }}
                      />
                      {!image ? (
                        <div className={`grid gap-2 ${supportsNativeCamera ? "grid-cols-2" : "grid-cols-1"}`}>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            disabled={uploadingOrder === order || isPending || isSaving}
                            onClick={() => openFilePicker(order)}
                          >
                            사진 업로드
                          </Button>
                          {supportsNativeCamera ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                            disabled={uploadingOrder === order || isPending || isSaving}
                              onClick={() => void handleCaptureFromCamera(order)}
                            >
                              <Camera className="h-4 w-4" />
                              사진 촬영
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 disabled:opacity-40"
                          disabled={order === 1}
                          onClick={() => moveActiveImageTab(-1)}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          이전 사진
                        </button>
                        <span>{order} / 3</span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 disabled:opacity-40"
                          disabled={order === 3}
                          onClick={() => moveActiveImageTab(1)}
                        >
                          다음 사진
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">JPG · PNG · WEBP · HEIC · 5MB 이하</p>
                          {uploadingOrder === order ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {uploadStatus ?? "업로드 중"}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                여기서 바꾼 사진과 순서는 저장을 눌러야 실제 프로필에 반영돼요.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="community-profile-bio">한줄 소개</Label>
              <Input
                id="community-profile-bio"
                maxLength={160}
                value={formState.bio}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    bio: event.target.value,
                  }))
                }
                placeholder="한줄로 가볍게 소개해보세요"
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

            <div className="space-y-2">
              <Label>프로필 공개 범위</Label>
              <div className="overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.02]">
                <button
                  type="button"
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm ${
                    formState.profileVisibility === "university_only"
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => handleProfileVisibilityChange("university_only")}
                >
                  <span className="font-medium">전체 공개</span>
                  <span
                    className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      formState.profileVisibility === "university_only"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-white/15 text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </button>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between border-t border-white/10 px-4 py-3 text-left text-sm ${
                    formState.profileVisibility === "same_school_only"
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => handleProfileVisibilityChange("same_school_only")}
                >
                  <span className="font-medium">학교만 공개</span>
                  <span
                    className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      formState.profileVisibility === "same_school_only"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-white/15 text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </button>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between border-t border-white/10 px-4 py-3 text-left text-sm ${
                    formState.showDepartment ? "bg-primary/10 text-foreground" : "text-muted-foreground"
                  }`}
                  onClick={() => handleProfileFlagToggle("showDepartment")}
                >
                  <span className="font-medium">학과 공개</span>
                  <span className="text-xs">{formState.showDepartment ? "공개" : "비공개"}</span>
                </button>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between border-t border-white/10 px-4 py-3 text-left text-sm ${
                    formState.showAdmissionYear ? "bg-primary/10 text-foreground" : "text-muted-foreground"
                  }`}
                  onClick={() => handleProfileFlagToggle("showAdmissionYear")}
                >
                  <span className="font-medium">입학년도 공개</span>
                  <span className="text-xs">{formState.showAdmissionYear ? "공개" : "비공개"}</span>
                </button>
              </div>
            </div>

            {open && error ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={resetDraftChanges}
              disabled={isPending || isSaving || !hasDraftChanges}
            >
              변경 초기화
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={requestCloseEditor}
              disabled={isSaving}
            >
              닫기
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={isPending || isSaving || !hasDraftChanges}
            >
              {isSaving ? "저장 중" : isPending ? "저장 중" : "저장"}
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
        skipDuplicateValidation
        initialProcessedFile={editorState?.processedFile ?? null}
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
          const previewUrl = URL.createObjectURL(file);
          setDraftImages((current) => {
            const replacedImage = current.find((image) => image.imageOrder === editorState.imageOrder);
            if (replacedImage?.localPreviewUrl) {
              URL.revokeObjectURL(replacedImage.localPreviewUrl);
            }
            const filtered = current.filter((image) => image.imageOrder !== editorState.imageOrder);
            return withSinglePrimary(
              filtered.concat({
                id: crypto.randomUUID(),
                userId: currentUser.id,
                imagePath: "",
                imageOrder: editorState.imageOrder as 1 | 2 | 3,
                isPrimary: filtered.every((image) => !image.isPrimary),
                moderationStatus: flags.sensitiveTextDetected || flags.qrDetected ? "pending" : "approved",
                moderationReason:
                  flags.sensitiveTextDetected || flags.qrDetected
                    ? "연락처, SNS, QR, 학생증 등 개인정보가 포함된 것으로 보여 검토 후 공개됩니다."
                    : undefined,
                imageUrl: previewUrl,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                localFile: file,
                localPreviewUrl: previewUrl,
                wasProcessed: flags.processedByEditor,
              }),
            );
          });
          setEditorState(null);
        }}
      />
      <ProfileImageViewerDialog
        open={viewerIndex !== null}
        images={open ? viewableDraftImages : viewableImages}
        initialIndex={viewerIndex ?? 0}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setViewerIndex(null);
          }
        }}
      />
    </section>
  );
}
