"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ProfileImage } from "@/components/shared/profile-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProfileImageViewerItem = {
  id: string;
  imageUrl?: string | null;
  alt: string;
};

export function ProfileImageViewerDialog({
  open,
  images,
  initialIndex,
  onOpenChange,
}: {
  open: boolean;
  images: ProfileImageViewerItem[];
  initialIndex: number;
  onOpenChange: (open: boolean) => void;
}) {
  const safeInitialIndex = useMemo(() => {
    if (images.length === 0) return 0;
    return Math.min(Math.max(initialIndex, 0), images.length - 1);
  }, [images.length, initialIndex]);
  const [activeIndex, setActiveIndex] = useState(safeInitialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setActiveIndex(safeInitialIndex);
    }
  }, [open, safeInitialIndex]);

  const currentImage = images[activeIndex];

  function move(offset: number) {
    if (images.length <= 1) return;
    setActiveIndex((current) => {
      const next = current + offset;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  }

  function handleTouchStart(clientX: number) {
    setTouchStartX(clientX);
  }

  function handleTouchEnd(clientX: number) {
    if (touchStartX === null) return;
    const deltaX = clientX - touchStartX;
    setTouchStartX(null);

    if (Math.abs(deltaX) < 36) return;
    if (deltaX < 0) {
      move(1);
      return;
    }
    move(-1);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[140] bg-slate-950/72 backdrop-blur-sm"
        className="z-[141] max-w-[min(94vw,34rem)] border-white/10 bg-[#0f172a] p-3 sm:p-4"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>프로필 사진 보기</DialogTitle>
          <DialogDescription>
            프로필 사진을 확대해서 보고 좌우로 넘길 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
              사진 {Math.min(activeIndex + 1, images.length)} / {images.length}
            </Badge>
          </div>

          <div
            className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]"
            onTouchStart={(event) => handleTouchStart(event.touches[0]?.clientX ?? 0)}
            onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          >
            <div className="aspect-square w-full">
              {currentImage?.imageUrl ? (
                <ProfileImage
                  src={currentImage.imageUrl}
                  alt={currentImage.alt}
                  width={1200}
                  height={1200}
                  className="h-full w-full object-contain"
                  fallback={
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      이미지를 불러오지 못했습니다.
                    </div>
                  }
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  이미지를 불러오지 못했습니다.
                </div>
              )}
            </div>

            {images.length > 1 ? (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute left-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full"
                  onClick={() => move(-1)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full"
                  onClick={() => move(1)}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className="grid grid-cols-3 gap-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={`overflow-hidden rounded-[16px] border ${
                    index === activeIndex ? "border-primary" : "border-white/10"
                  } bg-white/[0.03]`}
                  onClick={() => setActiveIndex(index)}
                >
                  <div className="aspect-square w-full">
                    {image.imageUrl ? (
                      <ProfileImage
                        src={image.imageUrl}
                        alt={image.alt}
                        width={240}
                        height={240}
                        className="h-full w-full object-cover"
                        fallback={<div className="h-full w-full bg-white/[0.04]" />}
                      />
                    ) : (
                      <div className="h-full w-full bg-white/[0.04]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
