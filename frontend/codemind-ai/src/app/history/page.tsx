"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, MessageSquare, Trash2, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HISTORY_KEY = "codemind_chat_history";
const SESSION_KEY = "codemind_current_session_id";

type ChatSession = {
  id: string;
  title: string;
  repo: string;
  timestamp: number;
  messageCount: number;
  preview: string;
};

function loadHistory(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const router = useRouter();

  useEffect(() => {
    setSessions(loadHistory().sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const openSession = (session: ChatSession) => {
    // Use the same key that chat/page.tsx reads on mount
    localStorage.setItem(SESSION_KEY, session.id);
    router.push("/chat");
  };

  const groupedSessions = sessions.reduce<Record<string, ChatSession[]>>(
    (acc, s) => {
      const diff = Date.now() - s.timestamp;
      const days = Math.floor(diff / 86400000);
      const group =
        days === 0
          ? "Today"
          : days === 1
            ? "Yesterday"
            : days < 7
              ? "This week"
              : "Older";
      if (!acc[group]) acc[group] = [];
      acc[group].push(s);
      return acc;
    },
    {}
  );

  const groupOrder = ["Today", "Yesterday", "This week", "Older"];

  return (
    <AppShell title="Session History">
      <div className="mx-auto max-w-3xl space-y-8 p-[var(--container-padding)]">
        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-24 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high">
              <MessageSquare size={24} className="text-on-surface-variant" />
            </div>
            <p className="text-lg font-medium text-on-surface">No chat history yet</p>
            <p className="text-sm text-on-surface-variant">
              Start a conversation in the Chat page and your sessions will appear here.
            </p>
            <Button variant="primary" onClick={() => router.push("/chat")}>
              Go to Chat
            </Button>
          </motion.div>
        ) : (
          groupOrder.map((group) => {
            const groupSessions = groupedSessions[group];
            if (!groupSessions?.length) return null;
            return (
              <div key={group}>
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-on-surface-variant">
                  {group}
                </p>
                <div className="space-y-3">
                  {groupSessions.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      {/* group class added so delete button hover works */}
                      <Card
                        className="group flex cursor-pointer items-center justify-between p-4 transition hover:border-primary/40"
                        onClick={() => openSession(s)}
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                            <MessageSquare size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-on-surface">
                              {s.title}
                            </p>
                            <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                              <Clock size={12} />
                              {formatTime(s.timestamp)}
                              {s.repo && (
                                <>
                                  <span>·</span>
                                  <span className="truncate font-mono text-xs">
                                    {s.repo}
                                  </span>
                                </>
                              )}
                            </p>
                            {s.preview && (
                              <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                                {s.preview}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="ml-4 flex shrink-0 items-center gap-2">
                          <span className="font-mono text-xs text-on-surface-variant">
                            {s.messageCount} msgs
                          </span>
                          {/* opacity-0 + group-hover:opacity-100 now works because Card has group class */}
                          <button
                            type="button"
                            onClick={(e) => deleteSession(s.id, e)}
                            className="rounded p-1.5 text-on-surface-variant opacity-0 transition hover:bg-surface-variant hover:text-tertiary group-hover:opacity-100"
                            aria-label="Delete session"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight size={16} className="text-on-surface-variant" />
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}