"use client";

import ArchitectureFlow from "@/components/features/ArchitectureFlow";
import AppShell from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const criticalPaths = [
  { name: "Data Ingestion Flow", status: "optimal" as const },
  {
    name: "Auth Circular Dependency",
    status: "critical" as const,
    detail: "Bidirectional link between auth-engine.ts and session-guard.ts",
  },
];

const clusters = [
  { label: "Identity & Access", color: "bg-primary" },
  { label: "Data Persistence", color: "bg-secondary" },
  { label: "API Gateways", color: "bg-tertiary" },
];

export default function ArchitecturePage() {
  return (
    <AppShell title="Architecture Graph" showRunAnalysis fullBleed>
      <div className="relative flex min-h-0 flex-1 grid-bg">
        <ArchitectureFlow />
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="pointer-events-auto absolute left-6 top-6 space-y-2">
            <GlassPanel className="min-w-[220px]">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-label-caps text-on-surface-variant">Engineering Metrics</span>
                <span className="h-2 w-2 rounded-full bg-secondary" />
              </div>
              <div className="space-y-3 font-code-sm text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Node Count</span>
                  <span className="font-bold text-primary">1,248</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Edge Density</span>
                  <span className="font-bold text-primary">0.42</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-on-surface-variant">Semantic Cohesion</span>
                  <div className="flex items-center gap-2">
                    <Progress value={88} className="w-16" glow />
                    <span className="font-bold text-secondary">88%</span>
                  </div>
                </div>
              </div>
            </GlassPanel>
            <div className="glass-panel flex items-center gap-2 rounded-lg px-3 py-2">
              <span className="font-code-sm text-xs uppercase text-on-surface-variant">Cluster View</span>
              <Badge variant="muted">SEMANTIC_MAP_V2</Badge>
            </div>
          </div>
          <div className="pointer-events-auto absolute right-6 top-6 w-72">
            <GlassPanel>
              <p className="mb-4 font-label-caps text-on-surface-variant">Critical Paths</p>
              <div className="space-y-4">
                {criticalPaths.map((path) => (
                  <div key={path.name}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-on-surface">{path.name}</span>
                      <Badge variant={path.status === "optimal" ? "optimal" : "critical"} dot>
                        {path.status === "optimal" ? "OPTIMAL" : "CRITICAL"}
                      </Badge>
                    </div>
                    {path.detail && <p className="mt-2 text-xs text-on-surface-variant">{path.detail}</p>}
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="sm" className="mt-4 w-full">+ RESCAN REPO</Button>
            </GlassPanel>
          </div>
          <div className="pointer-events-auto absolute bottom-6 left-6 w-56">
            <GlassPanel>
              <p className="mb-3 font-label-caps text-on-surface-variant">Vector Neighborhoods</p>
              <ul className="space-y-2">
                {clusters.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    <span className={`h-2 w-2 rounded-full ${c.color}`} />
                    {c.label}
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-label-caps text-[10px] text-on-surface-variant">Clustering Sensitivity</p>
              <input type="range" className="mt-2 w-full" defaultValue={60} />
            </GlassPanel>
          </div>
          <div className="pointer-events-auto absolute left-1/2 top-1/3 -translate-x-1/2">
            <div className="glass-panel rounded-lg border border-tertiary/40 px-3 py-2 text-center">
              <p className="font-label-caps text-[10px] text-tertiary">Hotspot Detected</p>
              <p className="font-code-sm text-sm text-on-surface">legacy-parser.cc (High Churn)</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
