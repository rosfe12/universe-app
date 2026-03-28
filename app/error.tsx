"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

function isRecoverableChunkError(message: string) {
  return (
    message.includes("ChunkLoadError") ||
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module")
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!isRecoverableChunkError(error.message)) {
      return;
    }

    const reloadKey = "camverse-chunk-reload";
    const hasReloaded = window.sessionStorage.getItem(reloadKey) === "1";

    if (hasReloaded) {
      return;
    }

    window.sessionStorage.setItem(reloadKey, "1");
    window.location.reload();
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-4 p-5">
      <ErrorState
        title="화면을 불러오지 못했습니다"
        description="잠시 후 다시 시도해주세요."
      />
      <Button type="button" variant="outline" className="w-full" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
