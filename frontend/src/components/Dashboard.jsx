import { motion } from "framer-motion";
import { SearchX, ServerCrash, RotateCw } from "lucide-react";
import TankCard from "./TankCard.jsx";

// Stagger the nodes within each era band as they appear.
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

// Derives a decade bucket from a serviceTime string ("2004–Present" → 2000s).
function decadeInfo(serviceTime) {
  const m = String(serviceTime || "").match(/\d{4}/);
  if (!m) return null;
  const year = parseInt(m[0], 10);
  const decade = year - (year % 10);
  return {
    key: decade,
    short: `${String(decade % 100).padStart(2, "0")}s`, // "70s", "00s"
    full: `${decade}s`, // "1970s", "2000s"
  };
}

// Groups tanks into era bands, sorted oldest → newest (unknown era last).
function groupByEra(tanks) {
  const map = new Map();
  for (const t of tanks) {
    const info = decadeInfo(t.serviceTime);
    const key = info ? info.key : Infinity;
    if (!map.has(key)) map.set(key, { info, tanks: [] });
    map.get(key).tanks.push(t);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, val]) => ({
      key,
      short: val.info ? val.info.short : "??",
      full: val.info ? val.info.full : "Unknown",
      tanks: val.tanks,
    }));
}

export default function Dashboard({ tanks, loading, error, onSelect, onRetry }) {
  // 1) Loading → compact skeleton bands
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {[0, 1].map((b) => (
          <div key={b} className="flex gap-5 border-b border-ink-800/80 py-7">
            <div className="w-14 shrink-0 sm:w-20">
              <div className="h-7 w-12 rounded bg-ink-800" />
            </div>
            <div className="flex flex-wrap gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-44 overflow-hidden rounded-md border border-ink-700 bg-ink-850">
                  <div className="h-24 w-full animate-pulse bg-ink-800" />
                  <div className="space-y-2 px-3 py-2.5">
                    <div className="h-3.5 w-3/4 rounded bg-ink-700" />
                    <div className="h-2.5 w-1/2 rounded bg-ink-800" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2) Error
  if (error) {
    return (
      <Centered>
        <ServerCrash size={40} className="text-alert" />
        <h3 className="font-display text-xl font-600 text-ink-100">Connection Lost</h3>
        <p className="max-w-sm font-mono text-sm text-ink-400">{error}</p>
        <button
          onClick={onRetry}
          className="mt-2 flex items-center gap-2 rounded-md border border-amber/50 bg-amber/10 px-4 py-2.5 font-display text-sm font-600 tracking-wide text-amber-glow transition hover:bg-amber/20"
        >
          <RotateCw size={15} /> RECONNECT
        </button>
      </Centered>
    );
  }

  // 3) Empty
  if (tanks.length === 0) {
    return (
      <Centered>
        <SearchX size={40} className="text-ink-500" />
        <h3 className="font-display text-xl font-600 text-ink-100">No Units Found</h3>
        <p className="max-w-sm font-mono text-sm text-ink-400">
          No records match the current parameters. Adjust your filters or commission a new unit.
        </p>
      </Centered>
    );
  }

  // 4) Tech-tree: era bands (ranks) of compact nodes
  const groups = groupByEra(tanks);

  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      {groups.map((g) => (
        <section key={g.key} className="flex gap-4 border-b border-ink-800/80 py-7 sm:gap-6">
          {/* Era rail (the "rank" marker) */}
          <div className="flex w-12 shrink-0 flex-col border-r border-ink-800 pr-3 sm:w-20 sm:pr-5">
            <span className="font-display text-2xl font-700 leading-none text-amber-glow sm:text-4xl">
              {g.short}
            </span>
            <span className="label-mono mt-1.5 hidden text-ink-500 sm:block">{g.full}</span>
            <span className="label-mono mt-2 text-ink-600">
              {g.tanks.length} {g.tanks.length === 1 ? "unit" : "units"}
            </span>
          </div>

          {/* Node row */}
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className="flex flex-1 flex-wrap gap-3 sm:gap-4"
          >
            {g.tanks.map((t) => (
              <TankCard key={t.id} tank={t} onSelect={onSelect} />
            ))}
          </motion.div>
        </section>
      ))}
    </div>
  );
}

function Centered({ children }) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-5 py-24 text-center sm:px-8">
      {children}
    </div>
  );
}
