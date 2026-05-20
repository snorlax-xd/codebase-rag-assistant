"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils/cn";

type SystemIndicatorProps = {
  label: string;
  active?: boolean;
  variant?: "secondary" | "primary" | "tertiary";
  className?: string;
  meta?: string;
};

const dotColors = {
  secondary: "bg-secondary shadow-[0_0_10px_rgba(78,222,163,0.7)]",
  primary: "bg-primary shadow-[0_0_10px_rgba(192,193,255,0.7)]",
  tertiary: "bg-tertiary shadow-[0_0_10px_rgba(255,178,183,0.5)]",
};

export default function SystemIndicator({
  label,
  active = true,
  variant = "secondary",
  className,
  meta,
}: SystemIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("flex flex-wrap items-center gap-2 font-code-sm text-xs", className)}
    >
      {active && (
        <motion.span
          animate={{ opacity: [1, 0.45, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])}
        />
      )}
      <span
        className={cn(
          "font-semibold tracking-wide",
          variant === "secondary" && "text-secondary",
          variant === "primary" && "text-primary",
          variant === "tertiary" && "text-tertiary"
        )}
      >
        {label}
      </span>
      {meta && <span className="text-on-surface-variant">{meta}</span>}
    </motion.div>
  );
}
