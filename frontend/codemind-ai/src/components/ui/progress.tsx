import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils/cn";

export function Progress({
  className,
  value,
  glow = false,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { glow?: boolean }) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-surface-variant",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full flex-1 bg-secondary transition-all",
          glow && "shadow-[0_0_8px_rgba(78,222,163,0.5)]"
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
