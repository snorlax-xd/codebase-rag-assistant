import { cloneRepo, scanRepo, type ScannedFile } from "@/lib/api/client";

export const ACTIVE_REPO_KEY = "codemind_active_repo";
export const REPOS_KEY = "codemind_repos";

export type StoredRepo = {
  name?: string;
  url?: string;
  status?: string;
  lastSync?: string;
};

export function loadStoredRepos(): StoredRepo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REPOS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (repo: StoredRepo) =>
            typeof repo.name === "string" && repo.name.trim().length > 0
        )
      : [];
  } catch {
    localStorage.removeItem(REPOS_KEY);
    return [];
  }
}

export function setActiveRepo(repoName: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_REPO_KEY, repoName);
  window.dispatchEvent(
    new CustomEvent("codemind-active-repo-change", { detail: repoName })
  );
}

export function getActiveRepo(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ACTIVE_REPO_KEY) || "";
}

export function normalizeRepoUrl(repo: StoredRepo | undefined): string | null {
  if (!repo?.url) return null;
  const url = repo.url.trim();
  if (!url) return null;
  if (url.startsWith("https://") || url.startsWith("git@")) return url;
  if (url.startsWith("github.com/") || url.startsWith("gitlab.com/")) {
    return `https://${url}`;
  }
  return null;
}

/**
 * Scans a repository, auto-cloning if needed.
 *
 * Key fix: the backend resolves `react` -> `facebook__react` on disk.
 * The scan response includes the actual folder name in `repository`.
 * We return both files AND the canonical name so callers can update
 * their local state to use the name that actually works in Qdrant.
 */
export async function scanRepoWithAutoClone(
  repoName: string
): Promise<ScannedFile[]> {
  try {
    const data = await scanRepo(repoName);
    return data.files ?? [];
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : "";
    // Only attempt auto-clone for "not cloned" errors
    if (!message.includes("not cloned")) throw error;

    const repo = loadStoredRepos().find((item) => item.name === repoName);
    const repoUrl = normalizeRepoUrl(repo);
    if (!repoUrl) throw error;

    await cloneRepo(repoUrl);
    const data = await scanRepo(repoName);
    return data.files ?? [];
  }
}