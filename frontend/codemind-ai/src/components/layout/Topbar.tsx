"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  FileCode2,
  Menu,
  Settings,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { APP_NAME, DEFAULT_REPO } from "@/lib/constants/navigation";
import { scanRepo, type ScannedFile } from "@/lib/api/client";
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

type StoredRepo = {
  name?: string;
  url?: string;
};

const ACTIVE_REPO_KEY = "codemind_active_repo";
const REPOS_KEY = "codemind_repos";

function loadStoredRepos(): StoredRepo[] {
  try {
    const raw = localStorage.getItem(REPOS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (repo: StoredRepo) =>
            typeof repo.name === "string" && repo.name
        )
      : [];
  } catch {
    return [];
  }
}

export function setStoredActiveRepo(repoName: string) {
  localStorage.setItem(ACTIVE_REPO_KEY, repoName);
  window.dispatchEvent(
    new CustomEvent("codemind-active-repo-change", { detail: repoName })
  );
}

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
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [repos, setRepos] = useState<StoredRepo[]>([]);
  const [repoFiles, setRepoFiles] = useState<ScannedFile[]>([]);

  // ── Sync active repo from localStorage and listen for changes ──
  useEffect(() => {
    const syncActiveRepo = () => {
      const stored = localStorage.getItem(ACTIVE_REPO_KEY);
      setActiveRepo(stored || DEFAULT_REPO);
      setRepos(loadStoredRepos());
    };

    queueMicrotask(syncActiveRepo);
    window.addEventListener("codemind-active-repo-change", syncActiveRepo);
    // Also sync when storage is changed from another tab/page
    window.addEventListener("storage", syncActiveRepo);

    return () => {
      window.removeEventListener("codemind-active-repo-change", syncActiveRepo);
      window.removeEventListener("storage", syncActiveRepo);
    };
  }, [pathname]);

  // ── Fetch files for the active repo when dropdown opens ──
  useEffect(() => {
    if (!repoMenuOpen) return;
    const currentRepo = localStorage.getItem(ACTIVE_REPO_KEY);
    if (!currentRepo || currentRepo === DEFAULT_REPO) return;

    (async () => {
      try {
        const data = await scanRepo(currentRepo);
        setRepoFiles((data.files ?? []).slice(0, 8));
      } catch {
        setRepoFiles([]);
      }
    })();
  }, [repoMenuOpen]);

  // ── Selecting a repo: ONLY updates active repo, does NOT navigate ──
  const handleRepoSelect = (repoName: string) => {
    setStoredActiveRepo(repoName);
    setActiveRepo(repoName);
    setRepoFiles([]); // reset files so they reload for new repo
    setRepoMenuOpen(false);
  };

  // ── Clicking a file: prefills chat and navigates to chat ──
  const handleFileSelect = (file: ScannedFile) => {
    localStorage.setItem(
      "codemind_prefill_query",
      `Explain ${file.file_name} in ${activeRepo}`
    );
    setRepoMenuOpen(false);
    window.location.href = "/chat";
  };

  const repoButton = (
    <div className="relative">
      <motion.button
        type="button"
        whileHover={{
          scale: 1.02,
          boxShadow: "0 0 20px rgba(128,131,255,0.15)",
        }}
        onClick={() => setRepoMenuOpen((open) => !open)}
        className="flex items-center gap-2 rounded-lg border border-outline-variant/80 bg-surface-container-highest/80 px-3 py-1.5 font-code-sm text-sm text-on-surface-variant backdrop-blur-sm transition hover:border-primary/50"
      >
        <Terminal size={16} className="text-secondary" />
        <span className="max-w-40 truncate">{activeRepo}</span>
        <ChevronDown
          size={14}
          className={repoMenuOpen ? "rotate-180 transition" : "transition"}
        />
      </motion.button>

      {repoMenuOpen && (
        <>
          {/* Backdrop to close menu on outside click */}
          <div
            className="fixed inset-0 z-[55]"
            onClick={() => setRepoMenuOpen(false)}
          />
          <div className="absolute left-0 top-11 z-[60] w-72 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-2xl">
            <div className="border-b border-outline-variant/60 p-2">
              <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                Switch Repository
              </p>
              {repos.length === 0 ? (
                <p className="px-2 py-2 text-xs text-on-surface-variant">
                  No repositories added yet.
                </p>
              ) : (
                repos.map((repo) => (
                  <button
                    key={repo.name}
                    type="button"
                    onClick={() => handleRepoSelect(repo.name!)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-surface-variant",
                      repo.name === activeRepo
                        ? "text-primary"
                        : "text-on-surface"
                    )}
                  >
                    <Terminal size={14} />
                    <span className="truncate">{repo.name}</span>
                    {repo.name === activeRepo && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-secondary" />
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                Files in {activeRepo}
              </p>
              {repoFiles.length === 0 ? (
                <p className="px-2 py-2 text-xs text-on-surface-variant">
                  Loading files...
                </p>
              ) : (
                repoFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => handleFileSelect(file)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-on-surface-variant transition hover:bg-surface-variant hover:text-on-surface"
                  >
                    <FileCode2 size={13} />
                    <span className="truncate">{file.file_name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

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
          <h1 className="font-display text-2xl font-bold text-primary">
            {APP_NAME}
          </h1>
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

        {/* Repo pill always shown next to title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hidden md:flex"
        >
          {repoButton}
        </motion.div>
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