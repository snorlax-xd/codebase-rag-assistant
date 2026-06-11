const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ScannedFile = {
  file_name: string;
  language: string;
  path: string;
  content?: string;
};

export type BackendSettings = {
  generation_model: string;
  embedding_model: string;
  generation_max_output_tokens: number;
  generation_temperature: number;
  search_limit: number;
  max_context_chars: number;
  embedding_dim: number;
  qdrant_collection: string;
  ignore_directories: string[];
  max_scan_files: number;
};

export type IndexStatus = {
  repo: string;
  status: "indexing" | "done" | "error" | "unknown";
  indexed: number;
  total: number;
  error: string | null;
};

/**
 * Appends repo_name as a query parameter.
 * Correctly uses ? if no query string exists yet, & otherwise.
 */
function withRepoParam(url: string, repoName?: string | null): string {
  if (!repoName) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}repo_name=${encodeURIComponent(repoName)}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      detail = json.detail ?? json.message ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function askQuestion(
  query: string,
  repoName?: string | null,
  signal?: AbortSignal
) {
  const url = withRepoParam(
    `${BASE_URL}/ask?query=${encodeURIComponent(query)}`,
    repoName
  );
  const res = await fetch(url, { signal });
  return handleResponse<{
    query: string;
    repo_name: string | null;
    answer: string;
    sources: Array<{
      score: number;
      file_name: string;
      language: string;
      repo_name: string;
      path: string;
      content: string;
    }>;
  }>(res);
}

export async function searchCode(query: string, repoName?: string | null) {
  const url = withRepoParam(
    `${BASE_URL}/search?query=${encodeURIComponent(query)}`,
    repoName
  );
  const res = await fetch(url);
  return handleResponse<{
    query: string;
    repo_name: string | null;
    results: Array<{
      score: number;
      file_name: string;
      language: string;
      repo_name: string;
      path: string;
      content: string;
    }>;
  }>(res);
}

export async function cloneRepo(repoUrl: string) {
  const res = await fetch(
    `${BASE_URL}/clone-repo?repo_url=${encodeURIComponent(repoUrl)}`,
    { method: "POST" }
  );
  return handleResponse<{ status: string; repo_name: string; path: string }>(res);
}

export async function indexRepo(repoName: string) {
  const res = await fetch(
    `${BASE_URL}/index-repo?repo_name=${encodeURIComponent(repoName)}`,
    { method: "POST" }
  );
  return handleResponse<{ status: string; repo: string; message: string }>(res);
}

export async function getIndexStatus(repoName: string): Promise<IndexStatus> {
  const res = await fetch(
    `${BASE_URL}/index-status?repo_name=${encodeURIComponent(repoName)}`
  );
  return handleResponse<IndexStatus>(res);
}

export async function scanRepo(repoName: string) {
  const res = await fetch(
    `${BASE_URL}/scan-repo?repo_name=${encodeURIComponent(repoName)}`
  );
  return handleResponse<{
    repository: string;
    total_files: number;
    files: ScannedFile[];
  }>(res);
}

export async function createCollection() {
  const res = await fetch(`${BASE_URL}/create-collection`, { method: "POST" });
  return handleResponse<{ status: string; collection: string }>(res);
}

export async function getBackendSettings(): Promise<BackendSettings> {
  const res = await fetch(`${BASE_URL}/settings`);
  return handleResponse<BackendSettings>(res);
}

export async function getCollectionInfo() {
  const res = await fetch(`${BASE_URL}/collection-info`);
  return handleResponse<{
    vectors_count: number;
    indexed_vectors_count: number;
    status: string;
  }>(res);
}