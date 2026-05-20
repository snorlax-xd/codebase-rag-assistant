import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-on-primary hover:opacity-90 shadow-[0_0_20px_rgba(128,131,255,0.25)] hover:shadow-[0_0_32px_rgba(128,131,255,0.4)]",
        secondary:
          "bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-variant",
        ghost:
          "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface",
        accent:
          "bg-primary-container text-on-primary-container hover:opacity-90 shadow-[0_0_24px_rgba(128,131,255,0.3)] hover:shadow-[0_0_36px_rgba(128,131,255,0.45)]",
        neon:
          "bg-secondary-container text-on-secondary-container hover:brightness-110",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
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
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
