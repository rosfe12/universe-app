"use client";

import Image from "next/image";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { uploadImage, type UploadTarget } from "@/lib/supabase/storage";

export function ImageUploadField({
  label,
  helperText,
  value,
  onChange,
  userId,
  target = "post",
  disabled = false,
}: {
  label: string;
  helperText?: string;
  value?: string;
  onChange: (url: string) => void;
  userId: string;
  target?: UploadTarget;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState(value ?? "");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreviewUrl(value ?? "");
  }, [value]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {helperText ? (
            <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
          ) : null}
        </div>
        {previewUrl ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setPreviewUrl("");
              setErrorMessage("");
              onChange("");
              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
            disabled={disabled || uploading}
          >
            <X className="h-4 w-4" />
            제거
          </Button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          setErrorMessage("");
          const localUrl = URL.createObjectURL(file);
          setPreviewUrl(localUrl);
          setUploading(true);

          void (async () => {
            try {
              const uploadedUrl = await uploadImage(file, userId, target);
              setPreviewUrl(uploadedUrl);
              onChange(uploadedUrl);
            } catch (error) {
              setPreviewUrl(value ?? "");
              setErrorMessage(
                error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
              );
            } finally {
              setUploading(false);
              URL.revokeObjectURL(localUrl);
              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }
          })();
        }}
      />

      {previewUrl ? (
        <Card className="overflow-hidden border-white/80 bg-white/92">
          <CardContent className="space-y-3 py-4">
            <div className="relative overflow-hidden rounded-[22px] bg-secondary/60">
              <Image
                src={previewUrl}
                alt={label}
                width={1200}
                height={900}
                className="h-48 w-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {uploading ? "업로드 중입니다..." : "업로드가 완료되었습니다."}
              </p>
              {uploading ? (
                <div className="inline-flex items-center gap-2 text-xs font-medium text-primary">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  업로드 중
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              업로드 중
            </>
          ) : (
            <>
              <ImagePlus className="h-4 w-4" />
              이미지 선택
            </>
          )}
        </Button>
      )}

      {errorMessage ? <p className="text-xs text-rose-500">{errorMessage}</p> : null}
    </div>
  );
}
