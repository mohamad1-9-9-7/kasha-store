// Lightweight English → Arabic auto-translator using Google's public gtx
// endpoint (no API key). Not an official API; fine for low-volume product
// imports. Gracefully falls back to the original text on failure.

const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const MAX_CHUNK = 4500; // endpoint caps around ~5000 chars per request

// split long text on paragraph/sentence boundaries to stay under the chunk cap
function splitForTranslate(text) {
  if (text.length <= MAX_CHUNK) return [text];
  const chunks = [];
  let buf = "";
  for (const part of text.split(/(?<=[.!?؟\n])/)) {
    if ((buf + part).length > MAX_CHUNK) {
      if (buf) chunks.push(buf);
      buf = part;
    } else {
      buf += part;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

async function translateChunk(text, { from = "en", to = "ar" } = {}) {
  const url = `${ENDPOINT}?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
  const data = await res.json();
  const segments = Array.isArray(data?.[0]) ? data[0] : [];
  return segments.map((s) => s?.[0] ?? "").join("");
}

async function translate(text, opts) {
  if (!text) return "";
  const str = String(text).trim();
  if (!str) return "";
  // skip work if already mostly Arabic
  if (/[\u0600-\u06FF]/.test(str) && !/[A-Za-z]{4,}/.test(str)) return str;

  const chunks = splitForTranslate(str);
  const out = [];
  for (const c of chunks) {
    try {
      out.push(await translateChunk(c, opts));
    } catch (e) {
      console.warn("translate chunk failed, keeping original:", e.message);
      out.push(c);
    }
  }
  return out.join("");
}

module.exports = { translate };
