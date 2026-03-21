import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[linear-gradient(135deg,rgba(79,70,229,0.14),rgba(124,58,237,0.14))] text-primary",
        secondary: "border-transparent bg-[linear-gradient(180deg,rgba(238,242,255,0.96),rgba(233,236,255,0.96))] text-secondary-foreground",
        outline: "border-border/90 bg-white/92 text-foreground",
        success: "border-transparent bg-emerald-500/14 text-emerald-700",
        warning: "border-transparent bg-amber-500/14 text-amber-700",
        danger: "border-transparent bg-rose-500/14 text-rose-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
