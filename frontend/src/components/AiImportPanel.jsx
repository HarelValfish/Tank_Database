import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Sparkles, Loader2, Save, Trash2, ImageDown, ImageOff } from "lucide-react";
import { api, fetchTankImage } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";

// Compact labeled input used throughout the editable preview grid.
function In({ label, value, onChange, placeholder, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="label-mono text-ink-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded border border-ink-700 bg-ink-900 px-2.5 py-1.5 font-body text-sm text-ink-100 placeholder:text-ink-600 outline-none transition focus:border-amber/60 focus:ring-1 focus:ring-amber/40"
      />
    </label>
  );
}

const FALLBACK_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='100'><rect width='100%' height='100%' fill='%2315191c'/><text x='50%' y='50%' fill='%233a4248' font-family='monospace' font-size='11' text-anchor='middle' dominant-baseline='middle'>NO IMAGE</text></svg>`
  );

// Local-only AI bulk importer. Prompt → generate → editable preview → save many.
export default function AiImportPanel({ onClose, onSaved }) {
  const toast = useToast();
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(6);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]); // generated tanks, with a _key for React

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Enriches each row's image from Wikipedia, spaced out to be gentle on the API.
  const enrichImages = async (list) => {
    for (const row of list) {
      if (row.imageUrl) continue;
      try {
        const q = row.variant ? `${row.tankName} ${row.variant}` : row.tankName;
        const url = await fetchTankImage(q);
        if (url) {
          setRows((prev) => prev.map((r) => (r._key === row._key ? { ...r, imageUrl: url } : r)));
        }
      } catch {
        /* image is optional — skip on failure */
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.info("Describe what to add, e.g. “the Leopard 2 family”.");
      return;
    }
    setGenerating(true);
    try {
      const { tanks } = await api.generateTanks({ prompt: prompt.trim(), count });
      const withKeys = tanks.map((t, i) => ({ ...t, _key: `${Date.now()}-${i}` }));
      setRows(withKeys);
      toast.success(`Generated ${withKeys.length} vehicle(s). Review & edit, then save.`);
      enrichImages(withKeys);
    } catch (e) {
      toast.error(e.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const updateRow = (key, field, value) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r;
        if (field.startsWith("spec.")) {
          return { ...r, specifications: { ...r.specifications, [field.slice(5)]: value } };
        }
        return { ...r, [field]: value };
      })
    );

  const removeRow = (key) => setRows((prev) => prev.filter((r) => r._key !== key));

  const refetchImage = async (row) => {
    const q = row.variant ? `${row.tankName} ${row.variant}` : row.tankName;
    if (!q.trim()) return;
    try {
      const url = await fetchTankImage(q);
      if (url) updateRow(row._key, "imageUrl", url);
      else toast.error(`No image found for “${row.tankName}”.`);
    } catch (e) {
      toast.error(e.message || "Image lookup failed.");
    }
  };

  const handleSaveAll = async () => {
    if (!rows.length) return;
    if (rows.some((r) => !String(r.tankName).trim())) {
      toast.error("Every vehicle needs a name.");
      return;
    }
    setSaving(true);
    try {
      const tanks = rows.map(({ _key, ...t }) => t); // drop the local key
      const { count: n } = await api.bulkCreateTanks({ tanks });
      toast.success(`Saved ${n} vehicle(s) to the registry.`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div onClick={onClose} className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm" aria-hidden />

      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 36 }}
        className="scanlines relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-ink-600 bg-ink-850 shadow-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-700 px-6 py-5">
          <div>
            <span className="label-mono text-amber/80">Registry · AI Import · Local</span>
            <h2 className="flex items-center gap-2 font-display text-2xl font-700 tracking-wide text-ink-50">
              <Sparkles size={20} className="text-amber" /> Bulk Commission
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-md border border-ink-600 text-ink-300 transition hover:border-alert/60 hover:text-alert"
            aria-label="Close AI import"
          >
            <X size={18} />
          </button>
        </div>

        {/* Prompt bar */}
        <div className="space-y-3 border-b border-ink-700 px-6 py-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="e.g. “the Leopard 2 family”, or “5 Cold-War Soviet main battle tanks”"
            className="w-full resize-none rounded-md border border-ink-700 bg-ink-900 px-3.5 py-2.5 font-body text-sm text-ink-100 placeholder:text-ink-500 outline-none transition focus:border-amber/60 focus:ring-1 focus:ring-amber/40"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="label-mono text-ink-400">Count</span>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="h-9 cursor-pointer rounded border border-ink-700 bg-ink-900 px-2 font-mono text-sm text-ink-100 outline-none focus:border-amber/60"
              >
                {[3, 4, 5, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              disabled={generating}
              className="ml-auto flex items-center gap-2 rounded-md border border-amber/60 bg-amber/15 px-4 py-2 font-display text-sm font-600 tracking-wide text-amber-glow shadow-glow-sm transition hover:bg-amber/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> GENERATING…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> GENERATE
                </>
              )}
            </motion.button>
          </div>
          {generating && (
            <p className="font-mono text-[11px] text-ink-500">
              Running locally via Ollama — the first run can take 20–60s while the model loads.
            </p>
          )}
        </div>

        {/* Preview grid */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {rows.length === 0 && !generating && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-ink-500">
              <Sparkles size={32} className="text-ink-600" />
              <p className="font-mono text-sm">Generated vehicles appear here for review.</p>
              <p className="max-w-xs font-mono text-[11px] text-ink-600">
                Specs come from a local model — double-check them before saving.
              </p>
            </div>
          )}

          {rows.map((r) => (
            <div key={r._key} className="rounded-lg border border-ink-700 bg-ink-900/50 p-3">
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded border border-ink-700 bg-ink-900">
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl}
                      onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
                      alt={r.tankName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-ink-600">
                      <ImageOff size={18} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => refetchImage(r)}
                    title="Re-fetch image from Wikipedia"
                    className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded border border-amber/50 bg-ink-950/80 text-amber-glow transition hover:bg-amber/20"
                  >
                    <ImageDown size={13} />
                  </button>
                </div>

                {/* Primary fields */}
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <In label="Name" value={r.tankName} onChange={(v) => updateRow(r._key, "tankName", v)} />
                  <In label="Variant" value={r.variant} onChange={(v) => updateRow(r._key, "variant", v)} />
                  <In
                    label="Service time"
                    value={r.serviceTime}
                    onChange={(v) => updateRow(r._key, "serviceTime", v)}
                    className="col-span-2"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeRow(r._key)}
                  title="Remove this vehicle"
                  className="h-fit rounded border border-ink-700 p-1.5 text-ink-400 transition hover:border-alert/60 hover:text-alert"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Secondary fields */}
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <In label="Armament" value={r.armament} onChange={(v) => updateRow(r._key, "armament", v)} className="col-span-2" />
                <In label="Weight" value={r.specifications.weight} onChange={(v) => updateRow(r._key, "spec.weight", v)} />
                <In label="Crew" value={r.specifications.crewSize} onChange={(v) => updateRow(r._key, "spec.crewSize", v)} />
                <In label="Speed" value={r.specifications.speed} onChange={(v) => updateRow(r._key, "spec.speed", v)} />
              </div>

              <div className="mt-2 grid gap-2">
                <label className="block">
                  <span className="label-mono text-ink-400">Description</span>
                  <textarea
                    value={r.description}
                    onChange={(e) => updateRow(r._key, "description", e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded border border-ink-700 bg-ink-900 px-2.5 py-1.5 font-body text-sm text-ink-100 outline-none focus:border-amber/60 focus:ring-1 focus:ring-amber/40"
                  />
                </label>
                <label className="block">
                  <span className="label-mono text-ink-400">History</span>
                  <textarea
                    value={r.history}
                    onChange={(e) => updateRow(r._key, "history", e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded border border-ink-700 bg-ink-900 px-2.5 py-1.5 font-body text-sm text-ink-100 outline-none focus:border-amber/60 focus:ring-1 focus:ring-amber/40"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-ink-700 bg-ink-850 px-6 py-4">
          <span className="label-mono text-ink-500">
            {rows.length} {rows.length === 1 ? "vehicle" : "vehicles"} staged
          </span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveAll}
            disabled={saving || rows.length === 0}
            className="ml-auto flex items-center gap-2 rounded-md border border-amber/60 bg-amber/15 px-5 py-2.5 font-display text-sm font-600 tracking-wide text-amber-glow shadow-glow-sm transition hover:bg-amber/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> SAVING…
              </>
            ) : (
              <>
                <Save size={16} /> SAVE ALL
              </>
            )}
          </motion.button>
        </div>
      </motion.aside>
    </motion.div>
  );
}
