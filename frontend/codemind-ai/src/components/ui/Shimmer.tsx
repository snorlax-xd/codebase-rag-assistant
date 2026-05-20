import { cn } from "@/lib/utils/cn";

export function ShimmerLine({ className }: { className?: string }) {
  return <div className={cn("shimmer-line h-1 rounded-full", className)} />;
}
