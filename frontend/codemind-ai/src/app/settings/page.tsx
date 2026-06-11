"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Database,
  RefreshCw,
  Settings2,
  Sliders,
  Zap,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { getBackendSettings, getCollectionInfo, type BackendSettings } from "@/lib/api/client";

type CollectionInfo = {
  vectors_count: number;
  indexed_vectors_count: number;
  status: string;
};

type LoadState = "loading" | "loaded" | "error";

function SettingRow({
  label,
  description,
  value,
  mono = true,
}: {
  label: string;
  description?: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-outline-variant/40 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-on-surface">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-on-surface-variant">{description}</p>
        )}
      </div>
      <div
        className={`shrink-0 rounded-lg border border-outline-variant bg-surface-container-highest px-3 py-1.5 text-sm ${
          mono ? "font-mono text-primary" : "text-on-surface"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
        <Icon size={16} className="text-primary" />
      </div>
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
        {title}
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const [cfg, setCfg] = useState<BackendSettings | null>(null);
  const [collection, setCollection] = useState<CollectionInfo | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [settings, info] = await Promise.all([
        getBackendSettings(),
        getCollectionInfo(),
      ]);
      setCfg(settings);
      setCollection(info);
      setState("loaded");
      setLastRefresh(new Date());
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-3xl space-y-8 p-[var(--container-padding)]">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-on-surface">
              Intelligence Settings
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Live configuration pulled directly from the backend. Read-only — change
              values via environment variables on Railway.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={state === "loading"}
            className="flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs text-on-surface-variant transition hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <RefreshCw size={13} className={state === "loading" ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Status */}
        {state === "loading" && (
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <RefreshCw size={16} className="animate-spin text-primary" />
            <p className="text-sm text-on-surface-variant">
              Fetching configuration from backend...
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="flex items-center gap-3 rounded-xl border border-tertiary-container/40 bg-tertiary-container/10 p-4">
            <AlertCircle size={16} className="text-tertiary" />
            <div>
              <p className="text-sm font-medium text-tertiary">
                Could not reach backend
              </p>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                Make sure the Railway backend is running and{" "}
                <span className="font-mono">NEXT_PUBLIC_API_URL</span> is set correctly.
              </p>
            </div>
          </div>
        )}

        {state === "loaded" && cfg && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Connected indicator */}
            <div className="flex items-center gap-2 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-2.5">
              <CheckCircle2 size={14} className="text-secondary" />
              <p className="text-sm text-secondary">
                Backend connected
                {lastRefresh && (
                  <span className="ml-2 text-xs text-on-surface-variant">
                    · refreshed {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>

            {/* LLM Configuration */}
            <Card className="p-5">
              <SectionHeader icon={Brain} title="LLM Configuration" />
              <div className="mt-4">
                <SettingRow
                  label="Generation Model"
                  description="Primary model used to answer questions about your code."
                  value={cfg.generation_model}
                />
                <SettingRow
                  label="Embedding Model"
                  description="Model used to generate vector embeddings for semantic search."
                  value={cfg.embedding_model}
                />
                <SettingRow
                  label="Max Output Tokens"
                  description="Maximum tokens in a generated response. Higher = longer answers."
                  value={cfg.generation_max_output_tokens.toLocaleString()}
                />
                <SettingRow
                  label="Temperature"
                  description="Controls randomness. Lower is more deterministic."
                  value={cfg.generation_temperature.toFixed(2)}
                />
              </div>
            </Card>

            {/* Vector Store */}
            <Card className="p-5">
              <SectionHeader icon={Database} title="Vector Store (Qdrant)" />
              <div className="mt-4">
                <SettingRow
                  label="Collection"
                  description="Qdrant collection name holding all indexed code chunks."
                  value={cfg.qdrant_collection}
                />
                <SettingRow
                  label="Embedding Dimensions"
                  description="Vector size — must match the embedding model output."
                  value={cfg.embedding_dim.toLocaleString()}
                />
                <SettingRow
                  label="Search Limit"
                  description="Number of top-k chunks retrieved per query."
                  value={cfg.search_limit.toString()}
                />
                <SettingRow
                  label="Max Context Characters"
                  description="Total characters of code context sent to the LLM per request."
                  value={cfg.max_context_chars.toLocaleString()}
                />
                {collection && (
                  <>
                    <SettingRow
                      label="Total Vectors"
                      description="Total number of indexed code chunks across all repositories."
                      value={
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              collection.status === "green"
                                ? "bg-secondary"
                                : "bg-tertiary"
                            }`}
                          />
                          {collection.vectors_count?.toLocaleString() ?? "—"}
                        </span>
                      }
                      mono={false}
                    />
                    <SettingRow
                      label="Collection Status"
                      description="Qdrant collection health."
                      value={collection.status}
                    />
                  </>
                )}
              </div>
            </Card>

            {/* Scanning */}
            <Card className="p-5">
              <SectionHeader icon={Sliders} title="Repository Scanning" />
              <div className="mt-4">
                <SettingRow
                  label="Max Scan Files"
                  description="Maximum files scanned per repository."
                  value={cfg.max_scan_files.toLocaleString()}
                />
                <SettingRow
                  label="Ignored Directories"
                  description="Directories skipped during scanning."
                  value={
                    <div className="flex flex-wrap justify-end gap-1 max-w-xs">
                      {cfg.ignore_directories.map((d) => (
                        <span
                          key={d}
                          className="rounded bg-surface-variant px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  }
                  mono={false}
                />
              </div>
            </Card>

            {/* Tips */}
            <Card className="p-5">
              <SectionHeader icon={Zap} title="Configuration Tips" />
              <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
                <p>
                  · To change any setting, set the corresponding environment variable
                  on your Railway backend deployment.
                </p>
                <p>
                  · <span className="font-mono text-primary">GENERATION_MAX_OUTPUT_TOKENS</span> —
                  raise to 8192 for very detailed architecture explanations.
                </p>
                <p>
                  · <span className="font-mono text-primary">SEARCH_LIMIT</span> —
                  raise to 10–15 for broader context, lower for speed.
                </p>
                <p>
                  · <span className="font-mono text-primary">GENERATION_TEMPERATURE</span> —
                  keep at 0.1–0.3 for factual code answers.
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}