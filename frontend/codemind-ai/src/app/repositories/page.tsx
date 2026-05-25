"use client";

import { useState } from "react";
import type { ElementType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Terminal,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cloneRepo, indexRepo } from "@/lib/api/client";

type RepoStatus = "synced" | "indexing" | "error" | "cloning";

type Repo = {
  name: string;
  url: string;
  status: RepoStatus;
  lastSync: string;
  progress?: number;
  error?: string;
  icon: ElementType;
};

type StoredRepo = Omit<Repo, "icon">;

const STORAGE_KEY = "codemind_repos";
const ACTIVE_REPO_KEY = "codemind_active_repo";

function isRepoStatus(value: unknown): value is RepoStatus {
  return value === "synced" || value === "indexing" || value === "error" || value === "cloning";
}

function isStoredRepo(value: unknown): value is StoredRepo {
  if (!value || typeof value !== "object") return false;
  const repo = value as Partial<StoredRepo>;

  return (
    typeof repo.name === "string" &&
    repo.name.trim().length > 0 &&
    typeof repo.url === "string" &&
    isRepoStatus(repo.status) &&
    typeof repo.lastSync === "string"
  );
}

function getRepoNameFromUrl(url: string): string | null {
  const trimmed = url.trim().replace(/\/+$/, "");
  const lastSegment = trimmed.split("/").pop();
  const repoName = lastSegment?.replace(/\.git$/i, "").trim();
  return repoName || null;
}

function setActiveRepo(repoName: string) {
  try {
    localStorage.setItem(ACTIVE_REPO_KEY, repoName);
    window.dispatchEvent(new CustomEvent("codemind-active-repo-change", { detail: repoName }));
  } catch {}
}

function loadRepos(): Repo[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isStoredRepo).map((repo) => ({
      ...repo,
      icon: Terminal,
    }));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveRepos(repos: Repo[]) {
  try {
    const serializable: StoredRepo[] = repos.map((repo) => ({
      name: repo.name,
      url: repo.url,
      status: repo.status,
      lastSync: repo.lastSync,
      progress: repo.progress,
      error: repo.error,
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {}
}

function isValidGitUrl(url: string): boolean {
  return (
    url.startsWith("https://github.com/") ||
    url.startsWith("https://gitlab.com/") ||
    url.startsWith("git@github.com:")
  );
}

export default function RepositoriesPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>(loadRepos);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<
    "idle" | "cloning" | "indexing" | "done" | "error"
  >("idle");
  const [modalError, setModalError] = useState<string | null>(null);
  const [reIndexing, setReIndexing] = useState<string | null>(null);

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      repo.url.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = () => {
    setModalOpen(true);
    setRepoUrl("");
    setUrlError(null);
    setModalStep("idle");
    setModalError(null);
  };

  const closeModal = () => {
    if (modalStep === "cloning" || modalStep === "indexing") return;
    setModalOpen(false);
  };

  const handleAddRepo = async () => {
    const url = repoUrl.trim();
    if (!url) return;

    if (!isValidGitUrl(url)) {
      setUrlError("Please enter a valid GitHub or GitLab HTTPS URL.");
      return;
    }

    const repoName = getRepoNameFromUrl(url);
    if (!repoName) {
      setUrlError("Could not determine the repository name from this URL.");
      return;
    }

    setUrlError(null);
    setModalStep("cloning");
    setModalError(null);

    try {
      await cloneRepo(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Clone failed";

      if (!msg.toLowerCase().includes("already_exists")) {
        setModalStep("error");
        setModalError(`Clone failed: ${msg}`);
        return;
      }
    }

    setModalStep("indexing");
    setActiveRepo(repoName);

    const newRepo: Repo = {
      name: repoName,
      url: url.replace("https://", ""),
      status: "indexing",
      lastSync: "Indexing...",
      icon: Terminal,
    };

    setRepos((prev) => {
      const exists = prev.some((repo) => repo.name === repoName);
      const updated = exists
        ? prev.map((repo) =>
            repo.name === repoName
              ? {
                  ...repo,
                  status: "indexing" as RepoStatus,
                  lastSync: "Indexing...",
                }
              : repo
          )
        : [...prev, newRepo];

      saveRepos(updated);
      return updated;
    });

    try {
      await indexRepo(repoName);
      setModalStep("done");

      setRepos((prev) => {
        const updated = prev.map((repo) =>
          repo.name === repoName
            ? {
                ...repo,
                status: "synced" as RepoStatus,
                lastSync: new Date().toLocaleString(),
              }
            : repo
        );

        saveRepos(updated);
        return updated;
      });

      setTimeout(() => {
        setModalOpen(false);
        setModalStep("idle");
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Indexing failed";
      setModalStep("error");
      setModalError(`Indexing started in background. Check back in a few minutes. (${msg})`);

      setRepos((prev) => {
        const updated = prev.map((repo) =>
          repo.name === repoName
            ? {
                ...repo,
                status: "indexing" as RepoStatus,
                lastSync: "Indexing in background...",
              }
            : repo
        );

        saveRepos(updated);
        return updated;
      });
    }
  };

  const handleReIndex = async (repo: Repo) => {
    if (reIndexing) return;

    setActiveRepo(repo.name);
    setReIndexing(repo.name);

    setRepos((prev) => {
      const updated = prev.map((item) =>
        item.name === repo.name
          ? {
              ...item,
              status: "indexing" as RepoStatus,
              lastSync: "Re-indexing...",
            }
          : item
      );

      saveRepos(updated);
      return updated;
    });

    try {
      await indexRepo(repo.name);

      setRepos((prev) => {
        const updated = prev.map((item) =>
          item.name === repo.name
            ? {
                ...item,
                status: "synced" as RepoStatus,
                lastSync: new Date().toLocaleString(),
              }
            : item
        );

        saveRepos(updated);
        return updated;
      });
    } catch {
      setRepos((prev) => {
        const updated = prev.map((item) =>
          item.name === repo.name
            ? {
                ...item,
                status: "indexing" as RepoStatus,
                lastSync: "Indexing in background...",
              }
            : item
        );

        saveRepos(updated);
        return updated;
      });
    } finally {
      setReIndexing(null);
    }
  };

  const openArchitecture = (repo: Repo) => {
    setActiveRepo(repo.name);
    router.push(`/architecture?repo=${encodeURIComponent(repo.name)}`);
  };

  return (
    <AppShell title="CodeMind AI" showBrand>
      <div className="relative mx-auto max-w-[var(--max-width-content,1200px)] space-y-8 p-[var(--container-padding)] pb-32">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-on-surface">
              Repositories
            </h2>
            <p className="mt-2 text-on-surface-variant">
              Manage your indexed codebases and AI context settings.
            </p>
          </div>

          <Button variant="primary" size="lg" onClick={openModal}>
            <Plus size={18} />
            Add Repository
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              size={18}
            />
            <Input
              placeholder="Search repositories..."
              className="pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {repos.length === 0 && (
          <p className="py-8 text-center text-sm text-on-surface-variant">
            No repositories added yet. Click Add Repository to get started.
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredRepos.map((repo, index) => (
            <motion.div
              key={repo.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <Card
                onClick={() => openArchitecture(repo)}
                className={`flex flex-col gap-4 p-6 transition hover:border-primary/40 ${
                  repo.status === "error" ? "border-l-2 border-l-tertiary" : ""
                } cursor-pointer`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                      <Terminal size={24} />
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-on-surface">
                        {repo.name}
                      </h3>
                      <p className="text-sm text-on-surface-variant">{repo.url}</p>
                    </div>
                  </div>

                  <Badge
                    variant={
                      repo.status === "synced"
                        ? "synced"
                        : repo.status === "indexing" || repo.status === "cloning"
                          ? "indexing"
                          : "error"
                    }
                    dot
                  >
                    {repo.status === "synced"
                      ? "Synced"
                      : repo.status === "indexing"
                        ? "Indexing"
                        : repo.status === "cloning"
                          ? "Cloning"
                          : "Error"}
                  </Badge>
                </div>

                {(repo.status === "indexing" || repo.status === "cloning") && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-xs text-on-surface-variant">
                      <span>PROGRESS</span>
                      <span>{repo.progress ?? 0}%</span>
                    </div>
                    <Progress value={repo.progress ?? 0} />
                  </div>
                )}

                {repo.status === "error" && repo.error && (
                  <div className="rounded-lg border border-tertiary-container/30 bg-tertiary-container/10 p-3 font-mono text-sm text-tertiary">
                    {repo.error}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-outline-variant/30 pt-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                      {repo.status === "error" ? "Last Attempt" : "Last Sync"}
                    </p>
                    <p className="font-mono text-sm text-on-surface">
                      {repo.lastSync}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleReIndex(repo);
                    }}
                    disabled={reIndexing === repo.name || repo.status === "indexing"}
                  >
                    {reIndexing === repo.name ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    RE-INDEX
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card
          className="flex cursor-pointer flex-col items-center justify-center border-dashed p-16 text-center transition hover:border-primary/40"
          onClick={openModal}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high">
            <CloudUpload className="text-primary" size={26} />
          </div>

          <h3 className="text-lg font-bold text-on-surface">
            Connect New Codebase
          </h3>

          <p className="mt-2 max-w-md text-sm text-on-surface-variant">
            Increase CodeMind intelligence by indexing more projects. Supports
            GitHub, GitLab, and local SSH remotes.
          </p>
        </Card>

        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={openModal}
          className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-[0_0_32px_rgba(128,131,255,0.45)]"
          aria-label="Add repository"
        >
          <Plus size={24} className="text-on-primary" />
        </motion.button>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-low p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-on-surface">
                    Add Repository
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Enter a GitHub or GitLab HTTPS URL.
                  </p>
                </div>

                {modalStep !== "cloning" && modalStep !== "indexing" && (
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-variant"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {modalStep === "idle" && (
                <>
                  <div className="mb-4">
                    <label className="mb-1.5 block text-sm font-medium text-on-surface">
                      Repository URL
                    </label>
                    <Input
                      placeholder="https://github.com/owner/repo"
                      value={repoUrl}
                      onChange={(event) => {
                        setRepoUrl(event.target.value);
                        setUrlError(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleAddRepo();
                      }}
                      autoFocus
                    />
                    {urlError && (
                      <p className="mt-1.5 text-xs text-tertiary">{urlError}</p>
                    )}
                  </div>

                  {modalError && (
                    <p className="mb-4 rounded-lg border border-tertiary-container/30 bg-tertiary-container/10 p-3 font-mono text-sm text-tertiary">
                      {modalError}
                    </p>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleAddRepo}
                      disabled={!repoUrl.trim()}
                    >
                      Clone & Index
                    </Button>
                  </div>
                </>
              )}

              {modalStep === "cloning" && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p className="text-sm font-medium text-on-surface">
                    Cloning repository...
                  </p>
                  <p className="text-xs text-on-surface-variant">{repoUrl}</p>
                </div>
              )}

              {modalStep === "indexing" && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <Loader2 size={32} className="animate-spin text-secondary" />
                  <p className="text-sm font-medium text-on-surface">
                    Indexing started in background...
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    This may take 10-20 minutes for large repos. The repo card
                    will update when done.
                  </p>
                </div>
              )}

              {modalStep === "done" && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <CheckCircle2 size={32} className="text-secondary" />
                  <p className="text-sm font-medium text-on-surface">
                    Repository added successfully!
                  </p>
                </div>
              )}

              {modalStep === "error" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3 rounded-lg border border-tertiary-container/30 bg-tertiary-container/10 p-3">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-tertiary"
                    />
                    <p className="font-mono text-sm text-tertiary">
                      {modalError}
                    </p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setModalStep("idle");
                        setModalError(null);
                      }}
                    >
                      Try Again
                    </Button>
                    <Button variant="primary" onClick={closeModal}>
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
