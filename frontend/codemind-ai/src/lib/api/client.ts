const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function askQuestion(query: string) {
  const res = await fetch(
    `${BASE_URL}/ask?query=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}

export async function searchCode(query: string) {
  const res = await fetch(
    `${BASE_URL}/search?query=${encodeURIComponent(query)}`
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

export async function createCollection() {
  const res = await fetch(`${BASE_URL}/create-collection`, {
    method: "POST",
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}