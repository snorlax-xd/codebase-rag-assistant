"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Network, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import FileExplorer from "@/components/layout/FileExplorer";
import { Button } from "@/components/ui/button";
import SystemIndicator from "@/components/ui/SystemIndicator";
import { Card, GlassPanel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { searchCode } from "@/lib/api/client";

type SearchResult = {
  file_name: string;
  path: string;
  score: number;
  content: string;
  language: string;
};

export default function SemanticSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setError(null);
    setSearched(false);
    try {
      const activeRepo = localStorage.getItem("codemind_active_repo");
      const data = await searchCode(q.trim(), activeRepo);
      setResults(data.results ?? []);
      setSearched(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") runSearch(query);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    setError(null);
  };

  const askAbout = (result: SearchResult) => {
    const q = `Explain this code from ${result.file_name}:\n\n${result.content.slice(0, 300)}`;
    localStorage.setItem("codemind_prefill_query", q);
    router.push("/chat");
  };

  const topScore = results.length > 0 ? results[0].score : 0;

  return (
    <AppShell title="CodeMind AI" showBrand fullBleed>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <FileExplorer
          onSelect={(file) => {
            setQuery(file);
            runSearch(file);
          }}
        />

        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-background p-[var(--container-padding)]">
          <div className="mx-auto w-full max-w-4xl space-y-6">

            {/* Search bar */}
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                size={20}
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search your codebase semantically..."
                className="h-14 pl-12 pr-24 text-base"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                {query && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="rounded p-1 text-on-surface-variant hover:text-on-surface"
                  >
                    <X size={16} />
                  </button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => runSearch(query)}
                  disabled={searching || !query.trim()}
                >
                  Search
                </Button>
              </div>
            </div>

            {/* Status row */}
            {searching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap items-center gap-4"
              >
                <SystemIndicator label="Retrieving semantic vectors..." />
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-tertiary-container/30 bg-tertiary-container/10 p-4 font-mono text-sm text-tertiary">
                {error}
              </div>
            )}

            {/* Results summary */}
            {searched && !searching && (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="font-mono text-sm text-on-surface-variant">
                  {results.length} RESULTS
                  {results.length > 0 && ` | TOP SCORE: ${topScore.toFixed(3)}`}
                </p>
                {results.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm">Semantic Match</Button>
                    <Button variant="secondary" size="sm">Latest Commit</Button>
                  </div>
                )}
              </div>
            )}

            {/* File pills */}
            {results.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {results.map((r) => (
                  <button
                    key={r.file_name}
                    type="button"
                    className="rounded border border-outline-variant bg-surface-container-high px-3 py-1 font-mono text-sm text-primary hover:border-primary transition"
                  >
                    {r.file_name}{" "}
                    <span className="text-on-surface-variant">{r.score.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Score bar */}
            {results.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-on-surface-variant whitespace-nowrap">
                  SEMANTIC SCORE
                </span>
                <Progress value={Math.round(topScore * 100)} className="flex-1" />
                <span className="font-mono text-xs text-primary">
                  {(topScore * 100).toFixed(0)}%
                </span>
              </div>
            )}

            {/* Result cards */}
            {results.map((hit, i) => (
              <motion.div
                key={`${hit.file_name}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="overflow-hidden hover:border-primary/40 transition">
                  <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high px-4 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-on-surface truncate">
                        {hit.file_name}
                      </span>
                      {hit.path && (
                        <span className="font-mono text-xs text-on-surface-variant truncate">
                          {hit.path}
                        </span>
                      )}
                      <span className="shrink-0 rounded bg-surface-variant px-1.5 py-0.5 font-mono text-xs text-on-surface-variant">
                        {hit.language}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 ml-4">
                      <span className="font-mono text-xs text-primary">
                        {hit.score.toFixed(3)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => askAbout(hit)}
                      >
                        <Sparkles size={14} />
                        Ask AI
                      </Button>
                    </div>
                  </div>
                  <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-on-surface-variant max-h-48">
                    {hit.content}
                  </pre>
                </Card>
              </motion.div>
            ))}

            {/* Empty state */}
            {searched && results.length === 0 && !searching && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Search size={32} className="text-on-surface-variant" />
                <p className="text-lg font-medium text-on-surface">No results found</p>
                <p className="text-sm text-on-surface-variant">
                  Try different keywords or make sure a repository is indexed first.
                </p>
              </div>
            )}

            {/* Architecture CTA */}
            <Link href="/architecture">
              <Card className="group relative overflow-hidden p-0 hover:border-primary/40 transition cursor-pointer">
                <div className="relative flex items-center justify-between p-6">
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">Explore Architecture</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Visualize your codebase dependencies and clusters.
                    </p>
                  </div>
                  <Network
                    className="text-primary transition group-hover:scale-110"
                    size={32}
                  />
                </div>
              </Card>
            </Link>
          </div>
        </section>

        {/* Right panel */}
        <aside className="hidden w-72 shrink-0 flex-col border-l border-outline-variant bg-surface-container-low p-4 lg:flex">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-on-surface-variant">
            Relevant Entities
          </p>
          <div className="mt-4 space-y-3">
            {results.slice(0, 3).map((r, i) => (
              <Card key={i} className="flex items-start gap-3 p-3">
                <span className="font-mono text-lg text-primary">▣</span>
                <div>
                  <p className="font-mono text-sm font-bold text-on-surface truncate">
                    {r.file_name}
                  </p>
                  <p className="text-xs text-on-surface-variant">{r.language}</p>
                </div>
              </Card>
            ))}
            {results.length === 0 && (
              <p className="text-xs text-on-surface-variant">
                Run a search to see relevant entities here.
              </p>
            )}
          </div>

          <GlassPanel className="mt-6">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Sparkles size={16} />
              <span className="font-mono text-xs uppercase tracking-widest">AI Insight</span>
            </div>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              {results.length > 0
                ? `Found ${results.length} semantic matches. Top match score: ${topScore.toFixed(3)}. Click "Ask AI" on any result for a detailed explanation.`
                : "Search your codebase to get AI-powered insights about the results."}
            </p>
          </GlassPanel>
        </aside>
      </div>
    </AppShell>
  );
}
