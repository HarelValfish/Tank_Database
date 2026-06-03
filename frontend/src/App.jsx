import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Header from "./components/Header.jsx";
import FilterBar from "./components/FilterBar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import TankDetail from "./components/TankDetail.jsx";
import AddTankForm from "./components/AddTankForm.jsx";
import AiImportPanel from "./components/AiImportPanel.jsx";
import { api } from "./lib/api.js";
import { useToast } from "./context/ToastContext.jsx";

export default function App() {
  const toast = useToast();

  // Data
  const [tanks, setTanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [variant, setVariant] = useState("All");
  const [era, setEra] = useState("All");
  const [filterMeta, setFilterMeta] = useState({ variants: [], eras: [] });

  // UI
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null); // tank being edited, or null
  const [aiOpen, setAiOpen] = useState(false); // local-only AI import panel

  // Fetch tanks for the current filter set.
  const fetchTanks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getTanks({ search, variant, era });
      setTanks(data);
    } catch (err) {
      setError(err.message || "Unable to reach the registry.");
    } finally {
      setLoading(false);
    }
  }, [search, variant, era]);

  // Debounce filter changes so typing doesn't spam the API.
  const debounceRef = useRef();
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchTanks, 280);
    return () => clearTimeout(debounceRef.current);
  }, [fetchTanks]);

  // Load filter dropdown options once.
  const loadFilters = useCallback(async () => {
    try {
      setFilterMeta(await api.getFilters());
    } catch {
      /* non-critical — dropdowns just stay minimal */
    }
  }, []);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  // After a create or edit, refresh the grid + filter options.
  // When editing an existing tank, close the detail modal so the user returns
  // to the refreshed grid with no lingering backdrop overlay. (If a fresh tank
  // is being added, preserve any open detail view.)
  const handleSaved = (saved) => {
    fetchTanks();
    loadFilters();
    if (editing) {
      // Edit path: dismiss the detail modal — the grid refresh shows the
      // updated card. This eliminates the stray backdrop that appeared when
      // TankDetail stayed open after the edit slide-over closed.
      setSelected(null);
    } else {
      // Add path: keep any open detail view in sync (no-op in practice since
      // adding a new tank doesn't affect an already-selected different tank).
      setSelected((cur) => (cur && saved && cur.id === saved.id ? saved : cur));
    }
  };

  const closeEditor = () => {
    setAdding(false);
    setEditing(null);
  };

  // Delete a tank: remove from DB, close the detail modal, refresh grid + filters.
  const handleDelete = async (tank) => {
    try {
      await api.deleteTank(tank.id);
      toast.success(`${tank.tankName} removed from registry.`);
      setSelected(null);
      fetchTanks();
      loadFilters();
    } catch (err) {
      toast.error(err.message || "Failed to delete tank.");
      throw err; // let the modal reset its confirm/deleting state
    }
  };

  return (
    <div className="min-h-screen tactical-grid">
      <Header
        count={tanks.length}
        onAdd={() => setAdding(true)}
        onAiImport={() => setAiOpen(true)}
      />

      {/* Hero strip */}
      <section className="mx-auto max-w-7xl px-5 pt-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="label-mono text-amber/80">// Classified Field Registry</span>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-700 leading-tight tracking-wide text-ink-50 sm:text-4xl">
            The complete record of <span className="text-amber-glow">Israeli armor</span> — from
            Centurion to Merkava.
          </h2>
          <p className="mt-3 max-w-xl font-body text-sm text-ink-400">
            Browse specifications, armament, and service history. Search the archive or commission a
            new unit into the database.
          </p>
        </motion.div>
      </section>

      <FilterBar
        search={search}
        onSearch={setSearch}
        variant={variant}
        onVariant={setVariant}
        era={era}
        onEra={setEra}
        variants={filterMeta.variants}
        eras={filterMeta.eras}
        resultCount={tanks.length}
      />

      {/* Grid + detail share a layout group so cards morph into the modal */}
      <LayoutGroup>
        <Dashboard
          tanks={tanks}
          loading={loading}
          error={error}
          onSelect={setSelected}
          onRetry={fetchTanks}
        />

        <AnimatePresence>
          {selected && (
            <TankDetail
              tank={selected}
              onClose={() => setSelected(null)}
              onEdit={(t) => setEditing(t)}
              onDelete={handleDelete}
            />
          )}
        </AnimatePresence>
      </LayoutGroup>

      {/* Add / Edit slide-over (same form, edit mode when `editing` is set) */}
      <AnimatePresence>
        {(adding || editing) && (
          <AddTankForm tank={editing} onClose={closeEditor} onSaved={handleSaved} />
        )}
      </AnimatePresence>

      {/* Local-only AI bulk importer */}
      <AnimatePresence>
        {aiOpen && (
          <AiImportPanel
            onClose={() => setAiOpen(false)}
            onSaved={() => {
              fetchTanks();
              loadFilters();
            }}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mx-auto mt-16 max-w-7xl border-t border-ink-800 px-5 py-8 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <span className="label-mono text-ink-500">ARMOR/DB · Field Registry v1.0</span>
          <span className="label-mono text-ink-600">Educational reference · Non-operational</span>
        </div>
      </footer>
    </div>
  );
}
