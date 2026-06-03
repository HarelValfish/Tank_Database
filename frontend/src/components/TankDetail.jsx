import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X, Weight, Users, Gauge, Crosshair, Calendar, ScrollText, FileText, Pencil, Trash2, Loader2,
} from "lucide-react";

const FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'><rect width='100%' height='100%' fill='%2315191c'/><text x='50%' y='50%' fill='%233a4248' font-family='monospace' font-size='28' text-anchor='middle' dominant-baseline='middle'>NO IMAGE FEED</text></svg>`
  );

function SpecCard({ icon: Icon, label, value }) {
  return (
    <div className="corner-brackets rounded-md border border-ink-700 bg-ink-900/60 p-4">
      <div className="mb-2 flex items-center gap-2 text-amber">
        <Icon size={15} />
        <span className="label-mono text-amber/80">{label}</span>
      </div>
      <p className="font-display text-lg font-600 text-ink-50">{value || "—"}</p>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-amber" />
        <h4 className="font-display text-sm font-600 uppercase tracking-[0.2em] text-ink-200">
          {title}
        </h4>
        <span className="h-px flex-1 bg-ink-700" />
      </div>
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-300">{children}</p>
    </section>
  );
}

export default function TankDetail({ tank, onClose, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(tank);
      // On success the parent unmounts this modal; no need to reset state.
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  // Lock body scroll while the modal is open, and close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const specs = tank.specifications || {};

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-ink-950/85 backdrop-blur-sm"
        aria-hidden
      />

      {/* Morphing panel — shares layoutId with the source card */}
      <motion.div
        layoutId={`card-${tank.id}`}
        className="scanlines relative z-10 my-auto w-full max-w-4xl overflow-hidden rounded-xl border border-ink-600 bg-ink-850 shadow-panel"
      >
        {/* Hero image */}
        <div className="relative h-64 w-full overflow-hidden sm:h-80">
          <motion.img
            layoutId={`img-${tank.id}`}
            src={tank.imageUrl || FALLBACK}
            onError={(e) => (e.currentTarget.src = FALLBACK)}
            alt={`${tank.tankName} ${tank.variant}`}
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-850 via-ink-850/30 to-transparent" />
          <div className="pointer-events-none absolute inset-0 tactical-grid opacity-30" />

          {/* Top-right actions: Delete + Edit + Close */}
          <div className="absolute right-4 top-4 flex items-center gap-2">
            {onDelete &&
              (confirmDelete ? (
                <div className="flex items-center gap-2 rounded-md border border-alert/60 bg-ink-950/80 px-2 py-1 backdrop-blur">
                  <span className="font-mono text-[11px] uppercase tracking-wide text-alert">Delete?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1 rounded bg-alert/90 px-2 py-1 font-display text-[11px] font-600 uppercase tracking-wide text-white transition hover:bg-alert disabled:opacity-60"
                  >
                    {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="rounded px-2 py-1 font-display text-[11px] font-600 uppercase tracking-wide text-ink-300 transition hover:text-ink-100"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="grid h-10 w-10 place-items-center rounded-md border border-ink-600 bg-ink-950/70 text-ink-300 backdrop-blur transition hover:border-alert/60 hover:text-alert"
                  aria-label="Delete this tank"
                  title="Delete this tank"
                >
                  <Trash2 size={16} />
                </button>
              ))}

            {onEdit && (
              <button
                onClick={() => onEdit(tank)}
                className="flex h-10 items-center gap-1.5 rounded-md border border-amber/50 bg-ink-950/70 px-3 font-display text-xs font-600 uppercase tracking-wide text-amber-glow backdrop-blur transition hover:bg-amber/20"
                aria-label="Edit this tank"
              >
                <Pencil size={15} /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-md border border-ink-600 bg-ink-950/70 text-ink-200 backdrop-blur transition hover:border-alert/60 hover:text-alert"
              aria-label="Close detail view"
            >
              <X size={18} />
            </button>
          </div>

          {/* Title block over image */}
          <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-wrap items-center gap-3"
            >
              {tank.variant && (
                <span className="rounded border border-amber/40 bg-amber/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-amber-glow">
                  {tank.variant}
                </span>
              )}
              {tank.serviceTime && (
                <span className="flex items-center gap-1.5 font-mono text-xs text-ink-300">
                  <Calendar size={12} className="text-olive" /> {tank.serviceTime}
                </span>
              )}
            </motion.div>
            <motion.h2
              layoutId={`title-${tank.id}`}
              className="mt-2 font-display text-4xl font-700 tracking-wide text-ink-50 sm:text-5xl"
            >
              {tank.tankName}
            </motion.h2>
          </div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8 p-6 sm:p-8"
        >
          {tank.armament && (
            <div className="flex items-center gap-3 rounded-md border border-ink-700 bg-ink-900/60 px-4 py-3">
              <Crosshair size={18} className="text-amber" />
              <div>
                <span className="label-mono block text-amber/70">Primary Armament</span>
                <span className="font-mono text-sm text-ink-100">{tank.armament}</span>
              </div>
            </div>
          )}

          {/* Specifications grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SpecCard icon={Weight} label="Weight" value={specs.weight} />
            <SpecCard icon={Users} label="Crew" value={specs.crewSize} />
            <SpecCard icon={Gauge} label="Top Speed" value={specs.speed} />
          </div>

          {tank.description && (
            <Section icon={FileText} title="Overview">
              {tank.description}
            </Section>
          )}

          {tank.history && (
            <Section icon={ScrollText} title="Service History">
              {tank.history}
            </Section>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
