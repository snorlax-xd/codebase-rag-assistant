"use client";

import { motion } from "framer-motion";
import { Clock, MessageSquare } from "lucide-react";
import Link from "next/link";

import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";

const sessions = [
  { id: "1", title: "JWT middleware refactor", time: "2h ago", tokens: "14.2k" },
  { id: "2", title: "Vector store migration", time: "Yesterday", tokens: "8.1k" },
  { id: "3", title: "API gateway architecture", time: "3 days ago", tokens: "22.4k" },
];

export default function HistoryPage() {
  return (
    <AppShell title="Session History">
      <div className="mx-auto max-w-3xl space-y-4 p-[var(--container-padding)]">
        {sessions.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Link href="/chat">
              <Card className="flex items-center justify-between p-4 transition hover:border-primary/40">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-on-surface">{s.title}</p>
                    <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <Clock size={14} />
                      {s.time}
                    </p>
                  </div>
                </div>
                <span className="font-code-sm text-xs text-on-surface-variant">{s.tokens}</span>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}
