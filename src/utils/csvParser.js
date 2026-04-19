// Simple CSV parser that handles quoted fields + commas inside quotes.
// No external deps.

export function parseCSV(text) {
  const rows = [];
  let cur = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(field); field = "";
        if (cur.length > 1 || cur[0] !== "") rows.push(cur);
        cur = [];
      }
      else field += c;
    }
  }
  if (field !== "" || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

// Convert parsed rows into array of objects using header row
export function csvToObjects(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => String(h || "").trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => String(c || "").trim() !== ""))
    .map((r) => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = r[i] !== undefined ? r[i] : ""; });
      return obj;
    });
}

// Generate CSV from array of objects (for template download)
export function objectsToCSV(objs, headers) {
  const keys = headers || (objs[0] ? Object.keys(objs[0]) : []);
  const esc = (v) => {
    const s = String(v ?? "");
    return /["\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [keys.join(",")];
  for (const o of objs) lines.push(keys.map((k) => esc(o[k])).join(","));
  return lines.join("\n");
}
