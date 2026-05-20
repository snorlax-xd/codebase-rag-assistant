"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="flex h-full items-center justify-center text-sm text-zinc-500"
    >
      Initializing editor...
    </motion.div>
  ),
});

type CodeEditorProps = {
  value: string;
  language?: string;
  path?: string;
  readOnly?: boolean;
};

export default function CodeEditor({
  value,
  language = "typescript",
  path,
  readOnly = true,
}: CodeEditorProps) {
  return (
    <MonacoEditor
      height="100%"
      language={language}
      path={path}
      value={value}
      theme="vs-dark"
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 22,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        scrollBeyondLastLine: false,
        padding: { top: 16, bottom: 16 },
        renderLineHighlight: "line",
        roundedSelection: true,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
      }}
    />
  );
}
