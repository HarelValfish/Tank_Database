import { motion } from "framer-motion";

// Fallback image when a tank has no imageUrl, or the URL fails to load.
const FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect width='100%' height='100%' fill='%2315191c'/><text x='50%' y='50%' fill='%233a4248' font-family='monospace' font-size='13' text-anchor='middle' dominant-baseline='middle'>NO FEED</text></svg>`
  );

// Compact tech-tree "node": a small card with the vehicle thumbnail on top,
// the tank name, and (only if present) the variant below it. Shares layoutId
// values with the detail modal so it morphs smoothly on open.
export default function TankCard({ tank, onSelect }) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(tank)}
      layoutId={`card-${tank.id}`}
      variants={{
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0 },
      }}
      whileHover={{ y: -4, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="corner-brackets group relative w-44 shrink-0 overflow-hidden rounded-md border border-ink-700 bg-ink-850 text-left outline-none transition-colors duration-300 hover:border-amber/60 focus-visible:ring-2 focus-visible:ring-amber/60"
    >
      {/* Thumbnail */}
      <div className="relative h-24 w-full overflow-hidden">
        <motion.img
          layoutId={`img-${tank.id}`}
          src={tank.imageUrl || FALLBACK}
          onError={(e) => (e.currentTarget.src = FALLBACK)}
          alt={`${tank.tankName} ${tank.variant}`}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-850 via-ink-850/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 tactical-grid opacity-40" />

        {/* Scanline sweep on hover */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute left-0 top-0 h-1/3 w-full animate-scan bg-gradient-to-b from-amber/25 to-transparent" />
        </div>
      </div>

      {/* Body — name on top, variant below (only when present) */}
      <div className="space-y-1 px-3 py-2.5">
        <motion.h3
          layoutId={`title-${tank.id}`}
          className="truncate font-display text-sm font-600 tracking-wide text-ink-50"
          title={tank.tankName}
        >
          {tank.tankName}
        </motion.h3>

        {tank.variant && (
          <p
            className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-amber/80"
            title={tank.variant}
          >
            <span className="text-ink-500">VARIANT · </span>
            {tank.variant}
          </p>
        )}
      </div>
    </motion.button>
  );
}
