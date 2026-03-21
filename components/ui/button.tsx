import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[22px] border border-transparent text-sm font-semibold transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] text-primary-foreground shadow-[0_22px_44px_-22px_rgba(99,102,241,0.72)] hover:shadow-[0_26px_50px_-22px_rgba(99,102,241,0.82)]",
        secondary:
          "bg-secondary/95 text-secondary-foreground shadow-[0_12px_26px_-18px_rgba(15,23,42,0.2)] hover:bg-secondary",
        outline:
          "border-border bg-background/95 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.2)] hover:bg-accent hover:text-accent-foreground",
        ghost: "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_14px_28px_-18px_rgba(225,29,72,0.8)] hover:brightness-[0.98]",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6",
        icon: "h-11 w-11 rounded-[20px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
