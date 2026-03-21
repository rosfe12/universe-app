import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/12 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-white/90 text-foreground",
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
