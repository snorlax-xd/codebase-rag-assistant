"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";

function nodeStyle(accent: "primary" | "secondary" | "tertiary", pulse = false) {
  const colors = {
    primary: { border: "#c0c1ff", glow: "rgba(192,193,255,0.45)", bg: "rgba(128,131,255,0.12)" },
    secondary: { border: "#4edea3", glow: "rgba(78,222,163,0.45)", bg: "rgba(78,222,163,0.1)" },
    tertiary: { border: "#ffb2b7", glow: "rgba(255,178,183,0.4)", bg: "rgba(255,81,106,0.1)" },
  };
  const c = colors[accent];
  return {
    padding: "10px 18px",
    borderRadius: 999,
    border: `1px solid ${c.border}`,
    background: `linear-gradient(145deg, ${c.bg}, rgba(20,20,20,0.92))`,
    color: "#e5e2e1",
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    boxShadow: `0 0 24px ${c.glow}, 0 4px 16px rgba(0,0,0,0.4)`,
    animation: pulse ? "node-breathe 3s ease-in-out infinite" : undefined,
  };
}

const ACCENT_FOR_LANGUAGE: Record<string, "primary" | "secondary" | "tertiary"> = {
  python: "primary",
  typescript: "primary",
  javascript: "primary",
  java: "secondary",
  go: "secondary",
  rust: "secondary",
  cpp: "tertiary",
  c: "tertiary",
};

const FALLBACK_NODES: Node[] = [
  { id: "auth", position: { x: 280, y: 120 }, data: { label: "auth-engine.ts" }, style: nodeStyle("primary", true) },
  { id: "db", position: { x: 480, y: 280 }, data: { label: "postgres-client.rs" }, style: nodeStyle("secondary") },
  { id: "parser", position: { x: 120, y: 320 }, data: { label: "semantic-parser.py" }, style: nodeStyle("primary") },
  { id: "legacy", position: { x: 640, y: 180 }, data: { label: "legacy-parser.cc" }, style: nodeStyle("tertiary", true) },
  { id: "api", position: { x: 380, y: 420 }, data: { label: "api-gateway.ts" }, style: nodeStyle("secondary") },
];

const FALLBACK_EDGES: Edge[] = [
  { id: "e1", source: "auth", target: "db", animated: true, style: { stroke: "#c0c1ff", strokeWidth: 2 } },
  { id: "e2", source: "parser", target: "auth", style: { stroke: "#4edea3", strokeWidth: 1.5, opacity: 0.7 } },
  { id: "e3", source: "db", target: "api", animated: true, style: { stroke: "#4edea3", strokeWidth: 2 } },
  { id: "e4", source: "legacy", target: "parser", style: { stroke: "#ffb2b7", strokeWidth: 1.5, opacity: 0.5 } },
];

function buildGraphFromFiles(files: { file_name: string; path: string; language: string; content: string }[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  // Build a map of filename -> id for edge creation
  const fileMap: Record<string, string> = {};
  files.forEach((f, i) => {
    const id = `node_${i}`;
    fileMap[f.file_name] = id;
  });

  files.slice(0, 20).forEach((f, i) => {
    const id = `node_${i}`;
    const lang = f.language?.toLowerCase() ?? "python";
    const accent = ACCENT_FOR_LANGUAGE[lang] ?? "primary";

    // Spread nodes in a grid layout
    const col = i % 5;
    const row = Math.floor(i / 5);

    nodes.push({
      id,
      position: { x: 150 + col * 220, y: 80 + row * 180 },
      data: { label: f.file_name },
      style: nodeStyle(accent),
    });

    // Create edges based on import detection in content
    if (f.content) {
      const importRegex = /(?:import|from|require)\s+['".]([^'".\s]+)/g;
      let match;
      while ((match = importRegex.exec(f.content)) !== null) {
        const importedName = match[1].split("/").pop() ?? "";
        // Find a file that matches this import
        const targetFile = files.find(
          (tf) =>
            tf.file_name.replace(/\.[^.]+$/, "") === importedName ||
            tf.file_name.startsWith(importedName)
        );
        if (targetFile && targetFile.file_name !== f.file_name) {
          const targetId = fileMap[targetFile.file_name];
          const edgeKey = `${id}-${targetId}`;
          if (targetId && !edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey);
            edges.push({
              id: edgeKey,
              source: id,
              target: targetId,
              animated: false,
              style: { stroke: "#4edea3", strokeWidth: 1.5, opacity: 0.6 },
            });
          }
        }
      }
    }
  });

  return { nodes, edges };
}

export default function ArchitectureFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(FALLBACK_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(FALLBACK_EDGES);
  const [loading, setLoading] = useState(false);
  const [repoName, setRepoName] = useState<string | null>(null);

  useEffect(() => {
    const activeRepo = localStorage.getItem("codemind_active_repo");
    if (!activeRepo) return;
    setRepoName(activeRepo);

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    setLoading(true);
    fetch(`${BASE_URL}/search?query=import&repo_name=${encodeURIComponent(activeRepo)}`)
      .then((r) => r.json())
      .then((data) => {
        const files = data.results ?? [];
        if (files.length === 0) return;
        const { nodes: newNodes, edges: newEdges } = buildGraphFromFiles(files);
        if (newNodes.length > 0) {
          setNodes(newNodes);
          setEdges(newEdges);
        }
      })
      .catch(() => {
        // silently fall back to demo nodes
      })
      .finally(() => setLoading(false));
  }, [setNodes, setEdges]);

  const defaultEdgeOptions = useMemo(
    () => ({ style: { strokeWidth: 1.5 }, type: "smoothstep" as const }),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...connection, animated: true, style: { stroke: "#4edea3", strokeWidth: 2 } },
          eds
        )
      ),
    [setEdges]
  );

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-outline-variant bg-surface-container-low px-4 py-1.5 font-mono text-xs text-on-surface-variant">
          Loading architecture for {repoName}...
        </div>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,rgba(192,193,255,0.08),transparent_50%),radial-gradient(ellipse_at_70%_60%,rgba(78,222,163,0.06),transparent_50%)]"
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background gap={28} size={1} color="rgba(255,255,255,0.035)" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const style = n.style as { border?: string } | undefined;
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