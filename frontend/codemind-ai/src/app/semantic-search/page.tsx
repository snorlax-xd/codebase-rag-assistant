"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Network, Search, Sparkles } from "lucide-react";
import Link from "next/link";

import AppShell from "@/components/layout/AppShell";
import FileExplorer from "@/components/layout/FileExplorer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SystemIndicator from "@/components/ui/SystemIndicator";
import { Card, GlassPanel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const results = [
  {
    file: "Engine.ts",
    path: "src/lib/embeddings/",
    score: 0.98,
    snippet: `export async function embedBatch(chunks: string[]) {\n  return model.encode(chunks, { dim: 1536 });\n}`,
  },
  {
    file: "SearchOverlay.tsx",
    path: "src/components/",
    score: 0.91,
    snippet: `function SemanticMatch({ query }: { query: string }) {\n  return vectorStore.search(query, { k: 50 });\n}`,
  },
];

const entities = [
  { name: "VectorStoreCluster", type: "Infrastructure Component", icon: "◈" },
  { name: "cosineSimilarity()", type: "Math Utility", icon: "Σ" },
];

export default function SemanticSearchPage() {
  const [query, setQuery] = useState("semantic code embedding lo");
  const [searching, setSearching] = useState(true);

  return (
    <AppShell title="CodeMind AI" showBrand fullBleed>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <FileExplorer />

        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-background p-[var(--container-padding)]">
          <div className="mx-auto w-full max-w-4xl space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-14 pl-12 pr-20 font-code-md text-base"
              />
              <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded border border-outline-variant px-2 py-0.5 font-code-sm text-xs text-on-surface-variant">
                ⌘ K
              </kbd>
            </div>

            {searching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap items-center gap-4"
              >
                <SystemIndicator label="Retrieving semantic vectors..." />
                <span className="font-code-sm text-on-surface-variant">k=50</span>
                <span className="font-code-sm text-on-surface-variant">p=0.8</span>
                <span className="font-code-sm text-on-surface-variant">@ tokens=4.2k</span>
              </motion.div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="font-code-sm text-sm text-on-surface-variant">
                4 RESULTS IN 12ms | 0.62 SEMANTIC SCORE
              </p>
              <div className="flex gap-2">
                <Button variant="neon" size="sm">
                  Semantic Match
                </Button>
                <Button variant="secondary" size="sm">
                  Latest Commit
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {results.map((r) => (
                <button
                  key={r.file}
                  type="button"
                  className="rounded border border-outline-variant bg-surface-container-high px-3 py-1 font-code-sm text-sm text-primary hover:border-primary"
                >
                  {r.file} {r.score.toFixed(2)}
                </button>
              ))}
            </div>

            <div className="mb-2 flex items-center gap-2">
              <span className="font-label-caps text-on-surface-variant">Semantic Match</span>
              <Progress value={62} glow className="max-w-xs flex-1" />
            </div>

            {results.map((hit, i) => (
              <motion.div
                key={hit.file}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="overflow-hidden hover:border-primary/40">
                  <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high px-4 py-2">
                    <div>
                      <span className="font-code-md font-bold text-on-surface">{hit.file}</span>
                      <span className="ml-2 font-code-sm text-on-surface-variant">{hit.path}</span>
                    </div>
                  </div>
                  <pre className="overflow-x-auto p-4 font-code-md text-sm leading-relaxed">
                    <code>
                      <span className="text-tertiary">export</span>{" "}
                      <span className="text-secondary">async function</span>{" "}
                      <span className="text-primary">embedBatch</span>
                      <span className="text-on-surface">(chunks: string[]) {"{"}</span>
                      {"\n  "}
                      <span className="text-on-surface-variant">return model.encode(chunks);</span>
                      {"\n}"}
                    </code>
                  </pre>
                </Card>
              </motion.div>
            ))}

            <Link href="/architecture">
              <Card className="group relative overflow-hidden p-0">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-container/20 to-secondary/10" />
                <div className="relative flex items-center justify-between p-6">
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">Explore Architecture</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Visualize your codebase dependencies and clusters.
                    </p>
                  </div>
                  <Network className="text-primary transition group-hover:scale-110" size={32} />
                </div>
              </Card>
            </Link>
          </div>
        </section>

        <aside className="hidden w-72 shrink-0 flex-col border-l border-outline-variant bg-surface-container-low p-4 lg:flex">
          <p className="font-label-caps text-on-surface-variant">Relevant Entities</p>
          <div className="mt-4 space-y-3">
            {entities.map((e) => (
              <Card key={e.name} className="flex items-start gap-3 p-3">
                <span className="text-xl text-primary">{e.icon}</span>
                <div>
                  <p className="font-code-md text-sm font-bold text-on-surface">{e.name}</p>
                  <p className="text-xs text-on-surface-variant">{e.type}</p>
                </div>
              </Card>
            ))}
          </div>
          <GlassPanel className="ai-insight-border mt-6">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Sparkles size={16} />
              <span className="font-label-caps">AI Insight</span>
            </div>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Your embedding logic uses OpenAI v3-small. Updating to v3-large might
              improve search precision for long-context queries.
            </p>
          </GlassPanel>
        </aside>
      </div>
    </AppShell>
  );
}
