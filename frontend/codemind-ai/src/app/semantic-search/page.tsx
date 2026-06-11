"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Network, Search, Sparkles, Terminal, X } from "lucide-react";
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
import { cn } from "@/lib/utils/cn";

// ── Types ─────────────────────────────────────────────────────────────────────

type SearchResult = {
  file_name: string;
  path: string;
  score: number;
  content: string;
  language: string;
};

type StoredRepo = { name?: string; url?: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVE_REPO_KEY = "codemind_active_repo";
const REPOS_KEY = "codemind_repos";

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadStoredRepos(): StoredRepo[] {
  try {
    const raw = localStorage.getItem(REPOS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((r: StoredRepo) => typeof r.name === "string" && r.name)
      : [];
  } catch {
    return [];
  }
}

function setActiveRepo(repoName: string) {
  localStorage.setItem(ACTIVE_REPO_KEY, repoName);
  window.dispatchEvent(
    new CustomEvent("codemind-active-repo-change", { detail: repoName })
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SemanticSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Repo switcher state
  const [activeRepo, setActiveRepoState] = useState<string>("");
  const [repos, setRepos] = useState<StoredRepo[]>([]);
  const [repoDropOpen, setRepoDropOpen] = useState(false);

  const router = useRouter();

  // ── Sync active repo on mount and on changes ──
  useEffect(() => {
    queueMicrotask(() => {
      setActiveRepoState(localStorage.getItem(ACTIVE_REPO_KEY) || "");
      setRepos(loadStoredRepos());
    });

    const handleRepoChange = (e: Event) => {
      const newRepo = (e as CustomEvent<string>).detail;
      setActiveRepoState(newRepo);
      setRepos(loadStoredRepos());
      // Clear results when switching repos
      setResults([]);
      setSearched(false);
      setQuery("");
    };

    window.addEventListener("codemind-active-repo-change", handleRepoChange);
    return () =>
      window.removeEventListener("codemind-active-repo-change", handleRepoChange);
  }, []);

  const switchRepo = (repoName: string) => {
    setActiveRepo(repoName);
    setActiveRepoState(repoName);
    setRepoDropOpen(false);
    // Clear previous results
    setResults([]);
    setSearched(false);
    setQuery("");
  };

  // ── Search ──
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setError(null);
    setSearched(false);
    try {
      const repo = localStorage.getItem(ACTIVE_REPO_KEY);
      const data = await searchCode(q.trim(), repo);
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

        {/* ── Left: FileExplorer with repo switcher above it ── */}
        <div className="flex flex-col border-r border-outline-variant/60">

          {/* Repo switcher header */}
          <div className="flex items-center justify-between border-b border-outline-variant/60 bg-surface-container-low px-3 py-2">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                Explorer
              </p>
              <p className="truncate font-mono text-xs text-primary">
                {activeRepo || "no repo"}
              </p>
            </div>

            <div className="relative ml-2 shrink-0">
              <button
                type="button"
                onClick={() => setRepoDropOpen((o) => !o)}
                className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-highest/80 px-2 py-1 font-mono text-xs text-on-surface-variant transition hover:border-primary/50"
                title="Switch repository"
              >
                <Terminal size={11} className="text-secondary" />
                <ChevronDown
                  size={11}
                  className={repoDropOpen ? "rotate-180 transition" : "transition"}
                />
              </button>

              {repoDropOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[55]"
                    onClick={() => setRepoDropOpen(false)}
                  />
                  <div className="absolute right-0 top-8 z-[60] w-56 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-2xl">
                    <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                      Switch Repository
                    </p>
                    {repos.length === 0 ? (
                      <p className="px-3 pb-3 text-xs text-on-surface-variant">
                        No repos added yet.
                      </p>
                    ) : (
                      repos.map((repo) => (
                        <button
                          key={repo.name}
                          type="button"
                          onClick={() => switchRepo(repo.name!)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-surface-variant",
                            repo.name === activeRepo
                              ? "text-primary"
                              : "text-on-surface"
                          )}
                        >
                          <Terminal size={13} />
                          <span className="truncate">{repo.name}</span>
                          {repo.name === activeRepo && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-secondary" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Original FileExplorer */}
          <FileExplorer
            onSelect={(file) => {
              setQuery(file);
              runSearch(file);
            }}
          />
        </div>

        {/* ── Main search section ── */}
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
                placeholder={
                  activeRepo
                    ? `Search ${activeRepo} semantically...`
                    : "Select a repository, then search..."
                }
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
                  disabled={searching || !query.trim() || !activeRepo}
                >
                  Search
                </Button>
              </div>
            </div>

            {/* No repo warning */}
            {!activeRepo && (
              <p className="font-mono text-xs text-on-surface-variant">
                ↑ Select a repository from the explorer dropdown to enable search.
              </p>
            )}

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
                    className="rounded border border-outline-variant bg-surface-container-high px-3 py-1 font-mono text-sm text-primary transition hover:border-primary"
                  >
                    {r.file_name}{" "}
                    <span className="text-on-surface-variant">
                      {r.score.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Score bar */}
            {results.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="whitespace-nowrap font-mono text-xs text-on-surface-variant">
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
                <Card className="overflow-hidden transition hover:border-primary/40">
                  <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high px-4 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-mono font-bold text-on-surface">
                        {hit.file_name}
                      </span>
                      {hit.path && (
                        <span className="truncate font-mono text-xs text-on-surface-variant">
                          {hit.path}
                        </span>
                      )}
                      <span className="shrink-0 rounded bg-surface-variant px-1.5 py-0.5 font-mono text-xs text-on-surface-variant">
                        {hit.language}
                      </span>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-3">
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
                  <pre className="max-h-48 overflow-x-auto p-4 font-mono text-sm leading-relaxed text-on-surface-variant">
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
                  Try different keywords or make sure a repository is indexed
                  first.
                </p>
              </div>
            )}

            {/* Architecture CTA */}
            <Link href="/architecture">
              <Card className="group relative cursor-pointer overflow-hidden p-0 transition hover:border-primary/40">
                <div className="relative flex items-center justify-between p-6">
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">
                      Explore Architecture
                    </h3>
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

        {/* ── Right panel — relevant entities ── */}
        <aside className="hidden w-72 shrink-0 flex-col border-l border-outline-variant bg-surface-container-low p-4 lg:flex">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-on-surface-variant">
            Relevant Entities
          </p>
          <div className="mt-4 space-y-3">
            {results.slice(0, 3).map((r, i) => (
              <Card key={i} className="flex items-start gap-3 p-3">
                <span className="font-mono text-lg text-primary">▣</span>
                <div>
                  <p className="truncate font-mono text-sm font-bold text-on-surface">
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
              <span className="font-mono text-xs uppercase tracking-widest">
                AI Insight
              </span>
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