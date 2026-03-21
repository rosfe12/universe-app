import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[24px] border border-transparent text-sm font-semibold transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,#3730a3_0%,#4f46e5_38%,#7c3aed_100%)] text-primary-foreground shadow-[0_24px_48px_-24px_rgba(79,70,229,0.72)] hover:shadow-[0_30px_58px_-24px_rgba(79,70,229,0.82)]",
        secondary:
          "bg-[linear-gradient(180deg,rgba(243,244,255,0.96),rgba(236,239,255,0.96))] text-secondary-foreground shadow-[0_14px_28px_-20px_rgba(30,41,59,0.18)] hover:bg-secondary",
        outline:
          "border-border/90 bg-background/95 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.18)] hover:bg-accent hover:text-accent-foreground",
        ghost: "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_14px_28px_-18px_rgba(225,29,72,0.8)] hover:brightness-[0.98]",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6",
        icon: "h-11 w-11 rounded-[22px]",
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
