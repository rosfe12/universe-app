"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, RotateCcw, ScanFace, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  applyBlurToFaces,
  applyStickerToFaces,
  validateImageBeforeUpload,
} from "@/lib/profile-image-processing";
import type { FaceBox, StickerType } from "@/lib/profile-image-processing";

type ProfileImageEditorDialogProps = {
  open: boolean;
  file: File | null;
  imageOrder: number | null;
  faceBoxes: FaceBox[];
  sensitiveTextDetected: boolean;
  qrDetected: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  onConfirm: (file: File, flags: { sensitiveTextDetected: boolean; qrDetected: boolean }) => Promise<void>;
};

export function ProfileImageEditorDialog({
  open,
  file,
  imageOrder,
  faceBoxes,
  sensitiveTextDetected,
  qrDetected,
  onOpenChange,
  onReset,
  onConfirm,
}: ProfileImageEditorDialogProps) {
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stickerType, setStickerType] = useState<StickerType>("smile");
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    setProcessedFile(null);
    setError(null);
    setStickerType("smile");
  }, [file, open]);

  const originalPreviewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  const processedPreviewUrl = useMemo(() => {
    if (!processedFile) return null;
    return URL.createObjectURL(processedFile);
  }, [processedFile]);

  useEffect(() => {
    return () => {
      if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
    };
  }, [originalPreviewUrl]);

  useEffect(() => {
    return () => {
      if (processedPreviewUrl) URL.revokeObjectURL(processedPreviewUrl);
    };
  }, [processedPreviewUrl]);

  const needsFaceMask = faceBoxes.length > 0;
  const hasSensitiveWarning = sensitiveTextDetected || qrDetected;

  async function handleApplyBlur() {
    if (!file || faceBoxes.length === 0) return;
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const nextFile = await applyBlurToFaces(file, faceBoxes);
          setProcessedFile(nextFile);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "흐림 처리를 하지 못했습니다.");
        }
      })();
    });
  }

  async function handleApplySticker() {
    if (!file || faceBoxes.length === 0) return;
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const nextFile = await applyStickerToFaces(file, faceBoxes, stickerType);
          setProcessedFile(nextFile);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "스티커 처리를 하지 못했습니다.");
        }
      })();
    });
  }

  async function handleConfirm() {
    if (!file || imageOrder === null) return;

    if (needsFaceMask && !processedFile) {
      setError("얼굴을 가린 뒤 업로드할 수 있어요.");
      return;
    }

    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const uploadFile = processedFile ?? file;
          const rechecked = await validateImageBeforeUpload(uploadFile);
          if (rechecked.faceBoxes.length > 0) {
            throw new Error("얼굴이 아직 보여요. 흐림 처리나 스티커를 다시 적용해주세요.");
          }

          await onConfirm(uploadFile, {
            sensitiveTextDetected,
            qrDetected,
          });
          onOpenChange(false);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "이미지를 업로드하지 못했습니다.");
        }
      })();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          onReset();
        }
      }}
    >
      <DialogContent className="max-h-[calc(100vh-3rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>프로필 사진 확인</DialogTitle>
          <DialogDescription>
            얼굴이나 개인정보가 보이지 않도록 가린 뒤 업로드합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {needsFaceMask ? (
            <div className="rounded-[20px] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
              얼굴이 감지됐어요. 캠버스에서는 얼굴이 보이지 않도록 가려야 해요.
            </div>
          ) : null}

          {hasSensitiveWarning ? (
            <div className="rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              전화번호, SNS 아이디, QR코드 등 개인정보도 함께 가려주세요.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">원본</p>
              <div className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.03]">
                <div className="aspect-[0.92] w-full">
                  {originalPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={originalPreviewUrl}
                      alt="원본 미리보기"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                가려진 이미지
              </p>
              <div className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.03]">
                <div className="aspect-[0.92] w-full">
                  {processedPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={processedPreviewUrl}
                      alt="편집 미리보기"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                      자동 흐림이나 스티커를 적용하면 여기에서 결과를 볼 수 있어요.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {needsFaceMask ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void handleApplyBlur()}>
                  <ScanFace className="h-4 w-4" />
                  자동 흐림 처리
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => void handleApplySticker()}>
                  <Sparkles className="h-4 w-4" />
                  스티커로 가리기
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setProcessedFile(null);
                    setError(null);
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  다시 선택
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["smile", "star", "dot", "sparkle"] as StickerType[]).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={stickerType === value ? "secondary" : "outline"}
                    disabled={busy}
                    onClick={() => setStickerType(value)}
                  >
                    {value === "smile"
                      ? "스마일"
                      : value === "star"
                        ? "별"
                        : value === "dot"
                          ? "컬러 마스크"
                          : "반짝"}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-rose-500">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              onReset();
              onOpenChange(false);
            }}
          >
            다시 선택
          </Button>
          <Button type="button" disabled={busy || (needsFaceMask && !processedFile)} onClick={() => void handleConfirm()}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                처리 중
              </>
            ) : (
              "이 이미지 업로드"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
