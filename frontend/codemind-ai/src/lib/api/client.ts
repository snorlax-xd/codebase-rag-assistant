const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ScannedFile = {
  file_name: string;
  language: string;
  path: string;
  content?: string;
};

function withRepoParam(url: string, repoName?: string | null) {
  if (!repoName) return url;
  return `${url}&repo_name=${encodeURIComponent(repoName)}`;
}

export async function askQuestion(query: string, repoName?: string | null) {
  const res = await fetch(
    withRepoParam(`${BASE_URL}/ask?query=${encodeURIComponent(query)}`, repoName)
  );
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}

export async function searchCode(query: string, repoName?: string | null) {
  const res = await fetch(
    withRepoParam(`${BASE_URL}/search?query=${encodeURIComponent(query)}`, repoName)
  );
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}

export async function cloneRepo(repoUrl: string) {
  const res = await fetch(
    `${BASE_URL}/clone-repo?repo_url=${encodeURIComponent(repoUrl)}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}

export async function indexRepo(repoName: string) {
  const res = await fetch(
    `${BASE_URL}/index-repo?repo_name=${encodeURIComponent(repoName)}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}

export async function scanRepo(repoName: string) {
  const res = await fetch(
    `${BASE_URL}/scan-repo?repo_name=${encodeURIComponent(repoName)}`
  );
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json() as Promise<{
    repository: string;
    total_files: number;
    files: ScannedFile[];
  }>;
}

export async function createCollection() {
  const res = await fetch(`${BASE_URL}/create-collection`, {
    method: "POST",
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}
