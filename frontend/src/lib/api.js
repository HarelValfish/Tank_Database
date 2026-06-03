// Thin API client. In dev, requests hit "/api/..." and Vite proxies them to
// the Express server (see vite.config.js). In production set VITE_API_URL.
const BASE = import.meta.env.VITE_API_URL ?? "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  // Try to parse a JSON body even on errors so we can surface server messages.
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty / non-JSON body */
  }

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  getTanks({ search = "", variant = "All", era = "All" } = {}) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (variant && variant !== "All") params.set("variant", variant);
    if (era && era !== "All") params.set("era", era);
    const qs = params.toString();
    return request(`/api/tanks${qs ? `?${qs}` : ""}`);
  },

  getFilters() {
    return request("/api/tanks/meta/filters");
  },

  getTank(id) {
    return request(`/api/tanks/${id}`);
  },

  createTank(payload) {
    return request("/api/tanks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateTank(id, payload) {
    return request(`/api/tanks/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteTank(id) {
    return request(`/api/tanks/${id}`, { method: "DELETE" });
  },

  // ─── Local-only AI importer (routes exist only when ENABLE_AI_IMPORT=true) ──
  generateTanks({ prompt, count }) {
    return request("/api/tanks/generate", {
      method: "POST",
      body: JSON.stringify({ prompt, count }),
    });
  },

  bulkCreateTanks({ tanks }) {
    return request("/api/tanks/bulk", {
      method: "POST",
      body: JSON.stringify({ tanks }),
    });
  },
};

// Normalizes a string for loose matching (drops case, spaces, punctuation):
// "Sho't" → "shot", "T-72" → "t72". Lets variant codes match file names.
const normWord = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// File-name substrings that signal a non-photo (or the wrong "leopard"):
const BAD_IMAGE_HINTS = [
  "svg", "operators", "locator", "diagram", "logo", "insignia", "emblem",
  "flag", "patch", "blueprint", "drawing", "schematic", "chart", "icon",
  ".pdf", ".tif", "panthera", "pardus", "zoo",
];

/**
 * Looks up a photo for a tank by name using Wikimedia's public APIs (no key;
 * CORS-enabled via origin=*). Strategy:
 *   1) Wikimedia Commons file search — finds VARIANT-specific photos
 *      (e.g. "Merkava Mk 3" → a Mk III photo, not the generic article image).
 *   2) Wikipedia article image — fallback for names with no dedicated Commons
 *      photo (e.g. a very specific sub-variant).
 * Returns an image URL string, or null if nothing suitable was found.
 */
export async function fetchTankImage(name) {
  const term = (name || "").trim();
  if (!term) return null;

  const fromCommons = await commonsImage(term);
  if (fromCommons) return fromCommons;

  const fromArticle = await articleImage(term);
  if (fromArticle) return fromArticle;

  // Last resort for sub-variants with no dedicated photo/article (e.g.
  // "Merkava Mk 2B"): fall back to the base vehicle name ("Merkava") so we
  // return a correct base-vehicle image rather than nothing — and never an
  // unrelated tank.
  const baseWord = term.split(/\s+/)[0];
  if (baseWord && baseWord.toLowerCase() !== term.toLowerCase()) {
    return articleImage(baseWord);
  }
  return null;
}

// 1) Variant-specific photo from Wikimedia Commons. Biases the query with
// "tank", filters out non-photos, requires the primary name word in the file
// title, and needs ≥2 query-word hits (name + a variant/number/"tank" token)
// so it won't return an unrelated image. Soft-fails (null) so the article
// fallback can run.
async function commonsImage(term) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: `${term} tank`,
    gsrnamespace: "6", // File namespace
    gsrlimit: "20",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "1280",
  });

  let pages;
  try {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    if (!res.ok) return null;
    pages = (await res.json())?.query?.pages;
  } catch {
    return null;
  }
  if (!pages) return null;

  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  const nameWord = words[0] ? normWord(words[0]) : "";

  let best = null; // { score, index, url }
  for (const p of Object.values(pages)) {
    const title = (p.title || "").replace(/^File:/, "");
    const tl = title.toLowerCase();
    const url = p.imageinfo?.[0]?.thumburl;
    if (!url || !/\.(jpe?g|png)$/i.test(tl)) continue;
    if (BAD_IMAGE_HINTS.some((b) => tl.includes(b))) continue;
    if (nameWord && !normWord(title).includes(nameWord)) continue;
    const score = words.reduce((n, w) => n + (tl.includes(w) ? 1 : 0), 0);
    if (score < 2) continue;
    const index = p.index ?? 99;
    if (!best || score > best.score || (score === best.score && index < best.index)) {
      best = { score, index, url };
    }
  }
  return best?.url ?? null;
}

// 2) Representative image from the best-matching Wikipedia article. Validates
// by TITLE (must contain the name word) so full-text search can't drift to a
// related-but-wrong article (the old "everything → Centurion" bug), and uses
// plain search (not intitle:) so hyphenated names like "T-72" work.
async function articleImage(term) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: `${term} tank`,
    gsrlimit: "8",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "1280",
  });

  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
  if (!res.ok) throw new Error("Image service unavailable.");
  const pages = (await res.json())?.query?.pages;
  if (!pages) return null;

  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  const nameWord = words[0] ? normWord(words[0]) : "";
  const titleScore = (p) =>
    words.reduce((n, w) => n + ((p.title || "").toLowerCase().includes(w) ? 1 : 0), 0);

  // Only consider articles whose TITLE contains the vehicle name. If none do,
  // return null (better no image than an unrelated tank — this is what caused
  // "Merkava Mk 2B" to resolve to a Leopard 2 / Crusader / M60).
  const named = Object.values(pages)
    .filter((p) => p.thumbnail?.source)
    .filter((p) => nameWord && normWord(p.title || "").includes(nameWord));
  if (named.length === 0) return null;

  named.sort((a, b) => {
    const ds = titleScore(b) - titleScore(a);
    return ds !== 0 ? ds : (a.index ?? 99) - (b.index ?? 99);
  });
  return named[0].thumbnail.source ?? null;
}

/**
 * Fetches the intro/summary text of the best-matching Wikipedia article for a
 * tank, to pre-fill the History field. Returns plain text, or null if none.
 */
export async function fetchTankHistory(name) {
  const term = (name || "").trim();
  if (!term) return null;

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: term,
    gsrlimit: "1",
    prop: "extracts",
    exintro: "1", // lead section only
    explaintext: "1", // plain text, no HTML
  });

  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
  if (!res.ok) throw new Error("History service unavailable.");

  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  const first = Object.values(pages)[0];
  const text = first?.extract?.trim();
  return text || null;
}
