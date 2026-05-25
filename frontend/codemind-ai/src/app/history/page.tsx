"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Clock, MessageSquare, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

function isChatSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<ChatSession>;

  return (
    typeof session.id === "string" &&
    typeof session.title === "string" &&
    typeof session.timestamp === "number"
  );
}

function loadHistory(): ChatSession[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isChatSession).map((session) => ({
      id: session.id,
      title: session.title || "Untitled session",
      repo: session.repo || "",
      timestamp: session.timestamp,
      messageCount: Number.isFinite(session.messageCount)
        ? session.messageCount
        : 0,
      preview: session.preview || "",
    }));
  } catch {
    localStorage.removeItem(HISTORY_KEY);
    return [];
  }
}

function formatTime(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function getGroupLabel(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp);
  const days = Math.floor(diff / 86400000);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This week";
  return "Older";
}

export default function HistoryPage() {
  const router = useRouter();

  const [sessions, setSessions] = useState<ChatSession[]>(() =>
    loadHistory().sort((a, b) => b.timestamp - a.timestamp)
  );

  const groupedSessions = useMemo(() => {
    return sessions.reduce<Record<string, ChatSession[]>>((acc, session) => {
      const group = getGroupLabel(session.timestamp);
      if (!acc[group]) acc[group] = [];
      acc[group].push(session);
      return acc;
    }, {});
  }, [sessions]);

  const deleteSession = (id: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setSessions((current) => {
      const updated = current.filter((session) => session.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const openSession = (session: ChatSession) => {
    localStorage.setItem(SESSION_KEY, session.id);
    router.push("/chat");
  };

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

            <p className="text-lg font-medium text-on-surface">
              No chat history yet
            </p>

            <p className="text-sm text-on-surface-variant">
              Start a conversation in the Chat page and your sessions will
              appear here.
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
              <section key={group}>
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-on-surface-variant">
                  {group}
                </p>

                <div className="space-y-3">
                  {groupSessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="group flex cursor-pointer items-center justify-between p-4 transition hover:border-primary/40"
                        onClick={() => openSession(session)}
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                            <MessageSquare size={18} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-medium text-on-surface">
                              {session.title}
                            </p>

                            <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                              <Clock size={12} />
                              {formatTime(session.timestamp)}
                              {session.repo && (
                                <>
                                  <span>|</span>
                                  <span className="truncate font-mono text-xs">
                                    {session.repo}
                                  </span>
                                </>
                              )}
                            </p>

                            {session.preview && (
                              <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                                {session.preview}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="ml-4 flex shrink-0 items-center gap-2">
                          <span className="font-mono text-xs text-on-surface-variant">
                            {session.messageCount} msgs
                          </span>

                          <button
                            type="button"
                            onClick={(event) =>
                              deleteSession(session.id, event)
                            }
                            className="rounded p-1.5 text-on-surface-variant opacity-0 transition hover:bg-surface-variant hover:text-tertiary group-hover:opacity-100"
                            aria-label="Delete session"
                          >
                            <Trash2 size={14} />
                          </button>

                          <ChevronRight
                            size={16}
                            className="text-on-surface-variant"
                          />
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </AppShell>
  );
}