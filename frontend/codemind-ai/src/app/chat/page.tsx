"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Paperclip,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";

import CodeEditor from "@/components/features/CodeEditor";
import AppShell from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SystemIndicator from "@/components/ui/SystemIndicator";
import { ShimmerLine } from "@/components/ui/Shimmer";
import { Card, GlassPanel } from "@/components/ui/card";
import { askQuestion } from "@/lib/api/client";
// ── Types ─────────────────────────────────────────────────────────────────────

type Message = {
  role: "user" | "ai";
  text: string;
  codeBlocks?: CodeBlock[];
};

type CodeBlock = {
  filename: string;
  badge?: string;
  dep?: string;
  language: string;
  code: string;
};

// ── Static data ───────────────────────────────────────────────────────────────

const chunks = [
  { file: "AuthService.ts", score: 0.98 },
  { file: "middleware.ts", score: 0.85 },
  { file: "session.ts", score: 0.72 },
];

const authCode = `private isRefreshing = false;
private refreshSubscribers: ((token: string) => void)[] = [];

async refreshToken() {
  if (this.isRefreshing) {
    return new Promise(resolve => {
      this.refreshSubscribers.push(resolve);
    });
  }
  this.isRefreshing = true;
  const result = await authApi.refresh();
  this.isRefreshing = false;`;

const interceptorCode = `export class AxiosInterceptor {
  setup(instance: AxiosInstance) {
    instance.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config;
        if (error.response?.status === 401) {
          return this.authService.refreshToken()
            .then(token => {
              original.headers.Authorization = token;
              return instance(original);
            });
        }
      }
    );
  }
}`;

const initialMessages: Message[] = [
  {
    role: "user",
    text: "Analyze the authentication flow in AuthService.ts and check for potential token expiration race conditions when refreshing concurrent requests.",
  },
  {
    role: "ai",
    text: "In your current implementation of AuthService.ts, there is a clear race condition. Multiple concurrent requests expiring at exactly when the token expires will all trigger a refreshToken() call simultaneously.",
    codeBlocks: [
      {
        filename: "AuthService.ts",
        badge: "Refactored",
        dep: "Dep: AxiosInterceptor",
        language: "typescript",
        code: authCode,
      },
      {
        filename: "AxiosInterceptor.ts",
        dep: "Dep: AxiosInterceptor",
        language: "typescript",
        code: interceptorCode,
      },
    ],
  },
];

const reasoningSteps = [
  { done: true, text: "Indexed 12 semantic chunks from src/auth" },
  { done: true, text: "Identified refreshToken() as critical path." },
  { done: false, text: "Mapping cross-file dependencies..." },
  { done: false, text: "Analyzing Mutex implementation in concurrency helper..." },
];

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

function AiMessage({ message }: { message: Message }) {
  const [reasoningOpen, setReasoningOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="space-y-4">
      {/* AI avatar + reasoning panel */}
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-primary/10">
          <Sparkles size={14} className="text-primary" />
        </div>

        <div className="flex-1 space-y-4">
          {/* Reasoning collapsible */}
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
                      {reasoningSteps.map((step, i) => (
                        <li key={i} className="flex items-center gap-2">
                          {step.done ? (
                            <ChevronRight
                              size={14}
                              className="text-secondary"
                            />
                          ) : (
                            <motion.span
                              animate={{ opacity: [1, 0.4, 1] }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.3,
                              }}
                              className="h-3 w-3 rounded-full border border-secondary/60"
                            />
                          )}
                          <span
                            className={
                              step.done
                                ? "text-on-surface"
                                : "text-on-surface-variant"
                            }
                          >
                            {step.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Chunk ranking */}
                    <div className="mt-4 space-y-2 border-t border-outline-variant pt-4">
                      <p className="font-label-caps text-xs text-on-surface-variant">
                        CONTEXTUAL CHUNK RANKING
                      </p>
                      {chunks.map((c) => (
                        <div key={c.file} className="space-y-1">
                          <div className="flex justify-between font-mono text-xs">
                            <span className="text-on-surface">{c.file}</span>
                            <span className="text-primary">
                              {c.score.toFixed(2)}
                            </span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-surface-variant">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${c.score * 100}%` }}
                              transition={{
                                duration: 0.8,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className="h-full bg-gradient-to-r from-secondary-container to-secondary shadow-[0_0_10px_rgba(78,222,163,0.4)]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassPanel>

          {/* AI prose response */}
          <p className="text-sm leading-relaxed text-on-surface">
            {message.text}
          </p>

          {/* Code blocks with tabs */}
          {message.codeBlocks && message.codeBlocks.length > 0 && (
            <Card className="overflow-hidden">
              {/* Tab bar */}
              <div className="flex items-center gap-1 border-b border-outline-variant bg-surface-container-high px-3 py-2 overflow-x-auto">
                {message.codeBlocks.map((block, i) => (
                  <button
                    key={block.filename}
                    type="button"
                    onClick={() => setActiveTab(i)}
                    className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-mono transition whitespace-nowrap ${
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

              {/* Active code panel */}
              <div className="h-64">
                <CodeEditor
                  value={message.codeBlocks[activeTab].code}
                  language={message.codeBlocks[activeTab].language}
                  path={message.codeBlocks[activeTab].filename}
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
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


const send = async () => {
  if (!input.trim()) return;
  const userMessage = input.trim();
  setInput("");
  setMessages((prev) => [...prev, { role: "user", text: userMessage }]);

  try {
    const data = await askQuestion(userMessage);
    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        text: data.answer,
        sources: data.sources,
      },
    ]);
  } catch (err) {
    setMessages((prev) => [
      ...prev,
      { role: "ai", text: "Error reaching backend. Is it running?" },
    ]);
  }
};

  return (
    <AppShell
      title="Code Intelligence Chat"
      showRepoPills
      showContextButton
      fullBleed
    >
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ── Main chat column ── */}
        <section className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="flex-1 overflow-y-auto px-[var(--container-padding)] py-8">
            <div className="mx-auto max-w-3xl space-y-8">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <UserMessage key={i} text={m.text} />
                ) : (
                  <AiMessage key={i} message={m} />
                )
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* ── Input bar ── */}
          <div className="border-t border-outline-variant/60 bg-surface-container-low/90 p-4 backdrop-blur-xl">
            <div className="mx-auto max-w-3xl">
              {/* Status row */}
              <div className="mb-2 flex flex-wrap items-center gap-4 font-mono text-xs text-on-surface-variant">
                <SystemIndicator
                  label="Generating contextual embeddings..."
                  className="mr-2"
                />
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                  GPT-4-CLAUDE-HYBRID
                </span>
                <span>CONTEXT: 12 FILES</span>
                <span>TOKENS: 14,200</span>
                <span>RETR: 142MS</span>
                <button
                  type="button"
                  className="rounded border border-outline-variant px-2 py-0.5 text-[10px] uppercase tracking-widest text-on-surface-variant hover:border-primary hover:text-primary transition"
                >
                  TRACE
                </button>
              </div>

              {/* Textarea + actions */}
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
                  placeholder="Ask follow-up or provide specific code to refactor..."
                  className="flex-1 resize-none bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
                />
                <button
                  type="button"
                  className="p-2 text-on-surface-variant hover:text-primary transition"
                >
                  <Paperclip size={18} />
                </button>
                <Button
                  variant="primary"
                  size="icon"
                  onClick={send}
                  className="shrink-0"
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Right sidebar ── */}
        <aside className="hidden w-80 shrink-0 flex-col border-l border-outline-variant/60 bg-surface-container-low/80 backdrop-blur-xl xl:flex">
          <div className="border-b border-outline-variant p-4">
            <p className="font-label-caps text-on-surface-variant">
              Intelligence Stats
            </p>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <Card className="p-3">
              <p className="font-label-caps text-on-surface-variant">
                Vector Semantic Map
              </p>
              <pre className="mt-2 font-mono text-xs text-secondary">
                {`match: AuthService.validateToken\nscore: 0.941`}
              </pre>
            </Card>

            <GlassPanel animate={false} className="text-center">
              <p className="font-label-caps text-on-surface-variant">
                Matching Score
              </p>
              <p className="mt-2 text-4xl font-bold text-primary">0.941</p>
            </GlassPanel>

            <Card className="p-3">
              <p className="mb-3 font-label-caps text-on-surface-variant">
                Dependency Graph
              </p>
              <ul className="space-y-2 font-mono text-sm text-on-surface-variant">
                <li className="flex items-center gap-2 text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  AuthService
                </li>
                <li className="pl-4">→ AxiosInterceptor</li>
                <li className="pl-4">→ LocalStorage</li>
                <li className="pl-4">→ UserStore (C...)</li>
              </ul>
            </Card>

            <Card className="p-3">
              <p className="mb-2 font-label-caps text-on-surface-variant">
                Context Health
              </p>
              <div className="space-y-2">
                {[
                  { label: "Functions", value: 46, color: "bg-primary" },
                  { label: "Classes", value: 35, color: "bg-secondary" },
                  { label: "Imports", value: 13, color: "bg-tertiary" },
                  { label: "Misc", value: 6, color: "bg-outline" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${item.color}`}
                    />
                    <span className="flex-1 text-xs text-on-surface-variant">
                      {item.label}
                    </span>
                    <span className="font-mono text-xs text-on-surface">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="ai-insight-border p-4">
              <p className="text-sm leading-relaxed text-on-surface-variant">
                JWT validation can be extracted to a shared middleware.
                Consider rotating secrets via environment-backed key store.
              </p>
            </Card>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}