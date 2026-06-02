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
};

/**
 * Looks up a representative photo for a tank by name using Wikipedia's public
 * API. No API key required; Wikipedia allows cross-origin requests via
 * `origin=*`, so this runs straight from the browser.
 *
 * Returns an image URL string, or null if nothing suitable was found.
 */
export async function fetchTankImage(name) {
  const term = (name || "").trim();
  if (!term) return null;

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: term, // e.g. "Merkava Mk 4"
    gsrlimit: "1",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "1280",
  });

  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
  if (!res.ok) throw new Error("Image service unavailable.");

  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  const first = Object.values(pages)[0];
  return first?.thumbnail?.source ?? null;
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
