export const SAMPLE_FILES: Record<
  string,
  { language: string; path: string; content: string }
> = {
  "Sidebar.tsx": {
    language: "typescript",
    path: "src/components/layout/Sidebar.tsx",
    content: `export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav>{/* Neural navigation */}</nav>
    </aside>
  );
}`,
  },
  "AppShell.tsx": {
    language: "typescript",
    path: "src/components/layout/AppShell.tsx",
    content: `export default function AppShell({ children }) {
  return (
    <motion.div className="os-shell">
      <Sidebar />
      <main>{children}</main>
    </motion.div>
  );
}`,
  },
  "rag-pipeline.py": {
    language: "python",
    path: "backend/rag/pipeline.py",
    content: `async def embed_chunks(chunks: list[str]) -> list[list[float]]:
    vectors = await embedding_client.encode(chunks)
    await vector_store.upsert(vectors)
    return vectors`,
  },
};
