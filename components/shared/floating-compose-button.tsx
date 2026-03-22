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
      aria-label={label}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-40 h-11 w-11 rounded-2xl border border-indigo-100 bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_100%)] p-0 text-white shadow-[0_16px_30px_-18px_rgba(79,70,229,0.75)] transition-transform duration-150 active:scale-[0.98] md:right-[calc(50%-220px+1rem)] md:h-auto md:w-auto md:rounded-full md:px-4 md:py-2"
    >
      <Plus className="h-4 w-4 shrink-0" />
      <span className="sr-only md:not-sr-only md:ml-2">{label}</span>
    </Button>
  );
}
