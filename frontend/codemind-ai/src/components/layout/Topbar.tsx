"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  Menu,
  Settings,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { APP_NAME, DEFAULT_REPO } from "@/lib/constants/navigation";
import { easePremium } from "@/lib/motion/presets";
import { cn } from "@/lib/utils/cn";

type TopbarProps = {
  title?: string;
  showBrand?: boolean;
  showRepoPills?: boolean;
  showContextButton?: boolean;
  showRunAnalysis?: boolean;
  onRunAnalysis?: () => void;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
};

export default function Topbar({
  title,
  showBrand = false,
  showRepoPills = false,
  showContextButton = false,
  showRunAnalysis = false,
  onRunAnalysis,
  actions,
  onMenuClick,
}: TopbarProps) {
  const pathname = usePathname();
  const [activeRepo, setActiveRepo] = useState(DEFAULT_REPO);

  useEffect(() => {
    const syncActiveRepo = () => {
      const stored = localStorage.getItem("codemind_active_repo");
      setActiveRepo(stored || DEFAULT_REPO);
    };

    queueMicrotask(syncActiveRepo);
    window.addEventListener("codemind-active-repo-change", syncActiveRepo);

    return () => {
      window.removeEventListener("codemind-active-repo-change", syncActiveRepo);
    };
  }, [pathname]);

  return (
    <header className="topbar-glass sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between px-[var(--container-padding)]">
      <div className="flex items-center gap-4">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onMenuClick}
          className="rounded-lg p-2 text-primary transition hover:bg-surface-variant/50 lg:hidden"
          aria-label="Menu"
        >
          <Menu size={20} />
        </motion.button>
        {showBrand ? (
          <h1 className="font-display text-2xl font-bold text-primary">{APP_NAME}</h1>
        ) : (
          <motion.h1
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: easePremium }}
            className="font-display text-2xl font-bold text-primary"
          >
            {title}
          </motion.h1>
        )}
        {showRepoPills && (
          <div className="ml-4 hidden items-center gap-2 md:flex">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(128,131,255,0.15)" }}
              className="flex items-center gap-2 rounded-lg border border-outline-variant/80 bg-surface-container-highest/80 px-3 py-1.5 font-code-sm text-sm text-on-surface-variant backdrop-blur-sm transition hover:border-primary/50"
            >
              <Terminal size={16} className="text-secondary" />
              {activeRepo}
              <ChevronDown size={14} />
            </motion.button>
          </div>
        )}
        {!showRepoPills && !showBrand && title && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden items-center gap-2 rounded-full border border-outline-variant/70 bg-surface-container-highest/60 px-3 py-1 backdrop-blur-sm md:flex"
          >
            <Terminal size={14} className="text-secondary" />
            <span className="font-label-caps text-on-surface-variant">{activeRepo}</span>
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {actions}
        {showContextButton && (
          <Button
            variant="secondary"
            size="sm"
            className="hidden border-primary/20 shadow-[0_0_24px_rgba(128,131,255,0.12)] sm:flex"
          >
            <Zap size={16} className="fill-primary text-primary" />
            Right Contextual Intelligence
          </Button>
        )}
        {showRunAnalysis && (
          <Button
            variant="accent"
            size="sm"
            onClick={onRunAnalysis}
            className="shadow-[0_0_28px_rgba(128,131,255,0.35)]"
          >
            <Sparkles size={16} />
            RUN ANALYSIS
          </Button>
        )}
        {!showBrand && (
          <button
            type="button"
            className="hidden rounded-lg border border-outline-variant/70 px-3 py-1 font-label-caps text-on-surface-variant transition hover:border-primary/30 hover:bg-surface-variant/40 sm:block"
          >
            {activeRepo}
          </button>
        )}
        {showBrand && (
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 rounded-lg border border-outline-variant/70 px-3 py-1.5 font-label-caps text-on-surface-variant transition hover:border-primary/30 hover:bg-surface-variant/40"
            )}
          >
            <Terminal size={16} />
            {activeRepo}
          </button>
        )}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-lg p-2 text-on-surface-variant transition hover:bg-surface-variant/50 hover:text-primary"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </motion.button>
        {!showContextButton && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            className="rounded-lg p-2 text-on-surface-variant transition hover:bg-surface-variant/50 hover:text-primary"
            aria-label="Settings"
          >
            <Settings size={18} />
          </motion.button>
        )}
        <motion.div
          whileHover={{ scale: 1.06 }}
          className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-secondary-container text-xs font-bold text-on-primary-container shadow-[0_0_20px_rgba(128,131,255,0.35)]"
        >
          JD
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-secondary status-pulse" />
        </motion.div>
      </div>
    </header>
  );
}
