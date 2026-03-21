"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FloatingComposeButton({
  onClick,
  label = "글쓰기",
  disabled = false,
}: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+7.7rem)] right-4 z-40 w-auto rounded-full px-5 shadow-[0_24px_48px_-22px_rgba(99,102,241,0.7)] md:right-[calc(50%-220px+1rem)]"
    >
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  );
}
