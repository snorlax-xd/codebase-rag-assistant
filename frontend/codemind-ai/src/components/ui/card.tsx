"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { easePremium } from "@/lib/motion/presets";
import { cn } from "@/lib/utils/cn";

export function Card({
  className,
  children,
  hover = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        "glass-card rounded-xl",
        hover && "hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function GlassPanel({
  className,
  children,
  animate = true,
}: {
  className?: string;
  children: React.ReactNode;
  animate?: boolean;
}) {
  const classes = cn("glass-panel rounded-xl p-4", className);

  if (!animate) {
    return <div className={classes}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easePremium }}
      whileHover={{ y: -1 }}
      className={classes}
    >
      {children}
    </motion.div>
  );
}
