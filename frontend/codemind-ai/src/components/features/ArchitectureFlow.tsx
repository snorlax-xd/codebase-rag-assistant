"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";

import type { ScannedFile } from "@/lib/api/client";

type ArchitectureFlowProps = {
  files: ScannedFile[];
  repoName: string | null;
  loading?: boolean;
  error?: string | null;
};

const MAX_FILES = 40;
const MAX_DIRECTORIES = 10;

function nodeStyle(accent: "primary" | "secondary" | "tertiary", directory = false) {
  const colors = {
    primary: { border: "#c0c1ff", glow: "rgba(192,193,255,0.35)", bg: "rgba(128,131,255,0.12)" },
    secondary: { border: "#4edea3", glow: "rgba(78,222,163,0.35)", bg: "rgba(78,222,163,0.1)" },
    tertiary: { border: "#ffb2b7", glow: "rgba(255,178,183,0.3)", bg: "rgba(255,81,106,0.1)" },
  };
  const color = colors[accent];

  return {
    padding: directory ? "12px 18px" : "10px 16px",
    borderRadius: directory ? 12 : 999,
    border: `1px solid ${color.border}`,
    background: `linear-gradient(145deg, ${color.bg}, rgba(20,20,20,0.92))`,
    color: "#e5e2e1",
    fontSize: directory ? 13 : 12,
    fontFamily: "var(--font-mono)",
    boxShadow: `0 0 22px ${color.glow}, 0 4px 16px rgba(0,0,0,0.36)`,
  };
}

function accentForLanguage(language: string): "primary" | "secondary" | "tertiary" {
  const lang = language.toLowerCase();
  if (["java", "go", "rust", "python"].includes(lang)) return "secondary";
  if (["c", "cpp", "c++"].includes(lang)) return "tertiary";
  return "primary";
}

function relativePath(file: ScannedFile): string {
  const normalized = file.path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const repoMarkerIndex = parts.findIndex((part) => part === "repositories");

  if (repoMarkerIndex >= 0) {
    return parts.slice(repoMarkerIndex + 2).join("/") || file.file_name;
  }

  return parts.slice(-3).join("/") || file.file_name;
}

function topDirectory(file: ScannedFile): string {
  const rel = relativePath(file);
  const first = rel.split("/").filter(Boolean)[0];
  return first && first !== file.file_name ? first : "root";
}

function importCandidates(content: string): string[] {
  const matches = new Set<string>();
  const patterns = [
    /(?:import|from)\s+["']?([@\w./-]+)["']?/g,
    /require\(["']([@\w./-]+)["']\)/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const lastSegment = match[1].split("/").pop()?.replace(/\.[^.]+$/, "");
      if (lastSegment) matches.add(lastSegment);
    }
  }

  return Array.from(matches);
}

function buildGraph(files: ScannedFile[]) {
  const visibleFiles = files.slice(0, MAX_FILES);
  const directoryNames = Array.from(new Set(visibleFiles.map(topDirectory))).slice(0, MAX_DIRECTORIES);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  directoryNames.forEach((directory, index) => {
    nodes.push({
      id: `dir:${directory}`,
      position: { x: 80 + (index % 5) * 260, y: 40 + Math.floor(index / 5) * 220 },
      data: { label: directory },
      style: nodeStyle("secondary", true),
    });
  });

  const fileIdByStem = new Map<string, string>();
  visibleFiles.forEach((file, index) => {
    const id = `file:${index}`;
    const stem = file.file_name.replace(/\.[^.]+$/, "");
    fileIdByStem.set(stem, id);
  });

  visibleFiles.forEach((file, index) => {
    const directory = topDirectory(file);
    const id = `file:${index}`;
    const col = index % 6;
    const row = Math.floor(index / 6);

    nodes.push({
      id,
      position: { x: 120 + col * 210, y: 180 + row * 150 },
      data: { label: file.file_name },
      style: nodeStyle(accentForLanguage(file.language)),
    });

    const directoryEdge = `dir:${directory}->${id}`;
    if (directoryNames.includes(directory) && !edgeSet.has(directoryEdge)) {
      edgeSet.add(directoryEdge);
      edges.push({
        id: directoryEdge,
        source: `dir:${directory}`,
        target: id,
        style: { stroke: "#4edea3", strokeWidth: 1.3, opacity: 0.45 },
      });
    }

    for (const candidate of importCandidates(file.content ?? "")) {
      const targetId = fileIdByStem.get(candidate);
      if (!targetId || targetId === id) continue;

      const importEdge = `${id}->${targetId}`;
      if (edgeSet.has(importEdge)) continue;
      edgeSet.add(importEdge);
      edges.push({
        id: importEdge,
        source: id,
        target: targetId,
        animated: true,
        style: { stroke: "#c0c1ff", strokeWidth: 1.6, opacity: 0.72 },
      });
    }
  });

  return { nodes, edges };
}

export default function ArchitectureFlow({
  files,
  repoName,
  loading = false,
  error = null,
}: ArchitectureFlowProps) {
  const { nodes, edges } = useMemo(() => buildGraph(files), [files]);

  return (
    <div className="relative h-full w-full">
      {(loading || error || !repoName || files.length === 0) && (
        <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-outline-variant bg-surface-container-low px-4 py-1.5 font-mono text-xs text-on-surface-variant">
          {loading
            ? `Loading architecture for ${repoName}...`
            : error
              ? error
              : repoName
                ? "No scanned files found for this repository."
                : "Select a repository to generate its architecture."}
        </div>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,rgba(192,193,255,0.08),transparent_50%),radial-gradient(ellipse_at_70%_60%,rgba(78,222,163,0.06),transparent_50%)]"
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        defaultEdgeOptions={{ type: "smoothstep", style: { strokeWidth: 1.5 } }}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background gap={28} size={1} color="rgba(255,255,255,0.035)" />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const style = node.style as { border?: string } | undefined;
            if (style?.border?.includes("#ffb2b7")) return "#ffb2b7";
            if (style?.border?.includes("#4edea3")) return "#4edea3";
            return "#c0c1ff";
          }}
          maskColor="rgba(10, 10, 10, 0.85)"
          className="!rounded-lg !border-outline-variant/80 !shadow-[0_0_24px_rgba(0,0,0,0.5)]"
        />
      </ReactFlow>
    </div>
  );
}
