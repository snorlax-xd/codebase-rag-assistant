"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { UserCircle } from "lucide-react";

import { APP_NAME, PRIMARY_NAV } from "@/lib/constants/navigation";
import { easePremium } from "@/lib/motion/presets";
import { cn } from "@/lib/utils/cn";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative hidden h-full w-[var(--sidebar-width)] shrink-0 flex-col border-r border-outline-variant/60 bg-surface-container-low/80 py-4 backdrop-blur-xl lg:flex">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />

      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: easePremium }}
        className="mb-6 px-6"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.04 }}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-container shadow-[0_0_20px_rgba(78,222,163,0.25)]"
          >
            <UserCircle className="h-5 w-5 text-on-secondary-container" />
            <span className="absolute inset-0 rounded-lg ring-1 ring-white/10" />
          </motion.div>
          <div>
            <p className="font-display text-base font-bold tracking-tight text-on-surface">
              Lead Developer
            </p>
            <p className="text-xs text-on-surface-variant">Pro Plan</p>
          </div>
        </div>
      </motion.div>

      <nav className="flex flex-1 flex-col gap-1 px-2">
        {PRIMARY_NAV.map((item, i) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, ease: easePremium }}
                whileHover={{ x: 3, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-all duration-300",
                  isActive
                    ? "nav-active-glow bg-secondary-container font-bold text-on-secondary-container"
                    : "text-on-surface-variant hover:bg-surface-variant/60 hover:text-on-surface"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-glow"
                    className="absolute inset-0 rounded-lg bg-secondary/10"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
                <item.icon
                  size={20}
                  className={cn(
                    "relative z-10 shrink-0 transition-colors",
                    isActive ? "text-on-secondary-container" : "group-hover:text-secondary"
                  )}
                />
                <span className="relative z-10">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-auto border-t border-outline-variant/50 px-4 py-4"
      >
        <p className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg font-bold text-transparent">
          {APP_NAME}
        </p>
        <div className="glass-card mt-4 rounded-xl p-4">
          <p className="font-label-caps text-on-surface-variant">Token Usage</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-variant">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "65%" }}
              transition={{ duration: 1, delay: 0.5, ease: easePremium }}
              className="h-full bg-gradient-to-r from-secondary-container to-secondary shadow-[0_0_12px_rgba(78,222,163,0.5)]"
            />
          </div>
          <div className="mt-2 flex justify-between font-code-sm text-xs text-on-surface-variant">
            <span>650k / 1M</span>
            <span className="font-metric text-secondary">65%</span>
          </div>
        </div>
      </motion.div>
    </aside>
  );
}
