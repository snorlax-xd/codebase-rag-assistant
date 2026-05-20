"use client";

import { useCallback, useMemo } from "react";
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

const initialNodes: Node[] = [
  {
    id: "auth",
    position: { x: 280, y: 120 },
    data: { label: "auth-engine.ts" },
    style: nodeStyle("primary", true),
  },
  {
    id: "db",
    position: { x: 480, y: 280 },
    data: { label: "postgres-client.rs" },
    style: nodeStyle("secondary"),
  },
  {
    id: "parser",
    position: { x: 120, y: 320 },
    data: { label: "semantic-parser.py" },
    style: nodeStyle("primary"),
  },
  {
    id: "legacy",
    position: { x: 640, y: 180 },
    data: { label: "legacy-parser.cc" },
    style: nodeStyle("tertiary", true),
  },
  {
    id: "api",
    position: { x: 380, y: 420 },
    data: { label: "api-gateway.ts" },
    style: nodeStyle("secondary"),
  },
];

const initialEdges: Edge[] = [
  {
    id: "e1",
    source: "auth",
    target: "db",
    animated: true,
    style: { stroke: "#c0c1ff", strokeWidth: 2 },
  },
  {
    id: "e2",
    source: "parser",
    target: "auth",
    style: { stroke: "#4edea3", strokeWidth: 1.5, opacity: 0.7 },
  },
  {
    id: "e3",
    source: "db",
    target: "api",
    animated: true,
    style: { stroke: "#4edea3", strokeWidth: 2 },
  },
  {
    id: "e4",
    source: "legacy",
    target: "parser",
    style: { stroke: "#ffb2b7", strokeWidth: 1.5, opacity: 0.5 },
  },
];

export default function ArchitectureFlow() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const defaultEdgeOptions = useMemo(
    () => ({
      style: { strokeWidth: 1.5 },
      type: "smoothstep" as const,
    }),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "#4edea3", strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  return (
    <div className="relative h-full w-full">
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
            const id = n.id;
            if (id === "legacy") return "#ffb2b7";
            if (id === "db" || id === "api") return "#4edea3";
            return "#c0c1ff";
          }}
          maskColor="rgba(10, 10, 10, 0.85)"
          className="!rounded-lg !border-outline-variant/80 !shadow-[0_0_24px_rgba(0,0,0,0.5)]"
        />
      </ReactFlow>
    </div>
  );
}