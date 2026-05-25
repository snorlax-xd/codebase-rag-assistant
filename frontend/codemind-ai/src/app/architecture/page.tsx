"use client";

import { useEffect, useMemo, useState } from "react";

import ArchitectureFlow from "@/components/features/ArchitectureFlow";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { scanRepo, type ScannedFile } from "@/lib/api/client";

const ACTIVE_REPO_KEY = "codemind_active_repo";
const REPOS_KEY = "codemind_repos";

type StoredRepo = {
  name?: string;
};

function readActiveRepo(): string | null {
  const active = localStorage.getItem(ACTIVE_REPO_KEY);
  if (active) return active;

  try {
    const raw = localStorage.getItem(REPOS_KEY);
    const repos = raw ? JSON.parse(raw) : [];
    const firstRepo = Array.isArray(repos)
      ? repos.find((repo: StoredRepo) => typeof repo.name === "string" && repo.name)
      : null;

    if (firstRepo?.name) {
      localStorage.setItem(ACTIVE_REPO_KEY, firstRepo.name);
      return firstRepo.name;
    }
  } catch {
    localStorage.removeItem(REPOS_KEY);
  }

  return null;
}

function topDirectory(path: string, fileName: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const repoMarkerIndex = parts.findIndex((part) => part === "repositories");
  const relative =
    repoMarkerIndex >= 0
      ? parts.slice(repoMarkerIndex + 2).join("/")
      : parts.slice(-3).join("/");
  const first = relative.split("/").filter(Boolean)[0];
  return first && first !== fileName ? first : "root";
}

function getArchitectureStats(files: ScannedFile[]) {
  const languages = new Map<string, number>();
  const directories = new Map<string, number>();
  let filesWithContent = 0;

  for (const file of files) {
    const directory = topDirectory(file.path, file.file_name);
    languages.set(file.language, (languages.get(file.language) ?? 0) + 1);
    directories.set(directory, (directories.get(directory) ?? 0) + 1);
    if (file.content?.trim()) filesWithContent += 1;
  }

  const topLanguages = Array.from(languages.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const topDirectories = Array.from(directories.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const contentCoverage = files.length
    ? Math.round((filesWithContent / files.length) * 100)
    : 0;

  return {
    fileCount: files.length,
    directoryCount: directories.size,
    languageCount: languages.size,
    contentCoverage,
    topLanguages,
    topDirectories,
  };
}

export default function ArchitecturePage() {
  const [repoName, setRepoName] = useState<string | null>(null);
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(async () => {
      const activeRepo = readActiveRepo();
      setRepoName(activeRepo);

      if (!activeRepo) {
        setFiles([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await scanRepo(activeRepo);
        setFiles(data.files ?? []);
      } catch (err: unknown) {
        setFiles([]);
        setError(err instanceof Error ? err.message : "Could not scan repository.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const stats = useMemo(() => getArchitectureStats(files), [files]);

  return (
    <AppShell title="Architecture Graph" showRunAnalysis fullBleed>
      <div className="relative flex min-h-0 flex-1 grid-bg">
        <ArchitectureFlow files={files} repoName={repoName} loading={loading} error={error} />

        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="pointer-events-auto absolute left-6 top-6 space-y-2">
            <GlassPanel className="min-w-[230px]">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                  Repository Metrics
                </span>
                <span className="h-2 w-2 rounded-full bg-secondary" />
              </div>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Files</span>
                  <span className="font-bold text-primary">{stats.fileCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Directories</span>
                  <span className="font-bold text-primary">{stats.directoryCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Languages</span>
                  <span className="font-bold text-primary">{stats.languageCount}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-on-surface-variant">Scan Coverage</span>
                  <div className="flex items-center gap-2">
                    <Progress value={stats.contentCoverage} className="w-16" />
                    <span className="font-bold text-secondary">{stats.contentCoverage}%</span>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <div className="glass-panel flex items-center gap-2 rounded-lg px-3 py-2">
              <span className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                Active Repo
              </span>
              <span className="rounded border border-outline-variant bg-surface-container-high px-2 py-0.5 font-mono text-xs text-on-surface-variant">
                {repoName ?? "none"}
              </span>
            </div>
          </div>

          <div className="pointer-events-auto absolute right-6 top-6 w-72">
            <GlassPanel>
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                Architecture Signals
              </p>
              <div className="space-y-4">
                {stats.topDirectories.map(([directory, count]) => (
                  <div key={directory}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-on-surface">{directory}</span>
                      <span className="shrink-0 rounded bg-secondary/20 px-2 py-0.5 font-mono text-[10px] font-medium uppercase text-secondary">
                        {count} files
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-on-surface-variant">
                      Directory cluster detected from repository scan.
                    </p>
                  </div>
                ))}
                {stats.topDirectories.length === 0 && (
                  <p className="text-xs text-on-surface-variant">
                    Add and scan a repository to populate architecture signals.
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 w-full"
                disabled={!repoName || loading}
                onClick={() => window.location.reload()}
              >
                Rescan Repo
              </Button>
            </GlassPanel>
          </div>

          <div className="pointer-events-auto absolute bottom-6 left-6 w-56">
            <GlassPanel>
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                Language Mix
              </p>
              <ul className="space-y-2">
                {stats.topLanguages.map(([language, count], index) => (
                  <li key={language} className="flex items-center gap-2 text-sm text-on-surface">
                    <span
                      className={
                        index === 0
                          ? "h-2 w-2 rounded-full bg-primary"
                          : index === 1
                            ? "h-2 w-2 rounded-full bg-secondary"
                            : "h-2 w-2 rounded-full bg-tertiary"
                      }
                    />
                    {language} ({count})
                  </li>
                ))}
                {stats.topLanguages.length === 0 && (
                  <li className="text-sm text-on-surface-variant">No language data yet.</li>
                )}
              </ul>
            </GlassPanel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
