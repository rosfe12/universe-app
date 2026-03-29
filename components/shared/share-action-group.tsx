"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, MessageCircleMore } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { copyToClipboard, shareToKakao, shareWithFallback } from "@/lib/kakao-share";
import type { SharePayload } from "@/lib/share-utils";

export function ShareActionGroup({
  payload,
  onFeedback,
  className,
  large = false,
}: {
  payload: SharePayload;
  onFeedback?: (message: string) => void;
  className?: string;
  large?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!inlineMessage) return;
    const timeoutId = window.setTimeout(() => setInlineMessage(null), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [inlineMessage]);

  const publishFeedback = (message: string) => {
    setInlineMessage(message);
    onFeedback?.(message);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size={large ? "lg" : "sm"}
          className={cn(
            "bg-[#FEE500] text-black hover:bg-[#f4da2a]",
            large ? "flex-1" : "",
          )}
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              try {
                const shared = await shareToKakao(payload);
                if (shared) {
                  publishFeedback("공유 창을 열었습니다.");
                  return;
                }

                const fallback = await shareWithFallback(payload);
                publishFeedback(
                  fallback === "native" ? "공유 시트를 열었습니다." : "링크가 복사되었습니다.",
                );
              } catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                  return;
                }

                await copyToClipboard(payload.linkUrl);
                publishFeedback("링크가 복사되었습니다.");
              }
            });
          }}
        >
          <MessageCircleMore className="h-4 w-4" />
          공유
        </Button>
        <Button
          type="button"
          size={large ? "lg" : "sm"}
          variant="outline"
          className={large ? "flex-1" : ""}
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await copyToClipboard(payload.linkUrl);
              publishFeedback("링크가 복사되었습니다.");
            });
          }}
        >
          <Copy className="h-4 w-4" />
          링크 복사
        </Button>
      </div>
      {inlineMessage ? <p className="text-xs text-slate-400">{inlineMessage}</p> : null}
    </div>
  );
}
