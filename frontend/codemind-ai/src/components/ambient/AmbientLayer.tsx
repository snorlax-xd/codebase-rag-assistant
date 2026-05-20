"use client";

import { motion } from "framer-motion";

import { glowPulse } from "@/lib/motion/presets";

type AmbientLayerProps = {
  intensity?: "subtle" | "medium";
};

export default function AmbientLayer({ intensity = "medium" }: AmbientLayerProps) {
  const opacity = intensity === "subtle" ? 0.35 : 0.5;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
    >
      <motion.div
        {...glowPulse}
        className="absolute -left-[20%] -top-[25%] h-[55vh] w-[55vh] rounded-full bg-cyan-400/20 blur-[120px]"
        style={{ opacity }}
      />
      <motion.div
        animate={{
          opacity: [0.25, 0.45, 0.25],
          x: [0, 20, 0],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -right-[15%] top-[10%] h-[50vh] w-[50vh] rounded-full bg-primary-container/25 blur-[130px]"
      />
      <motion.div
        animate={{
          opacity: [0.2, 0.38, 0.2],
          y: [0, -16, 0],
        }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-[-10%] left-[30%] h-[45vh] w-[45vh] rounded-full bg-secondary/15 blur-[110px]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(192,193,255,0.06),transparent_55%)]" />
      <div className="os-grid absolute inset-0 opacity-[0.45]" />
    </motion.div>
  );
}
