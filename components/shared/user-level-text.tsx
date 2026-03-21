import { getUserLevel } from "@/lib/user-identity";
import { cn } from "@/lib/utils";

const LEVEL_TEXT_CLASSNAME = {
  0: "text-red-400",
  1: "text-gray-400",
  2: "text-lime-600",
  3: "text-blue-600",
  4: "text-teal-600",
  5: "text-purple-600",
  6: "text-yellow-600",
} as const;

export function UserLevelText({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const level = getUserLevel(score);

  return (
    <span
      className={cn(
        "ml-1 inline-flex items-center gap-1 text-xs leading-none",
        LEVEL_TEXT_CLASSNAME[level.level],
        className,
      )}
    >
      <span aria-hidden>{level.icon}</span>
      <span>{level.label}</span>
    </span>
  );
}
