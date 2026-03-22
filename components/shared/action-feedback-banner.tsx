"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ActionFeedbackBanner({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onClose();
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [onClose]);

  return (
    <div
      role="status"
      className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-emerald-900"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-emerald-100 p-2 text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">등록되었습니다</p>
          <p className="text-sm text-emerald-700">{message}</p>
        </div>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
        onClick={onClose}
        aria-label="닫기"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
