import { Router } from "express";
import {
  getTanks,
  getTankById,
  createTank,
  updateTank,
  deleteTank,
  getFilterMeta,
} from "../controllers/tankController.js";
import { generateTanks, bulkCreateTanks } from "../controllers/aiController.js";

const router = Router();

// ─── Local-only AI import routes ─────────────────────────────────
// Mounted ONLY when ENABLE_AI_IMPORT=true (set in local .env). In production
// the flag is absent, so these routes simply don't exist → 404. No auth needed
// because the feature is never deployed.
if (process.env.ENABLE_AI_IMPORT === "true") {
  router.post("/generate", generateTanks);
  router.post("/bulk", bulkCreateTanks);
  console.log("⚙  AI import routes enabled (local): POST /api/tanks/generate, /bulk");
}

// ─── Public routes ───────────────────────────────────────────────
router.get("/", getTanks);
router.get("/meta/filters", getFilterMeta);
router.get("/:id", getTankById);
router.post("/", createTank);
router.put("/:id", updateTank);
router.delete("/:id", deleteTank);

export default router;
