import { Info } from "lucide-react";

import { getUserLevel } from "@/lib/user-identity";
import { cn } from "@/lib/utils";

import { UserLevelText } from "./user-level-text";

export function ProfileCard({
  title,
  subtitle,
  score,
  description,
  className,
}: {
  title: string;
  subtitle?: string;
  score: number;
  description?: string;
  className?: string;
}) {
  const level = getUserLevel(score);

  return (
    <div className={cn("space-y-2 p-4 text-center", className)}>
      <div className="space-y-1">
        <p className="text-base font-semibold text-gray-900">{title}</p>
        {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      <div className="flex items-center justify-center gap-1.5">
        <UserLevelText score={score} className="ml-0 text-sm font-medium" />
        <span
          title={level.description}
          className="inline-flex h-4 w-4 items-center justify-center text-gray-400"
        >
          <Info className="h-3.5 w-3.5" />
        </span>
      </div>
      {description ? <p className="text-sm leading-6 text-gray-500">{description}</p> : null}
    </div>
  );
}
