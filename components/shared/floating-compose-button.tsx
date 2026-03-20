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
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-20 w-auto shadow-soft md:right-[calc(50%-215px+1rem)]"
    >
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  );
}
