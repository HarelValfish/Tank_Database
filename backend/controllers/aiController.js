import { Tank } from "../models/Tank.js";
import { generateTanksWithModel } from "../services/ai.js";

const MAX_COUNT = 12; // keep batches small so local generation stays responsive

/**
 * POST /api/tanks/generate   (LOCAL ONLY — gated by ENABLE_AI_IMPORT)
 * Body: { prompt: string, count?: number }
 * Returns { tanks: [...] } WITHOUT writing to the database — the client
 * previews/edits them, then calls /api/tanks/bulk to save.
 */
export async function generateTanks(req, res, next) {
  try {
    const { prompt, count } = req.body || {};
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ message: "A prompt is required." });
    }

    const n = Math.min(Math.max(parseInt(count, 10) || 6, 1), MAX_COUNT);
    const tanks = await generateTanksWithModel(String(prompt).trim(), n);

    if (!tanks.length) {
      return res
        .status(422)
        .json({ message: "The model returned no usable vehicles. Try rephrasing." });
    }
    res.json({ tanks });
  } catch (err) {
    // Surface clear, user-actionable messages (Ollama down, timeout, etc.).
    res.status(502).json({ message: err.message || "Generation failed." });
  }
}

/**
 * POST /api/tanks/bulk   (LOCAL ONLY — gated by ENABLE_AI_IMPORT)
 * Body: { tanks: [ {tankName, ...}, ... ] }
 * Inserts many tanks at once. Used by the AI importer after preview/edit.
 */
export async function bulkCreateTanks(req, res, next) {
  try {
    const { tanks } = req.body || {};
    if (!Array.isArray(tanks) || tanks.length === 0) {
      return res.status(400).json({ message: "tanks must be a non-empty array." });
    }

    const docs = [];
    for (const t of tanks) {
      if (!t?.tankName || !String(t.tankName).trim()) {
        return res.status(400).json({ message: "Every tank needs a tankName." });
      }
      docs.push({
        tankName: t.tankName,
        variant: t.variant ?? "",
        armament: t.armament ?? "",
        description: t.description ?? "",
        serviceTime: t.serviceTime ?? "",
        imageUrl: t.imageUrl ?? "",
        history: t.history ?? "",
        specifications: {
          weight: t.specifications?.weight ?? "",
          crewSize: t.specifications?.crewSize ?? "",
          speed: t.specifications?.speed ?? "",
        },
      });
    }

    const created = await Tank.insertMany(docs);
    res.status(201).json({ created, count: created.length });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}
