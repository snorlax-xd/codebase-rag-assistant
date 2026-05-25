"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REPOS_KEY = "codemind_repos";

function hasStoredRepositories(): boolean {
  try {
    const raw = window.localStorage.getItem(REPOS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    window.localStorage.removeItem(REPOS_KEY);
    return false;
  }
}

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(hasStoredRepositories() ? "/chat" : "/repositories");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="font-mono text-sm text-on-surface-variant">Loading...</p>
      </div>
    </div>
  );
}
