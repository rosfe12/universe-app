import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTrustTier } from "@/lib/user-identity";

export function TrustScoreBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const tier = getTrustTier(score);

  return (
    <Badge
      variant={tier.variant}
      className={cn("gap-1.5 px-2.5 py-1 text-[11px] font-semibold", className)}
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      {tier.label} {score}
    </Badge>
  );
}
