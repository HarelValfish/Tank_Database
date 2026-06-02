import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Save, Loader2, ImageOff, Sparkles, ScrollText } from "lucide-react";
import { api, fetchTankImage, fetchTankHistory } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";

const EMPTY = {
  tankName: "",
  variant: "",
  armament: "",
  serviceTime: "",
  imageUrl: "",
  description: "",
  history: "",
  weight: "",
  crewSize: "",
  speed: "",
};

// Flattens a tank document into the flat form shape (specs hoisted to top level).
function tankToForm(t) {
  if (!t) return EMPTY;
  return {
    tankName: t.tankName ?? "",
    variant: t.variant ?? "",
    armament: t.armament ?? "",
    serviceTime: t.serviceTime ?? "",
    imageUrl: t.imageUrl ?? "",
    description: t.description ?? "",
    history: t.history ?? "",
    weight: t.specifications?.weight ?? "",
    crewSize: t.specifications?.crewSize ?? "",
    speed: t.specifications?.speed ?? "",
  };
}

// Reusable labeled field.
function Field({ label, name, value, onChange, error, required, placeholder, textarea, rows = 3 }) {
  const base =
    "w-full rounded-md border bg-ink-900 px-3.5 py-2.5 font-body text-sm text-ink-100 placeholder:text-ink-500 outline-none transition focus:ring-1";
  const tone = error
    ? "border-alert/70 focus:border-alert focus:ring-alert/40"
    : "border-ink-700 focus:border-amber/60 focus:ring-amber/40";

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="label-mono flex items-center gap-1 text-ink-300">
        {label}
        {required && <span className="text-amber">*</span>}
      </label>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          rows={rows}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${base} ${tone} resize-none`}
        />
      ) : (
        <input
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${base} ${tone}`}
        />
      )}
      {error && <p className="font-mono text-[11px] text-alert">{error}</p>}
    </div>
  );
}

export default function AddTankForm({ onClose, onSaved, tank = null }) {
  const isEdit = Boolean(tank);
  const toast = useToast();
  const [form, setForm] = useState(() => tankToForm(tank));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const [fetchingImg, setFetchingImg] = useState(false);
  const [fetchingHist, setFetchingHist] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const update = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
    if (name === "imageUrl") setImgOk(true);
  };

  // Auto-fetch a photo from Wikipedia using the tank's name + variant.
  const handleFetchImage = async () => {
    const name = form.tankName.trim();
    if (!name) {
      setErrors((er) => ({ ...er, tankName: "Enter a tank name first." }));
      toast.info("Enter a tank name, then fetch an image.");
      return;
    }
    setFetchingImg(true);
    try {
      // Variant sharpens the match (e.g. "Merkava Mk 4") when present.
      const query = form.variant.trim() ? `${name} ${form.variant.trim()}` : name;
      const url = await fetchTankImage(query);
      if (url) {
        setForm((f) => ({ ...f, imageUrl: url }));
        setImgOk(true);
        setErrors((er) => ({ ...er, imageUrl: undefined }));
        toast.success(`Image found for "${name}".`);
      } else {
        toast.error(`No image found for "${name}". Try a different name or paste a URL.`);
      }
    } catch (err) {
      toast.error(err.message || "Image lookup failed.");
    } finally {
      setFetchingImg(false);
    }
  };

  // Auto-fetch the History text from Wikipedia using the tank's name + variant.
  const handleFetchHistory = async () => {
    const name = form.tankName.trim();
    if (!name) {
      setErrors((er) => ({ ...er, tankName: "Enter a tank name first." }));
      toast.info("Enter a tank name, then fetch its history.");
      return;
    }
    setFetchingHist(true);
    try {
      const query = form.variant.trim() ? `${name} ${form.variant.trim()}` : name;
      const text = await fetchTankHistory(query);
      if (text) {
        setForm((f) => ({ ...f, history: text }));
        toast.success(`History found for "${name}".`);
      } else {
        toast.error(`No history found for "${name}". Try a different name.`);
      }
    } catch (err) {
      toast.error(err.message || "History lookup failed.");
    } finally {
      setFetchingHist(false);
    }
  };

  // Client-side validation.
  const validate = () => {
    const next = {};
    if (!form.tankName.trim()) next.tankName = "Tank designation is required.";
    else if (form.tankName.trim().length < 2) next.tankName = "Must be at least 2 characters.";

    if (form.imageUrl && !/^(https?:\/\/|data:image\/)/i.test(form.imageUrl.trim())) {
      next.imageUrl = "Must be a valid http(s) or data:image URL.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        tankName: form.tankName.trim(),
        variant: form.variant.trim(),
        armament: form.armament.trim(),
        serviceTime: form.serviceTime.trim(),
        imageUrl: form.imageUrl.trim(),
        description: form.description.trim(),
        history: form.history.trim(),
        specifications: {
          weight: form.weight.trim(),
          crewSize: form.crewSize.trim(),
          speed: form.speed.trim(),
        },
      };
      const saved = isEdit
        ? await api.updateTank(tank.id, payload)
        : await api.createTank(payload);
      toast.success(
        isEdit ? `${saved.tankName} updated.` : `${saved.tankName} added to registry.`
      );
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(err.message || (isEdit ? "Failed to update tank." : "Failed to add tank."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm" aria-hidden />

      {/* Slide-over panel */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 36 }}
        className="scanlines relative z-10 flex h-full w-full max-w-lg flex-col border-l border-ink-600 bg-ink-850 shadow-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-700 px-6 py-5">
          <div>
            <span className="label-mono text-amber/80">
              {isEdit ? "Registry · Modify Entry" : "Registry · New Entry"}
            </span>
            <h2 className="font-display text-2xl font-700 tracking-wide text-ink-50">
              {isEdit ? "Update Unit" : "Commission Unit"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-md border border-ink-600 text-ink-300 transition hover:border-alert/60 hover:text-alert"
            aria-label="Close form"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <Field
              label="Tank Designation"
              name="tankName"
              value={form.tankName}
              onChange={update}
              error={errors.tankName}
              required
              placeholder="e.g. Merkava"
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="Variant"
                name="variant"
                value={form.variant}
                onChange={update}
                placeholder="e.g. Mk 4 M Windbreaker"
              />
              <Field
                label="Service Time"
                name="serviceTime"
                value={form.serviceTime}
                onChange={update}
                placeholder="e.g. 2004–Present"
              />
            </div>

            <Field
              label="Armament"
              name="armament"
              value={form.armament}
              onChange={update}
              placeholder="e.g. 120 mm MG253 smoothbore gun"
            />

            {/* Image URL + auto-fetch by name */}
            <div className="space-y-1.5">
              <label htmlFor="imageUrl" className="label-mono flex items-center gap-1 text-ink-300">
                Image URL
              </label>
              <div className="flex gap-2">
                <input
                  id="imageUrl"
                  name="imageUrl"
                  value={form.imageUrl}
                  onChange={update}
                  placeholder="https://… or fetch by name →"
                  className={`w-full rounded-md border bg-ink-900 px-3.5 py-2.5 font-body text-sm text-ink-100 placeholder:text-ink-500 outline-none transition focus:ring-1 ${
                    errors.imageUrl
                      ? "border-alert/70 focus:border-alert focus:ring-alert/40"
                      : "border-ink-700 focus:border-amber/60 focus:ring-amber/40"
                  }`}
                />
                <button
                  type="button"
                  onClick={handleFetchImage}
                  disabled={fetchingImg}
                  title="Fetch a photo from Wikipedia using the tank name"
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-amber/50 bg-amber/10 px-3 font-display text-xs font-600 uppercase tracking-wide text-amber-glow transition hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {fetchingImg ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  <span className="hidden sm:inline">Fetch</span>
                </button>
              </div>
              {errors.imageUrl && <p className="font-mono text-[11px] text-alert">{errors.imageUrl}</p>}
              <p className="font-mono text-[11px] text-ink-500">
                Paste a link, or click Fetch to pull a photo from Wikipedia by name.
              </p>
            </div>

            {/* Live image preview */}
            {form.imageUrl && !errors.imageUrl && (
              <div className="overflow-hidden rounded-md border border-ink-700">
                {imgOk ? (
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    onError={() => setImgOk(false)}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 bg-ink-900 text-ink-500">
                    <ImageOff size={22} />
                    <span className="font-mono text-xs">Image failed to load</span>
                  </div>
                )}
              </div>
            )}

            {/* Specifications */}
            <div className="rounded-md border border-ink-700 bg-ink-900/40 p-4">
              <span className="label-mono mb-3 block text-amber/80">Specifications</span>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Weight" name="weight" value={form.weight} onChange={update} placeholder="65 t" />
                <Field label="Crew Size" name="crewSize" value={form.crewSize} onChange={update} placeholder="4" />
                <Field label="Speed" name="speed" value={form.speed} onChange={update} placeholder="64 km/h" />
              </div>
            </div>

            <Field
              label="Description"
              name="description"
              value={form.description}
              onChange={update}
              textarea
              placeholder="Short tactical summary…"
            />

            {/* History + auto-fetch from Wikipedia */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="history" className="label-mono text-ink-300">
                  History
                </label>
                <button
                  type="button"
                  onClick={handleFetchHistory}
                  disabled={fetchingHist}
                  title="Fetch the history summary from Wikipedia using the tank name"
                  className="flex items-center gap-1.5 rounded-md border border-amber/50 bg-amber/10 px-2.5 py-1 font-display text-[11px] font-600 uppercase tracking-wide text-amber-glow transition hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {fetchingHist ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ScrollText size={13} />
                  )}
                  Fetch history
                </button>
              </div>
              <textarea
                id="history"
                name="history"
                rows={5}
                value={form.history}
                onChange={update}
                placeholder="Development and service history… or click Fetch history."
                className="w-full resize-none rounded-md border border-ink-700 bg-ink-900 px-3.5 py-2.5 font-body text-sm text-ink-100 placeholder:text-ink-500 outline-none transition focus:border-amber/60 focus:ring-1 focus:ring-amber/40"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-3 border-t border-ink-700 bg-ink-850 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-ink-600 px-4 py-3 font-display text-sm font-600 tracking-wide text-ink-200 transition hover:bg-ink-800"
            >
              CANCEL
            </button>
            <motion.button
              type="submit"
              disabled={submitting}
              whileTap={{ scale: 0.98 }}
              className="flex flex-[1.5] items-center justify-center gap-2 rounded-md border border-amber/60 bg-amber/15 px-4 py-3 font-display text-sm font-600 tracking-wide text-amber-glow shadow-glow-sm transition hover:bg-amber/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> {isEdit ? "SAVING…" : "DEPLOYING…"}
                </>
              ) : (
                <>
                  <Save size={16} /> {isEdit ? "SAVE CHANGES" : "DEPLOY UNIT"}
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.aside>
    </motion.div>
  );
}
