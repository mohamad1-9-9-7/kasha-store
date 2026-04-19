// Fuzzy search with Arabic typo tolerance
// Normalizes Arabic letters + computes Levenshtein for scoring.

const AR_NORMALIZE_MAP = {
  "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا",
  "ى": "ي", "ئ": "ي",
  "ؤ": "و",
  "ة": "ه",
  "ـ": "",
};
const DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g;

export function normalize(str) {
  if (!str) return "";
  let s = String(str).toLowerCase().replace(DIACRITICS, "");
  s = s.replace(/[أإآٱىئؤةـ]/g, (ch) => AR_NORMALIZE_MAP[ch] ?? ch);
  return s.trim();
}

// Levenshtein distance — how many edits to turn a into b
export function editDistance(a, b) {
  a = a || ""; b = b || "";
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Score a product against a query. Lower = better. null = no match.
export function scoreMatch(product, query) {
  const q = normalize(query);
  if (!q) return null;
  const fields = [
    { val: product.name,        w: 1.0 },
    { val: product.nameEn,      w: 1.0 },
    { val: product.category,    w: 2.0 },
    { val: product.brand,       w: 1.5 },
    { val: product.description, w: 3.0 },
    { val: (product.badges || []).join(" "), w: 2.5 },
  ];
  let best = Infinity;
  for (const { val, w } of fields) {
    const text = normalize(val);
    if (!text) continue;
    if (text.includes(q)) {
      // exact-substring bonus: big preference
      best = Math.min(best, 0.01 * w);
      continue;
    }
    // token-level fuzzy: check against each word
    const tokens = text.split(/\s+/);
    for (const tok of tokens) {
      if (!tok) continue;
      // allow up to ~25% of query length in edits (at least 1)
      const maxEdits = Math.max(1, Math.floor(q.length * 0.25));
      const d = editDistance(q, tok.slice(0, q.length + 2));
      if (d <= maxEdits) {
        best = Math.min(best, (d + 0.5) * w);
      }
    }
  }
  return best === Infinity ? null : best;
}

export function fuzzySearch(products, query, limit = 8) {
  if (!query || !query.trim()) return [];
  const scored = [];
  for (const p of products) {
    if (p?.hidden) continue;
    const s = scoreMatch(p, query);
    if (s !== null) scored.push({ p, s });
  }
  scored.sort((a, b) => a.s - b.s);
  return scored.slice(0, limit).map((x) => x.p);
}
