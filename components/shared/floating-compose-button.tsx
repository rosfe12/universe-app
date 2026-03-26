"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.7rem)] right-4 z-[60] h-11 w-11 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#4f46e5_0%,#6d28d9_100%)] p-0 text-white shadow-[0_20px_40px_-22px_rgba(79,70,229,0.95)] transition-transform duration-150 active:scale-[0.98] md:right-[calc(50%-220px+1rem)] md:h-12 md:w-auto md:rounded-full md:px-4"
    >
      <Plus className="h-4 w-4 shrink-0" />
      <span className="sr-only md:not-sr-only md:ml-2">{label}</span>
    </Button>,
    document.body,
  );
}
