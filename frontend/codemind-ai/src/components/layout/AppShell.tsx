"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

import AmbientLayer from "@/components/ambient/AmbientLayer";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { easePremium } from "@/lib/motion/presets";

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
  showBrand?: boolean;
  showRepoPills?: boolean;
  showContextButton?: boolean;
  showRunAnalysis?: boolean;
  topbarActions?: React.ReactNode;
  fullBleed?: boolean;
  hideSidebar?: boolean;
};

export default function AppShell({
  children,
  title,
  showBrand,
  showRepoPills,
  showContextButton,
  showRunAnalysis,
  topbarActions,
  fullBleed = false,
  hideSidebar = false,
}: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      <AmbientLayer />

      <div className="relative z-10 flex h-full flex-col">
        <Topbar
          title={title}
          showBrand={showBrand}
          showRepoPills={showRepoPills}
          showContextButton={showContextButton}
          showRunAnalysis={showRunAnalysis}
          actions={topbarActions}
          onMenuClick={() => setSidebarOpen((o) => !o)}
        />

        <div className="flex min-h-0 flex-1">
          {!hideSidebar && (
            <>
              {sidebarOpen && (
                <div
                  className="fixed inset-0 z-20 bg-black/40 lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}
              <div
                className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 lg:relative lg:translate-x-0 lg:block ${
                  sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                }`}
              >
                <Sidebar />
              </div>
            </>
          )}

          <AnimatePresence mode="wait">
            <motion.main
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35, ease: easePremium }}
              className={
                fullBleed
                  ? "relative flex min-w-0 flex-1 flex-col overflow-hidden"
                  : "relative min-w-0 flex-1 overflow-y-auto"
              }
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}