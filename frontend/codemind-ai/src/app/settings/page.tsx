"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const sections = [
  {
    title: "LLM Configuration",
    items: [
      {
        label: "Inference Model",
        description: "Choose the primary engine for code generation.",
        control: (
          <div className="relative w-full md:w-64">
            <select className="w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option>GPT-4o (Default)</option>
              <option>Claude 3.5 Sonnet</option>
              <option>Llama 3.1 405B</option>
            </select>
          </div>
        ),
      },
      {
        label: "Temperature",
        description: "Controls randomness. Lower is more deterministic.",
        control: <TemperatureControl />,
      },
    ],
  },
  {
    title: "Vector Store",
    items: [
      {
        label: "Indexing Depth",
        description: "How deep to crawl folder structures for context.",
        control: <IndexingDepthControl />,
      },
      {
        label: "Ignore Patterns",
        description: "Comma separated glob patterns to exclude from embedding.",
        control: (
          <textarea
            defaultValue={"node_modules/**, .git/**, dist/**"}
            className="min-h-[100px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-4 font-mono text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        ),
      },
    ],
  },
  {
    title: "Personalization",
    items: [
      {
        label: "Custom Instructions",
        description: "Guide the AI's personality and coding style across all chats.",
        control: (
          <textarea
            placeholder="e.g. 'Always use TypeScript with strict types. Prefer functional programming patterns. Keep explanations concise and technical.'"
            className="min-h-[140px] w-full rounded-lg border border-outline-variant border-l-[3px] border-l-primary bg-surface-container-lowest p-4 text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        ),
      },
    ],
  },
  {
    title: "Appearance",
    items: [
      {
        label: "Theme",
        description: "Choose your preferred color theme.",
        control: (
          <div className="relative w-full md:w-64">
            <select className="w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option>Dark (Default)</option>
              <option>Light</option>
              <option>System</option>
            </select>
          </div>
        ),
      },
      {
        label: "Font Size",
        description: "Editor and interface font size.",
        control: (
          <div className="relative w-full md:w-64">
            <select className="w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option>13px (Default)</option>
              <option>14px</option>
              <option>16px</option>
            </select>
          </div>
        ),
      },
    ],
  },
];

function TemperatureControl() {
  const [value, setValue] = useState(0.7);
  return (
    <div className="w-full space-y-3">
      <div className="flex justify-end">
        <span className="rounded bg-surface-variant px-2 py-0.5 font-mono text-sm text-primary">
          {value.toFixed(1)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.1}
        value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function IndexingDepthControl() {
  const [depth, setDepth] = useState(4);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2">
      <button
        type="button"
        onClick={() => setDepth((d) => Math.max(1, d - 1))}
        className="text-lg text-on-surface-variant hover:text-primary transition"
      >
        −
      </button>
      <span className="w-4 text-center font-mono text-on-surface">{depth}</span>
      <button
        type="button"
        onClick={() => setDepth((d) => Math.min(10, d + 1))}
        className="text-lg text-on-surface-variant hover:text-primary transition"
      >
        +
      </button>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <div className="flex-1 overflow-y-auto">
        <section className="mx-auto max-w-4xl space-y-10 p-[var(--container-padding)]">
          {sections.map((section, si) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.08 }}
            >
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {section.title}
              </h2>
              <Card className="divide-y divide-outline-variant overflow-hidden">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between"
                  >
                    <div className="md:max-w-xs">
                      <p className="font-semibold text-on-surface">{item.label}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {item.description}
                      </p>
                    </div>
                    <div className="w-full md:w-auto md:min-w-[240px]">
                      {item.control}
                    </div>
                  </div>
                ))}
              </Card>
            </motion.div>
          ))}

          <Button variant="primary" size="lg">
            Save Changes
          </Button>
        </section>
      </div>
    </AppShell>
  );
}