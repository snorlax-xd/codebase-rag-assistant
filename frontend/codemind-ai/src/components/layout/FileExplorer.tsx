"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  MoreVertical,
  RefreshCw,
  Terminal,
} from "lucide-react";

import type { ScannedFile } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import {
  getActiveRepo,
  loadStoredRepos,
  scanRepoWithAutoClone,
  setActiveRepo as setStoredActiveRepo,
  type StoredRepo,
} from "@/lib/utils/repositories";

type FileNode = {
  name: string;
  path: string;
  type: "folder" | "file";
  children?: FileNode[];
  language?: string;
};

type FileExplorerProps = {
  onSelect?: (file: string, path: string) => void;
  className?: string;
};

function relativeParts(file: ScannedFile): string[] {
  const fullPath = file.path.replace(/\\/g, "/");
  const parts = fullPath.split("/").filter(Boolean);
  const repoIndex = parts.findIndex((part) => part === "repositories");
  const relevant = repoIndex >= 0 ? parts.slice(repoIndex + 2) : parts;
  return relevant.length > 0 ? relevant : [file.file_name];
}

function buildTree(files: ScannedFile[]): FileNode[] {
  const root: FileNode[] = [];
  const dirMap = new Map<string, FileNode>();

  for (const file of files) {
    const parts = relativeParts(file);
    let currentLevel = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isFile) {
        currentLevel.push({
          name: file.file_name || part,
          path: currentPath,
          type: "file",
          language: file.language,
        });
        return;
      }

      let directory = dirMap.get(currentPath);
      if (!directory) {
        directory = {
          name: part,
          path: currentPath,
          type: "folder",
          children: [],
        };
        dirMap.set(currentPath, directory);
        currentLevel.push(directory);
      }

      currentLevel = directory.children ?? [];
    });
  }

  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => node.children && sortNodes(node.children));
  };

  sortNodes(root);
  return root;
}

function TreeNode({
  node,
  depth = 0,
  onSelect,
}: {
  node: FileNode;
  depth?: number;
  onSelect?: (file: string, path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);

  if (node.type === "file") {
    return (
      <button
        type="button"
        onClick={() => onSelect?.(node.name, node.path)}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-on-surface transition hover:bg-surface-variant"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        title={node.path}
      >
        <FileCode2 size={14} className="shrink-0 text-on-surface-variant" />
        <span className="truncate font-mono text-xs">{node.name}</span>
        {node.language && (
          <span className="ml-auto shrink-0 text-[10px] text-on-surface-variant">
            {node.language.slice(0, 2).toUpperCase()}
          </span>
        )}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-on-surface transition hover:bg-surface-variant"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        title={node.path}
      >
        {open ? (
          <ChevronDown size={14} className="shrink-0 text-primary" />
        ) : (
          <ChevronRight
            size={14}
            className="shrink-0 text-on-surface-variant"
          />
        )}
        <Folder size={14} className="shrink-0 text-secondary" />
        <span className="truncate font-mono text-xs">{node.name}</span>
      </button>

      {open &&
        node.children?.map((child) => (
          <TreeNode
            key={`${child.path}-${child.type}`}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

export default function FileExplorer({ onSelect, className }: FileExplorerProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [repos, setRepos] = useState<StoredRepo[]>([]);
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [repoName, setRepoName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedRepos = useMemo(
    () =>
      [...repos].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    [repos]
  );

  const fetchTree = useCallback(async (name: string) => {
    if (!name) {
      setTree([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const files = await scanRepoWithAutoClone(name);
      setTree(buildTree(files));
    } catch (err: unknown) {
      setTree([]);
      setError(
        err instanceof Error
          ? err.message
          : "Could not load files. Make sure this repository is added and indexed."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const syncRepo = () => {
      const active = getActiveRepo();
      setRepoName(active);
      setRepos(loadStoredRepos());
      if (active) fetchTree(active);
    };

    queueMicrotask(syncRepo);
    window.addEventListener("codemind-active-repo-change", syncRepo);
    window.addEventListener("storage", syncRepo);

    return () => {
      window.removeEventListener("codemind-active-repo-change", syncRepo);
      window.removeEventListener("storage", syncRepo);
    };
  }, [fetchTree]);

  const switchRepo = (name: string) => {
    setStoredActiveRepo(name);
    setRepoName(name);
    setRepoMenuOpen(false);
    fetchTree(name);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen((open) => !open)}
        className="m-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-variant lg:hidden"
      >
        <Folder size={16} />
        Explorer
      </button>

      <section
        className={cn(
          "w-72 shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest",
          panelOpen ? "flex" : "hidden",
          "lg:flex",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-outline-variant p-3">
          <div className="min-w-0">
            <h2 className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
              Explorer
            </h2>
            <p className="mt-0.5 truncate font-mono text-xs text-primary">
              {repoName || "no repo selected"}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setRepos(loadStoredRepos());
                  setRepoMenuOpen((open) => !open);
                }}
                className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-highest px-2 py-1 text-on-surface-variant transition hover:border-primary hover:text-primary"
                aria-label="Switch repository"
              >
                <Terminal size={12} />
                <ChevronDown
                  size={12}
                  className={repoMenuOpen ? "rotate-180 transition" : "transition"}
                />
              </button>

              {repoMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[55]"
                    onClick={() => setRepoMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-8 z-[60] w-56 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-2xl">
                    <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                      Repositories
                    </p>
                    {sortedRepos.length === 0 ? (
                      <p className="px-3 pb-3 text-xs text-on-surface-variant">
                        Add a repository first.
                      </p>
                    ) : (
                      sortedRepos.map((repo) => (
                        <button
                          key={repo.name}
                          type="button"
                          onClick={() => repo.name && switchRepo(repo.name)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-surface-variant",
                            repo.name === repoName
                              ? "text-primary"
                              : "text-on-surface"
                          )}
                        >
                          <Terminal size={13} />
                          <span className="truncate">{repo.name}</span>
                          {repo.name === repoName && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-secondary" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {repoName && (
              <button
                type="button"
                onClick={() => fetchTree(repoName)}
                disabled={loading}
                className="rounded p-1.5 text-on-surface-variant transition hover:text-primary disabled:opacity-50"
                aria-label="Refresh files"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded p-1.5 text-on-surface-variant hover:text-primary lg:hidden"
              aria-label="Collapse explorer"
            >
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              className="hidden rounded p-1.5 text-on-surface-variant hover:text-primary lg:block"
              aria-label="More explorer options"
            >
              <MoreVertical size={14} />
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 space-y-0.5 overflow-y-auto p-2"
        >
          {loading && (
            <p className="px-2 py-4 text-center text-xs text-on-surface-variant">
              Loading file tree...
            </p>
          )}

          {!loading && error && (
            <p className="px-2 py-4 text-center text-xs text-tertiary">
              {error}
            </p>
          )}

          {!loading && !error && tree.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-on-surface-variant">
              {repoName
                ? "No files found yet. Re-index this repository and refresh."
                : "Select a repository to browse files."}
            </p>
          )}

          {!loading &&
            !error &&
            tree.map((node) => (
              <TreeNode
                key={`${node.path}-${node.type}`}
                node={node}
                onSelect={onSelect}
              />
            ))}
        </motion.div>
      </section>
    </>
  );
}
