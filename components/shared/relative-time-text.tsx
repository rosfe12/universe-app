"use client";

import { useEffect, useState } from "react";

import { formatAbsoluteDateLabel, formatRelativeLabel } from "@/lib/utils";

export function RelativeTimeText({
  dateString,
  className,
}: {
  dateString: string;
  className?: string;
}) {
  const [label, setLabel] = useState(() => formatAbsoluteDateLabel(dateString));

  useEffect(() => {
    setLabel(formatRelativeLabel(dateString));
  }, [dateString]);

  return (
    <span className={className} suppressHydrationWarning>
      {label}
    </span>
  );
}
