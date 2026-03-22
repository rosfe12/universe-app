"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VISIBILITY_LEVEL_DESCRIPTIONS,
  VISIBILITY_LEVEL_LABELS,
} from "@/lib/constants";
import type { VisibilityLevel } from "@/types";

export function VisibilityLevelSelect({
  value,
  onChange,
  levels = Object.keys(VISIBILITY_LEVEL_LABELS) as VisibilityLevel[],
}: {
  value: VisibilityLevel;
  onChange: (value: VisibilityLevel) => void;
  levels?: readonly VisibilityLevel[];
}) {
  const resolvedValue = levels.includes(value) ? value : levels[0];

  return (
    <Select value={resolvedValue} onValueChange={(next) => onChange(next as VisibilityLevel)}>
      <SelectTrigger>
        <SelectValue placeholder="공개 범위 선택" />
      </SelectTrigger>
      <SelectContent>
        {levels.map((level) => (
          <SelectItem key={level} value={level}>
            {VISIBILITY_LEVEL_LABELS[level]} · {VISIBILITY_LEVEL_DESCRIPTIONS[level]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
