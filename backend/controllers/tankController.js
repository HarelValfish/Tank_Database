import { Tank } from "../models/Tank.js";
import { escapeRegex, eraToDecadePrefix, decadeBucketsFromText } from "../utils.js";

/**
 * GET /api/tanks
 * Supports optional query params:
 *   ?search=merkava       → keyword match on name / variant / armament / description
 *   ?variant=Mk 4         → exact-ish (case-insensitive) variant filter
 *   ?era=2000s            → matches a decade label against the serviceTime string
 */
export async function getTanks(req, res, next) {
  try {
    const { search, variant, era } = req.query;
    const query = {};

    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), "i");
      query.$or = [
        { tankName: rx },
        { variant: rx },
        { armament: rx },
        { description: rx },
      ];
    }

    if (variant && variant.trim() && variant !== "All") {
      query.variant = new RegExp(escapeRegex(variant.trim()), "i");
    }

    if (era && era.trim() && era !== "All") {
      // era looks like "2000s" → match the leading "200" against serviceTime.
      query.serviceTime = new RegExp(eraToDecadePrefix(era), "i");
    }

    const tanks = await Tank.find(query).sort({ createdAt: -1 });
    res.json(tanks);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tanks/meta/filters
 * Returns the distinct variant values and era buckets currently in the DB,
 * so the frontend filter dropdowns stay in sync with real data.
 */
export async function getFilterMeta(_req, res, next) {
  try {
    const variants = (await Tank.distinct("variant")).filter(Boolean).sort();
    const serviceTimes = (await Tank.distinct("serviceTime")).filter(Boolean);

    // Derive decade buckets ("1980s", "2000s", …) from serviceTime strings.
    const eras = new Set();
    for (const st of serviceTimes) {
      for (const decade of decadeBucketsFromText(st)) eras.add(decade);
    }

    res.json({
      variants,
      eras: [...eras].sort(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tanks/:id
 */
export async function getTankById(req, res, next) {
  try {
    const tank = await Tank.findById(req.params.id);
    if (!tank) return res.status(404).json({ message: "Tank not found." });
    res.json(tank);
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid tank id." });
    }
    next(err);
  }
}

/**
 * POST /api/tanks
 */
export async function createTank(req, res, next) {
  try {
    const {
      tankName,
      variant,
      armament,
      description,
      serviceTime,
      imageUrl,
      history,
      specifications,
    } = req.body;

    if (!tankName || !tankName.trim()) {
      return res.status(400).json({ message: "tankName is required." });
    }

    const tank = await Tank.create({
      tankName,
      variant,
      armament,
      description,
      serviceTime,
      imageUrl,
      history,
      specifications: {
        weight: specifications?.weight ?? "",
        crewSize: specifications?.crewSize ?? "",
        speed: specifications?.speed ?? "",
      },
    });

    res.status(201).json(tank);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}

/**
 * PUT /api/tanks/:id
 * Full update of an existing tank. The edit form always sends every field.
 */
export async function updateTank(req, res, next) {
  try {
    const {
      tankName,
      variant,
      armament,
      description,
      serviceTime,
      imageUrl,
      history,
      specifications,
    } = req.body;

    if (!tankName || !tankName.trim()) {
      return res.status(400).json({ message: "tankName is required." });
    }

    const update = {
      tankName,
      variant,
      armament,
      description,
      serviceTime,
      imageUrl,
      history,
      specifications: {
        weight: specifications?.weight ?? "",
        crewSize: specifications?.crewSize ?? "",
        speed: specifications?.speed ?? "",
      },
    };

    const tank = await Tank.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!tank) return res.status(404).json({ message: "Tank not found." });
    res.json(tank);
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid tank id." });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
}

/**
 * DELETE /api/tanks/:id
 */
export async function deleteTank(req, res, next) {
  try {
    const tank = await Tank.findByIdAndDelete(req.params.id);
    if (!tank) return res.status(404).json({ message: "Tank not found." });
    res.json({ id: req.params.id, deleted: true });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid tank id." });
    }
    next(err);
  }
}