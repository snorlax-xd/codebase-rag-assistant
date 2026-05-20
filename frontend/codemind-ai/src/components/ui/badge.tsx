import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
  {
    variants: {
      variant: {
        synced:
          "border-secondary/30 bg-secondary-container/20 text-secondary",
        indexing:
          "border-primary-container/40 bg-primary-container/20 text-primary",
        error:
          "border-tertiary-container/40 bg-tertiary-container/20 text-tertiary",
        optimal:
          "border-secondary/30 bg-secondary-container/20 text-secondary",
        critical:
          "border-tertiary-container/40 bg-tertiary-container/20 text-tertiary",
        muted:
          "border-outline-variant bg-surface-container-high text-on-surface-variant",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "synced" || variant === "optimal"
              ? "bg-secondary"
              : variant === "indexing"
                ? "bg-primary animate-pulse"
                : variant === "critical" || variant === "error"
                  ? "bg-tertiary"
                  : "bg-outline"
          )}
        />
      )}
      {children}
    </div>
  );
}
