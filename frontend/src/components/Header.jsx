import { motion } from "framer-motion";
import { Plus, Radar, Sparkles } from "lucide-react";

// Local-only flag (set in frontend/.env). Absent in production builds, so the
// AI Import button never renders there.
const AI_IMPORT_ENABLED = import.meta.env.VITE_ENABLE_AI_IMPORT === "true";

export default function Header({ count, onAdd, onAiImport }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/80 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative grid h-10 w-10 place-items-center rounded border border-amber/40 bg-ink-850">
            <Radar size={20} className="animate-flicker text-amber" />
            <span className="absolute inset-0 rounded shadow-glow-sm" />
          </div>
          <div className="leading-none">
            <h1 className="font-display text-lg font-700 tracking-[0.18em] text-ink-50">
              ARMOR<span className="text-amber">/</span>DB
            </h1>
            <p className="label-mono mt-1 hidden sm:block">Israeli Armored Corps · Field Registry</p>
          </div>
        </div>

        {/* Status + action */}
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 md:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-olive opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-olive" />
            </span>
            <span className="label-mono text-ink-300">
              {count} {count === 1 ? "UNIT" : "UNITS"} ONLINE
            </span>
          </div>

          {AI_IMPORT_ENABLED && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onAiImport}
              title="Bulk-add vehicles from a prompt (local only)"
              className="flex items-center gap-2 rounded-md border border-olive/50 bg-olive/10 px-4 py-2.5 font-display text-sm font-600 tracking-wide text-olive transition-colors hover:bg-olive/20"
            >
              <Sparkles size={17} />
              <span className="hidden sm:inline">AI IMPORT</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onAdd}
            className="flex items-center gap-2 rounded-md border border-amber/50 bg-amber/10 px-4 py-2.5 font-display text-sm font-600 tracking-wide text-amber-glow shadow-glow-sm transition-colors hover:bg-amber/20"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">NEW UNIT</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
