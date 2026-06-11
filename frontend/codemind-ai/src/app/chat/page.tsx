"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Paperclip,
  Send,
  Sparkles,
  Plus,
  GitBranch,
  Layers,
  FileCode,
} from "lucide-react";

import CodeEditor from "@/components/features/CodeEditor";
import AppShell from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SystemIndicator from "@/components/ui/SystemIndicator";
import { Card, GlassPanel } from "@/components/ui/card";
import { askQuestion, scanRepo, type ScannedFile } from "@/lib/api/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type CodeBlock = {
  filename: string;
  badge?: string;
  dep?: string;
  language: string;
  code: string;
};

type Message = {
  role: "user" | "ai";
  text: string;
  codeBlocks?: CodeBlock[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const HISTORY_KEY = "codemind_chat_history";
const SESSION_KEY = "codemind_current_session_id";
const ACTIVE_REPO_KEY = "codemind_active_repo";
const ASK_TIMEOUT_MS = 45000;

// ── Session helpers ───────────────────────────────────────────────────────────

type ChatSession = {
  id: string;
  title: string;
  repo: string;
  timestamp: number;
  messageCount: number;
  preview: string;
  messages?: Message[];
};

function saveSession(sessionId: string, messages: Message[], repoName: string) {
  if (!sessionId) return;
  try {
    const userMessages = messages.filter((m) => m.role === "user");
    const aiMessages = messages.filter((m) => m.role === "ai");
    if (userMessages.length === 0 || aiMessages.length === 0) return;

    const session: ChatSession = {
      id: sessionId,
      title:
        userMessages[0].text.slice(0, 60) +
        (userMessages[0].text.length > 60 ? "..." : ""),
      repo: repoName,
      timestamp: Date.now(),
      messageCount: messages.length,
      preview:
        aiMessages.at(-1)?.text.slice(0, 100) || "",
      messages,
    };

    const raw = localStorage.getItem(HISTORY_KEY);
    const history: ChatSession[] = raw ? JSON.parse(raw) : [];
    const idx = history.findIndex((s) => s.id === sessionId);
    if (idx >= 0) {
      history[idx] = session;
    } else {
      history.unshift(session);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
    // Notify other tabs / history page
    window.dispatchEvent(new Event("storage"));
  } catch {
    // silently fail
  }
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-highest">
        <span className="text-xs text-on-surface-variant">U</span>
      </div>
      <p className="pt-1 text-sm text-on-surface">{text}</p>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-primary/10">
        <Sparkles size={14} className="animate-pulse text-primary" />
      </div>
      <div className="flex items-center gap-2 pt-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
        <span className="ml-1 text-xs text-on-surface-variant">
          Retrieving context and generating answer...
        </span>
      </div>
    </div>
  );
}

function AiMessage({ message }: { message: Message }) {
  const [reasoningOpen, setReasoningOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const hasRealChunks = (message.codeBlocks?.length ?? 0) > 0;

  const chunks = hasRealChunks
    ? message.codeBlocks!.map((b) => ({
        file: b.filename,
        score: parseFloat(b.dep?.replace("Score: ", "") || "0"),
      }))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-primary/10">
          <Sparkles size={14} className="text-primary" />
        </div>

        <div className="flex-1 space-y-4">
          <GlassPanel className="border border-outline-variant/80 bg-surface-container-low/80">
            <button
              type="button"
              onClick={() => setReasoningOpen((o) => !o)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-secondary">
                <Sparkles size={14} className="animate-pulse" />
                AI Reasoning: Analyzing context & logic
              </span>
              <ChevronDown
                size={16}
                className={`text-on-surface-variant transition-transform ${
                  reasoningOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {reasoningOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-3 border-t border-outline-variant pt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-2 w-2 rounded-full bg-secondary status-pulse" />
                      <span className="font-bold text-secondary">
                        ACTIVE ANALYSIS
                      </span>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {[
                        "Semantic search across indexed chunks",
                        "Retrieved top matching code segments",
                        "Generated contextual answer",
                      ].map((step, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <ChevronRight size={14} className="text-secondary" />
                          <span className="text-on-surface">{step}</span>
                        </li>
                      ))}
                    </ul>

                    {chunks.length > 0 && (
                      <div className="mt-4 space-y-2 border-t border-outline-variant pt-4">
                        <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                          Contextual Chunk Ranking
                        </p>
                        {chunks.slice(0, 3).map((c, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between font-mono text-xs">
                              <span className="max-w-[200px] truncate text-on-surface">
                                {c.file}
                              </span>
                              <span className="text-primary">
                                {c.score > 0 ? c.score.toFixed(3) : "—"}
                              </span>
                            </div>
                            <div className="h-1 overflow-hidden rounded-full bg-surface-variant">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width:
                                    c.score > 0
                                      ? `${c.score * 100}%`
                                      : `${90 - i * 15}%`,
                                }}
                                transition={{
                                  duration: 0.8,
                                  ease: [0.22, 1, 0.36, 1],
                                }}
                                className="h-full bg-gradient-to-r from-secondary-container to-secondary"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassPanel>

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface">
            {message.text}
          </p>

          {message.codeBlocks && message.codeBlocks.length > 0 && (
            <Card className="overflow-hidden">
              <div className="flex items-center gap-1 overflow-x-auto border-b border-outline-variant bg-surface-container-high px-3 py-2">
                {message.codeBlocks.map((block, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveTab(i)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded px-3 py-1.5 text-xs font-mono transition ${
                      activeTab === i
                        ? "bg-surface-container-highest text-primary"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span className="text-on-surface-variant">▣</span>
                    {block.filename}
                    {block.badge && (
                      <Badge variant="muted">{block.badge}</Badge>
                    )}
                    {block.dep && (
                      <span className="text-[10px] text-on-surface-variant">
                        {block.dep}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="h-64">
                <CodeEditor
                  value={message.codeBlocks[activeTab]?.code ?? ""}
                  language={
                    message.codeBlocks[activeTab]?.language ?? "python"
                  }
                  path={message.codeBlocks[activeTab]?.filename ?? "file"}
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [activeRepo, setActiveRepo] = useState<string>("");

  // Sidebar state — real data from /scan-repo
  const [repoFiles, setRepoFiles] = useState<ScannedFile[]>([]);
  const [repoLoading, setRepoLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<boolean>(false);

  // ── Load repo scan data for the sidebar ──
  const loadRepoData = useCallback(async (repo: string) => {
    if (!repo) return;
    setRepoLoading(true);
    try {
      const data = await scanRepo(repo);
      setRepoFiles(data.files ?? []);
    } catch {
      setRepoFiles([]);
    } finally {
      setRepoLoading(false);
    }
  }, []);

  // ── On mount: sync repo, load prefill, restore or start session ──
  useEffect(() => {
    abortRef.current = false;

    const init = () => {
      const storedRepo = localStorage.getItem(ACTIVE_REPO_KEY) || "";
      setActiveRepo(storedRepo);
      if (storedRepo) loadRepoData(storedRepo);

      // Prefill from "Ask AI" on semantic search
      const prefill = localStorage.getItem("codemind_prefill_query");
      if (prefill) {
        localStorage.removeItem("codemind_prefill_query");
        setInput(prefill);
      }

      // Try to restore a session if one was clicked from history
      const activeSessionId = localStorage.getItem(SESSION_KEY);
      if (activeSessionId) {
        try {
          const raw = localStorage.getItem(HISTORY_KEY);
          const history: ChatSession[] = raw ? JSON.parse(raw) : [];
          const session = history.find((s) => s.id === activeSessionId);

          if (session?.messages?.length) {
            setSessionId(activeSessionId);
            setMessages(session.messages);
            if (session.repo) {
              localStorage.setItem(ACTIVE_REPO_KEY, session.repo);
              setActiveRepo(session.repo);
              loadRepoData(session.repo);
            }
            return; // Don't generate a new session — we're restoring
          }
        } catch {
          localStorage.removeItem(SESSION_KEY);
        }
      }

      // Fresh session
      const newId = generateSessionId();
      localStorage.setItem(SESSION_KEY, newId);
      setSessionId(newId);
    };

    queueMicrotask(init);

    const syncRepo = (e: Event) => {
      const newRepo = (e as CustomEvent<string>).detail;
      setActiveRepo(newRepo);
      loadRepoData(newRepo);
    };

    window.addEventListener("codemind-active-repo-change", syncRepo);

    return () => {
      window.removeEventListener("codemind-active-repo-change", syncRepo);
      abortRef.current = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Save to history after every AI response ──
  useEffect(() => {
    if (!sessionId || messages.length === 0) return;
    const hasAi = messages.some((m) => m.role === "ai");
    const hasUser = messages.some((m) => m.role === "user");
    if (hasAi && hasUser) {
      saveSession(sessionId, messages, activeRepo);
    }
  }, [messages, sessionId, activeRepo]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setIsLoading(false);
    const newId = generateSessionId();
    setSessionId(newId);
    localStorage.setItem(SESSION_KEY, newId);
  }, []);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input.trim();
    setInput("");
    setIsLoading(true);
    abortRef.current = false;

    setMessages((prev) => [...prev, { role: "user", text: userText }]);

    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);
      const repoName = localStorage.getItem(ACTIVE_REPO_KEY);
      const data = await askQuestion(userText, repoName, controller.signal);

      if (abortRef.current) return;

      const codeBlocks: CodeBlock[] = (data.sources ?? [])
        .filter((s: { content?: string }) => s.content)
        .slice(0, 3)
        .map(
          (s: {
            file_name?: string;
            score?: number;
            language?: string;
            content: string;
          }) => ({
            filename: s.file_name ?? "result.py",
            badge: "Retrieved",
            dep: `Score: ${s.score?.toFixed(3) ?? "0.000"}`,
            language: s.language?.toLowerCase() ?? "python",
            code: s.content,
          })
        );

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: data.answer ?? "No answer returned.",
          codeBlocks,
        },
      ]);
    } catch (err: unknown) {
      if (abortRef.current) return;
      const msg =
        err instanceof DOMException && err.name === "AbortError"
          ? "The backend took too long to respond. Try a narrower question or re-index the selected repository."
          : err instanceof Error
            ? err.message
            : "Could not reach backend.";
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: `Error: ${msg}` },
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
      if (!abortRef.current) setIsLoading(false);
    }
  };

  // ── Derive sidebar data from real scan ──
  const techStack = Array.from(
    new Set(repoFiles.map((f) => f.language).filter(Boolean))
  ).slice(0, 8);

  const topDirs = Array.from(
    new Set(
      repoFiles
        .map((f) => {
          const parts = f.path.replace(/\\/g, "/").split("/").filter(Boolean);
          const idx = parts.findIndex((p) => p === "repositories");
          const rel =
            idx >= 0 ? parts.slice(idx + 2) : parts.slice(-3);
          return rel[0] && rel[0] !== f.file_name ? rel[0] : null;
        })
        .filter(Boolean)
    )
  ).slice(0, 5) as string[];

  const repoSummary = activeRepo
    ? repoLoading
      ? "Loading repository info..."
      : repoFiles.length > 0
        ? `${repoFiles.length} files across ${topDirs.length} top-level directories. Primary languages: ${techStack.slice(0, 3).join(", ") || "unknown"}.`
        : "Repository not indexed yet. Add the repo and run indexing from the Repositories tab."
    : "Select or add a repository to generate a summary.";

  return (
    <AppShell title="Code Intelligence Chat" showRepoPills showContextButton fullBleed>
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── Main chat column ── */}
        <section className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="flex-1 overflow-y-auto px-[var(--container-padding)] py-8">
            <div className="mx-auto max-w-3xl space-y-8">

              {/* Empty state */}
              {messages.length === 0 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 py-24 text-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high">
                    <Sparkles size={24} className="text-primary" />
                  </div>
                  <p className="text-xl font-semibold text-on-surface">
                    Ask about your codebase
                  </p>
                  <p className="max-w-md text-sm text-on-surface-variant">
                    {activeRepo
                      ? `Chatting with ${activeRepo}. Ask about its architecture, functions, bugs, or patterns.`
                      : "Index a repository first, then ask questions about its architecture, functions, bugs, or patterns."}
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {[
                      "What classes are defined?",
                      "Explain the main entry point",
                      "Find all functions that use self",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setInput(suggestion)}
                        className="rounded-full border border-outline-variant px-4 py-2 text-sm text-on-surface-variant transition hover:border-primary hover:text-primary"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((m, i) =>
                m.role === "user" ? (
                  <UserMessage key={i} text={m.text} />
                ) : (
                  <AiMessage key={i} message={m} />
                )
              )}
              {isLoading && <LoadingMessage />}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* ── Input bar ── */}
          <div className="border-t border-outline-variant/60 bg-surface-container-low/90 p-4 backdrop-blur-xl">
            <div className="mx-auto max-w-3xl">
              <div className="mb-2 flex flex-wrap items-center gap-4 font-mono text-xs text-on-surface-variant">
                <SystemIndicator
                  label={isLoading ? "Generating answer..." : "Ready"}
                  className="mr-2"
                />
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                  GEMINI-1.5-FLASH
                </span>
                <span>GEMINI-EMBEDDING-001</span>
                <span>QDRANT RAG</span>
                <button
                  type="button"
                  className="rounded border border-outline-variant px-2 py-0.5 text-[10px] uppercase tracking-widest text-on-surface-variant transition hover:border-primary hover:text-primary"
                >
                  TRACE
                </button>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={startNewChat}
                    className="ml-auto flex items-center gap-1 rounded border border-outline-variant px-2 py-0.5 text-[10px] uppercase tracking-widest text-on-surface-variant transition hover:border-primary hover:text-primary"
                  >
                    <Plus size={10} />
                    New Chat
                  </button>
                )}
              </div>

              <div className="flex items-end gap-3 rounded-xl border border-outline-variant/80 bg-surface-container-lowest/90 p-3 shadow-[0_0_32px_rgba(128,131,255,0.08)] backdrop-blur-md transition focus-within:border-primary/60 focus-within:shadow-[0_0_40px_rgba(128,131,255,0.15)] focus-within:ring-1 focus-within:ring-primary/40">
                <textarea
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={
                    isLoading
                      ? "Waiting for response..."
                      : activeRepo
                        ? `Ask about ${activeRepo}...`
                        : "Ask about your codebase..."
                  }
                  disabled={isLoading}
                  className="flex-1 resize-none bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant disabled:opacity-50"
                />
                <button
                  type="button"
                  className="p-2 text-on-surface-variant transition hover:text-primary"
                >
                  <Paperclip size={18} />
                </button>
                <Button
                  variant="primary"
                  size="icon"
                  onClick={send}
                  disabled={isLoading || !input.trim()}
                  className="shrink-0"
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Right sidebar — real repo data ── */}
        <aside className="hidden w-80 shrink-0 flex-col border-l border-outline-variant/60 bg-surface-container-low/80 backdrop-blur-xl xl:flex">
          <div className="border-b border-outline-variant p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
              Repository Context
            </p>
            {activeRepo && (
              <p className="mt-1 truncate font-mono text-sm text-primary">
                {activeRepo}
              </p>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">

            {/* Summary — derived from real scan */}
            <Card className="p-3">
              <div className="mb-2 flex items-center gap-2">
                <GitBranch size={13} className="text-secondary" />
                <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                  Repository Summary
                </p>
              </div>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                {repoSummary}
              </p>
              {repoFiles.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded bg-surface-container-high p-2 text-center">
                    <p className="font-mono text-lg font-bold text-primary">
                      {repoFiles.length}
                    </p>
                    <p className="font-mono text-[10px] text-on-surface-variant">
                      FILES
                    </p>
                  </div>
                  <div className="rounded bg-surface-container-high p-2 text-center">
                    <p className="font-mono text-lg font-bold text-secondary">
                      {topDirs.length}
                    </p>
                    <p className="font-mono text-[10px] text-on-surface-variant">
                      DIRS
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Tech stack — from real scan */}
            <GlassPanel animate={false}>
              <div className="mb-3 flex items-center gap-2">
                <Layers size={13} className="text-secondary" />
                <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                  Tech Stack
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {techStack.length > 0 ? (
                  techStack.map((lang) => (
                    <span
                      key={lang}
                      className="rounded border border-outline-variant bg-surface-container-high px-2 py-1 font-mono text-xs text-primary"
                    >
                      {lang}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-on-surface-variant">
                    {activeRepo
                      ? repoLoading
                        ? "Loading..."
                        : "Index this repo to detect tech stack."
                      : "Select a repository first."}
                  </p>
                )}
              </div>
            </GlassPanel>

            {/* Top directories */}
            {topDirs.length > 0 && (
              <Card className="p-3">
                <div className="mb-2 flex items-center gap-2">
                  <FileCode size={13} className="text-secondary" />
                  <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                    Top Directories
                  </p>
                </div>
                <ul className="space-y-1">
                  {topDirs.map((dir) => (
                    <li
                      key={dir}
                      className="flex items-center gap-2 font-mono text-xs text-on-surface-variant"
                    >
                      <span className="h-1 w-1 rounded-full bg-secondary" />
                      {dir}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Retrieved files from last AI response */}
            {messages.some((m) => m.role === "ai" && m.codeBlocks?.length) && (
              <Card className="p-3">
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                  Last Retrieved Files
                </p>
                <ul className="space-y-1.5 font-mono text-xs">
                  {messages
                    .filter((m) => m.role === "ai" && m.codeBlocks?.length)
                    .at(-1)
                    ?.codeBlocks?.map((b, i) => (
                      <li
                        key={i}
                        className={
                          i === 0
                            ? "text-primary"
                            : "pl-2 text-on-surface-variant"
                        }
                      >
                        {i > 0 ? "→ " : ""}
                        {b.filename}
                        <span className="ml-2 text-[10px] text-secondary">
                          {b.dep}
                        </span>
                      </li>
                    ))}
                </ul>
              </Card>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}