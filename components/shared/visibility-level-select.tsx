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
}: {
  value: VisibilityLevel;
  onChange: (value: VisibilityLevel) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as VisibilityLevel)}>
      <SelectTrigger>
        <SelectValue placeholder="공개 범위 선택" />
      </SelectTrigger>
      <SelectContent>
        {(
          Object.keys(VISIBILITY_LEVEL_LABELS) as VisibilityLevel[]
        ).map((level) => (
          <SelectItem key={level} value={level}>
            {VISIBILITY_LEVEL_LABELS[level]} · {VISIBILITY_LEVEL_DESCRIPTIONS[level]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
