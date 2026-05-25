"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  MoreVertical,
  RefreshCw,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

type FileNode = {
  name: string;
  type: "folder" | "file";
  children?: FileNode[];
  language?: string;
};

type FileExplorerProps = {
  onSelect?: (file: string, path: string) => void;
  className?: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Convert flat file list from backend into a nested tree
function buildTree(files: { file_name: string; path: string; language: string }[]): FileNode[] {
  const root: FileNode[] = [];
  const dirMap: Record<string, FileNode> = {};

  files.forEach((f) => {
    // Normalize path separators
    const fullPath = f.path.replace(/\\/g, "/");
    const parts = fullPath.split("/").filter(Boolean);

    // Find the index where the repo name starts
    const repoIdx = parts.findIndex((p) => p === "repositories");
    const relevantParts = repoIdx >= 0 ? parts.slice(repoIdx + 2) : parts;

    if (relevantParts.length === 0) return;

    let currentLevel = root;
    let currentPath = "";

    relevantParts.forEach((part, i) => {
      currentPath += "/" + part;
      const isFile = i === relevantParts.length - 1;

      if (isFile) {
        currentLevel.push({
          name: f.file_name,
          type: "file",
          language: f.language,
        });
      } else {
        let dir = dirMap[currentPath];
        if (!dir) {
          dir = { name: part, type: "folder", children: [] };
          dirMap[currentPath] = dir;
          currentLevel.push(dir);
        }
        currentLevel = dir.children!;
      }
    });
  });

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
        onClick={() => onSelect?.(node.name, node.name)}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition hover:bg-surface-variant text-on-surface"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
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
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-on-surface hover:bg-surface-variant"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {open ? (
          <ChevronDown size={14} className="shrink-0 text-primary" />
        ) : (
          <ChevronRight size={14} className="shrink-0 text-on-surface-variant" />
        )}
        <Folder size={14} className="shrink-0 text-secondary" />
        <span className="truncate font-mono text-xs">{node.name}</span>
      </button>
      {open &&
        node.children?.map((child, i) => (
          <TreeNode key={`${child.name}-${i}`} node={child} depth={depth + 1} onSelect={onSelect} />
        ))}
    </div>
  );
}

export default function FileExplorer({ onSelect, className }: FileExplorerProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [repoName] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem("codemind_active_repo")
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchTree = async (name: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${BASE_URL}/scan-repo?repo_name=${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const files = data.files ?? [];
      if (files.length > 0) {
        setTree(buildTree(files));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repoName) queueMicrotask(() => fetchTree(repoName));
  }, [repoName]);

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen((o) => !o)}
        className="flex items-center gap-2 m-2 rounded-lg px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-variant lg:hidden"
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
            {repoName && (
              <p className="truncate font-mono text-xs text-primary mt-0.5">{repoName}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {repoName && (
              <button
                type="button"
                onClick={() => fetchTree(repoName)}
                disabled={loading}
                className="rounded p-1.5 text-on-surface-variant hover:text-primary transition"
                aria-label="Refresh"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded p-1.5 text-on-surface-variant hover:text-primary lg:hidden"
            >
              <ChevronDown size={14} />
            </button>
            <button
              type="button"
              className="hidden rounded p-1.5 text-on-surface-variant hover:text-primary lg:block"
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
          {error && (
            <p className="px-2 py-4 text-center text-xs text-tertiary">
              Could not load files. Make sure a repo is indexed.
            </p>
          )}
          {!loading && !error && tree.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-on-surface-variant">
              {repoName
                ? "No files found. Try re-indexing."
                : "No active repository. Add one in Repositories."}
            </p>
          )}
          {!loading &&
            tree.map((node, i) => (
              <TreeNode key={`${node.name}-${i}`} node={node} onSelect={onSelect} />
            ))}
        </motion.div>
      </section>
    </>
  );
}
