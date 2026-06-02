// Small pure helpers shared by the controller. Kept dependency-free and
// side-effect-free so they can be unit-tested without a database or server.

/** Escapes a string so it can be safely interpolated into a RegExp. */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Converts an era label like "2000s" into the 3-char decade prefix "200",
 * used to match against a serviceTime string (e.g. "2004–Present").
 */
export function eraToDecadePrefix(era) {
  return era.replace(/s$/, "").slice(0, 3);
}

/**
 * Extracts decade buckets ("1980s", "2000s", …) from a free-form serviceTime
 * string such as "1979–1990s" → ["1970s", "1990s"].
 */
export function decadeBucketsFromText(text) {
  const years = String(text).match(/\d{4}/g) || [];
  return years.map((year) => `${year.slice(0, 3)}0s`);
}
