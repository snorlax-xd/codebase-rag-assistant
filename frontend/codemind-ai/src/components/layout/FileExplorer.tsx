"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  MoreVertical,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

type FileNode = {
  name: string;
  type: "folder" | "file";
  children?: FileNode[];
  active?: boolean;
};

const TREE: FileNode[] = [
  {
    name: "src",
    type: "folder",
    children: [
      {
        name: "components",
        type: "folder",
        children: [
          { name: "SearchService.ts", type: "file", active: true },
          { name: "FileTree.tsx", type: "file" },
        ],
      },
      {
        name: "lib",
        type: "folder",
        children: [
          { name: "embeddings", type: "folder", children: [{ name: "Engine.ts", type: "file" }] },
        ],
      },
    ],
  },
  { name: "package.json", type: "file" },
  { name: "README.md", type: "file" },
];

type FileExplorerProps = {
  onSelect?: (file: string) => void;
  className?: string;
};

function TreeNode({
  node,
  depth = 0,
  onSelect,
}: {
  node: FileNode;
  depth?: number;
  onSelect?: (file: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);

  if (node.type === "file") {
    return (
      <button
        type="button"
        onClick={() => onSelect?.(node.name)}
        className={cn(
          "flex w-full items-center gap-2 rounded px-2 py-1.5 font-code-sm text-left transition",
          node.active
            ? "bg-surface-variant text-primary"
            : "text-on-surface hover:bg-surface-variant"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <FileCode2 size={14} className={node.active ? "text-primary" : "text-on-surface-variant"} />
        {node.name}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 font-code-sm text-on-surface hover:bg-surface-variant"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {open ? (
          <ChevronDown size={14} className="text-primary" />
        ) : (
          <ChevronRight size={14} className="text-on-surface-variant" />
        )}
        <Folder size={14} className="text-secondary" />
        {node.name}
      </button>
      {open &&
        node.children?.map((child) => (
          <TreeNode key={child.name} node={child} depth={depth + 1} onSelect={onSelect} />
        ))}
    </div>
  );
}

export default function FileExplorer({ onSelect, className }: FileExplorerProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle button — only visible below lg */}
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
        <div className="flex items-center justify-between border-b border-outline-variant p-4">
          <h2 className="font-label-caps text-on-surface-variant">Explorer</h2>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="text-on-surface-variant hover:text-primary lg:hidden"
          >
            <ChevronDown size={16} />
          </button>
          <button
            type="button"
            className="hidden text-on-surface-variant hover:text-primary lg:block"
          >
            <MoreVertical size={16} />
          </button>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 space-y-0.5 overflow-y-auto p-2"
        >
          {TREE.map((node) => (
            <TreeNode key={node.name} node={node} onSelect={onSelect} />
          ))}
        </motion.div>
      </section>
    </>
  );
}