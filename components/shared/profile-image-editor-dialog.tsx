"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, Loader2, Move, RotateCcw, ScanFace, Sparkles, X } from "lucide-react";

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
  buildManualCoverBoxes,
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
  initialProcessedFile?: File | null;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  onConfirm: (file: File, flags: { sensitiveTextDetected: boolean; qrDetected: boolean }) => Promise<void>;
};

type MaskMode =
  | { kind: "blur" }
  | { kind: "sticker"; stickerType: StickerType };

type ImageMetrics = {
  width: number;
  height: number;
};

type PreviewMetrics = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type DragState = {
  mode: "move" | "resize";
  pointerId: number;
  boxIndex: number;
  startClientX: number;
  startClientY: number;
  startBox: FaceBox;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function ProfileImageEditorDialog({
  open,
  file,
  imageOrder,
  faceBoxes,
  sensitiveTextDetected,
  qrDetected,
  initialProcessedFile,
  onOpenChange,
  onReset,
  onConfirm,
}: ProfileImageEditorDialogProps) {
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stickerType, setStickerType] = useState<StickerType>("smile");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasAutoApplied, setHasAutoApplied] = useState(false);
  const [editableBoxes, setEditableBoxes] = useState<FaceBox[]>([]);
  const [maskMode, setMaskMode] = useState<MaskMode | null>(null);
  const [imageMetrics, setImageMetrics] = useState<ImageMetrics | null>(null);
  const [previewMetrics, setPreviewMetrics] = useState<PreviewMetrics | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const editableBoxesRef = useRef<FaceBox[]>([]);

  useEffect(() => {
    setProcessedFile(initialProcessedFile ?? null);
    setError(null);
    setStickerType("smile");
    setIsProcessing(false);
    setHasAutoApplied(Boolean(initialProcessedFile));
    setEditableBoxes(faceBoxes);
    setMaskMode(initialProcessedFile ? { kind: "blur" } : null);
    setImageMetrics(null);
    setPreviewMetrics(null);
    setDragState(null);
  }, [faceBoxes, file, initialProcessedFile, open]);

  useEffect(() => {
    if (processedFile || initialProcessedFile) {
      setIsProcessing(false);
    }
  }, [initialProcessedFile, processedFile]);

  useEffect(() => {
    editableBoxesRef.current = editableBoxes;
  }, [editableBoxes]);

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

  const hasDetectedFaces = faceBoxes.length > 0;
  const hasSensitiveWarning = sensitiveTextDetected || qrDetected;
  const canMask = editableBoxes.length > 0;
  const confirmLabel = canMask
    ? "이 이미지 업로드"
    : hasSensitiveWarning
      ? "검토 후 업로드"
      : "이대로 업로드";

  const syncPreviewMetrics = useCallback(() => {
    const frame = previewFrameRef.current;
    const image = previewImageRef.current;

    if (!frame || !image || image.clientWidth === 0 || image.clientHeight === 0) {
      return;
    }

    setPreviewMetrics({
      left: image.offsetLeft,
      top: image.offsetTop,
      width: image.clientWidth,
      height: image.clientHeight,
    });
  }, []);

  useEffect(() => {
    if (hasDetectedFaces) {
      setEditableBoxes(faceBoxes);
    }
  }, [faceBoxes, hasDetectedFaces]);

  useEffect(() => {
    if (!open || !file || !hasDetectedFaces || processedFile || initialProcessedFile || hasAutoApplied) {
      return;
    }

    let active = true;
    setIsProcessing(true);
    setError(null);

    void (async () => {
      try {
        const nextFile = await applyBlurToFaces(file, faceBoxes);
        if (!active) {
          return;
        }
        setProcessedFile(nextFile);
        setHasAutoApplied(true);
        setMaskMode({ kind: "blur" });
      } catch (cause) {
        if (!active) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "자동 흐림 처리를 하지 못했습니다.");
      } finally {
        if (active) {
          setIsProcessing(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [faceBoxes, file, hasAutoApplied, hasDetectedFaces, initialProcessedFile, open, processedFile]);

  useEffect(() => {
    if (!open) {
      return;
    }

    syncPreviewMetrics();
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => syncPreviewMetrics();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [open, syncPreviewMetrics]);

  async function applyMask(nextMode: MaskMode, nextBoxes = editableBoxes) {
    if (!file || nextBoxes.length === 0) return;
    setError(null);
    setIsProcessing(true);

    try {
      const nextFile =
        nextMode.kind === "blur"
          ? await applyBlurToFaces(file, nextBoxes)
          : await applyStickerToFaces(file, nextBoxes, nextMode.stickerType);
      setProcessedFile(nextFile);
      setHasAutoApplied(true);
      setMaskMode(nextMode);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : nextMode.kind === "blur"
            ? "흐림 처리를 하지 못했습니다."
            : "스티커 처리를 하지 못했습니다.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleApplyBlur() {
    await applyMask({ kind: "blur" });
  }

  async function handleStartManualMasking() {
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    try {
      const nextBoxes =
        editableBoxes.length > 0 ? editableBoxes : await buildManualCoverBoxes(file);
      setEditableBoxes(nextBoxes);
      const nextFile = await applyBlurToFaces(file, nextBoxes);
      setProcessedFile(nextFile);
      setHasAutoApplied(true);
      setMaskMode({ kind: "blur" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "가림 처리를 시작하지 못했습니다.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleApplySticker(nextStickerType: StickerType) {
    setStickerType(nextStickerType);
    await applyMask({ kind: "sticker", stickerType: nextStickerType });
  }

  function handleBoxPointerDown(index: number, event: React.PointerEvent<HTMLButtonElement>) {
    if (!imageMetrics || !previewMetrics) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextBox = editableBoxes[index];
    if (!nextBox) {
      return;
    }

    setDragState({
      mode: "move",
      pointerId: event.pointerId,
      boxIndex: index,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: nextBox,
    });
  }

  function handleResizePointerDown(index: number, event: React.PointerEvent<HTMLElement>) {
    if (!imageMetrics || !previewMetrics) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextBox = editableBoxes[index];
    if (!nextBox) {
      return;
    }

    setDragState({
      mode: "resize",
      pointerId: event.pointerId,
      boxIndex: index,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: nextBox,
    });
  }

  function handleBoxPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState || !imageMetrics || !previewMetrics) {
      return;
    }
    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = ((event.clientX - dragState.startClientX) / previewMetrics.width) * imageMetrics.width;
    const deltaY = ((event.clientY - dragState.startClientY) / previewMetrics.height) * imageMetrics.height;

    setEditableBoxes((current) =>
      current.map((box, index) => {
        if (index !== dragState.boxIndex) {
          return box;
        }

        return {
          ...box,
          ...(dragState.mode === "move"
            ? {
                x: clamp(dragState.startBox.x + deltaX, 0, imageMetrics.width - dragState.startBox.width),
                y: clamp(dragState.startBox.y + deltaY, 0, imageMetrics.height - dragState.startBox.height),
              }
            : {
                width: clamp(dragState.startBox.width + deltaX, 24, imageMetrics.width - dragState.startBox.x),
                height: clamp(dragState.startBox.height + deltaY, 24, imageMetrics.height - dragState.startBox.y),
              }),
        };
      }),
    );
  }

  function handleBoxPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    setDragState(null);
    if (maskMode) {
      void applyMask(maskMode, editableBoxesRef.current);
    }
  }

  async function handleConfirm() {
    if (!file || imageOrder === null) return;

    if (hasDetectedFaces && !processedFile) {
      setError("얼굴을 가린 뒤 업로드할 수 있어요.");
      return;
    }

    setError(null);
    setIsProcessing(true);
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
    } finally {
      setIsProcessing(false);
    }
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
          <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">사진 {imageOrder ?? 1} 업로드</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  원본과 반영본을 바로 비교하면서 가린 뒤 업로드할 수 있어요.
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-muted-foreground">
                {hasDetectedFaces ? "얼굴 감지됨" : "직접 가리기 가능"}
              </span>
            </div>
          </div>

          {hasDetectedFaces ? (
            <div className="rounded-[20px] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
              얼굴이 감지됐어요. 캠버스에서는 얼굴이 보이지 않도록 가려야 해요.
            </div>
          ) : null}

          {!hasDetectedFaces ? (
            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
              자동 얼굴 감지가 놓칠 수 있어요. 얼굴이 보이면 직접 가린 뒤 업로드해주세요.
            </div>
          ) : null}

          {hasSensitiveWarning ? (
            <div className="rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              전화번호, SNS 아이디, QR코드 등 개인정보도 함께 가려주세요.
            </div>
          ) : null}

          {hasDetectedFaces && processedPreviewUrl ? (
            <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              얼굴을 자동으로 가린 이미지를 준비했어요. 그대로 올리거나 스티커로 다시 가릴 수 있어요.
            </div>
          ) : null}

          {canMask ? (
            <div className="space-y-3 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={maskMode?.kind === "blur" ? "secondary" : "outline"}
                  disabled={isProcessing}
                  onClick={() => void handleApplyBlur()}
                >
                  <ScanFace className="h-4 w-4" />
                  {hasDetectedFaces ? "자동 흐림 처리" : "수동 흐림 처리"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isProcessing}
                  onClick={() => {
                    setProcessedFile(null);
                    setError(null);
                    setHasAutoApplied(false);
                    setMaskMode(null);
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  다시 처리
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">스티커 가리기</p>
                <div className="flex flex-wrap gap-2">
                  {(["smile", "star", "dot", "sparkle"] as StickerType[]).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={maskMode?.kind === "sticker" && stickerType === value ? "secondary" : "outline"}
                      disabled={isProcessing}
                      onClick={() => void handleApplySticker(value)}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
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
              <p className="text-xs leading-5 text-muted-foreground">
                박스를 끌어 이동하고, 우하단 아이콘으로 크기를 조절할 수 있어요.
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">원본</p>
              <div className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.03]">
                <div
                  ref={previewFrameRef}
                  className="relative flex aspect-[0.92] w-full items-center justify-center"
                >
                  {originalPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      ref={previewImageRef}
                      src={originalPreviewUrl}
                      alt="원본 미리보기"
                      className="max-h-full max-w-full object-contain"
                      onLoad={(event) => {
                        setImageMetrics({
                          width: event.currentTarget.naturalWidth,
                          height: event.currentTarget.naturalHeight,
                        });
                        syncPreviewMetrics();
                      }}
                    />
                  ) : null}
                  {previewMetrics && imageMetrics && editableBoxes.length > 0 ? (
                    <div
                      className="absolute touch-none"
                      style={{
                        left: previewMetrics.left,
                        top: previewMetrics.top,
                        width: previewMetrics.width,
                        height: previewMetrics.height,
                      }}
                      onPointerMove={handleBoxPointerMove}
                      onPointerUp={handleBoxPointerEnd}
                      onPointerCancel={handleBoxPointerEnd}
                    >
                      {editableBoxes.map((box, index) => (
                        <button
                          key={`${index}-${box.x}-${box.y}-${box.width}-${box.height}`}
                          type="button"
                          className="absolute rounded-[16px] border border-primary/60 bg-primary/15 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-sm"
                          style={{
                            left: `${(box.x / imageMetrics.width) * 100}%`,
                            top: `${(box.y / imageMetrics.height) * 100}%`,
                            width: `${(box.width / imageMetrics.width) * 100}%`,
                            height: `${(box.height / imageMetrics.height) * 100}%`,
                          }}
                          onPointerDown={(event) => handleBoxPointerDown(index, event)}
                        >
                          <span className="pointer-events-none absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-sm">
                            <Move className="h-3.5 w-3.5" />
                          </span>
                          <div
                            className="absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-black/55 text-white shadow-sm"
                            role="button"
                            tabIndex={0}
                            aria-label="가림 크기 조절"
                            onPointerDown={(event) => handleResizePointerDown(index, event)}
                          >
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                반영본
              </p>
              <div className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.03]">
                <div className="relative aspect-[0.92] w-full">
                  {processedPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <>
                      <img
                        src={processedPreviewUrl}
                        alt="편집 미리보기"
                        className="h-full w-full object-contain"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="absolute right-3 top-3 h-8 w-8 rounded-full"
                        disabled={isProcessing}
                        onClick={() => {
                          setProcessedFile(null);
                          setMaskMode(null);
                          setError(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : isProcessing ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>가린 이미지를 만드는 중이에요.</span>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
                      <span>블러나 스티커를 적용하면 여기에서 바로 결과를 볼 수 있어요.</span>
                      {!canMask ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isProcessing}
                          onClick={() => void handleStartManualMasking()}
                        >
                          <ScanFace className="h-4 w-4" />
                          직접 가리기 시작
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {hasSensitiveWarning && !hasDetectedFaces ? (
            <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
              개인정보가 보이면 가린 이미지를 다시 선택해주세요. 그대로 올리면 검토 후 공개돼요.
            </div>
          ) : null}

          {error ? <p className="text-sm text-rose-500">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={isProcessing}
            onClick={() => {
              onReset();
              onOpenChange(false);
            }}
          >
            다시 선택
          </Button>
          <Button type="button" disabled={isProcessing || (hasDetectedFaces && !processedFile)} onClick={() => void handleConfirm()}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                처리 중
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
