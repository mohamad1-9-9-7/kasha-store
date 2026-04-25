// Column-alias maps for bulk product import.
// Two formats are supported:
//   1) store template — Arabic-first, lowercase keys from our own CSV template
//   2) supplier sheet — Little Angel / noon-style xlsx, English product info

// Column names are normalized: trimmed, lowercased, spaces collapsed.
function normalizeKey(k) {
  return String(k || "").trim().toLowerCase().replace(/\s+/g, " ");
}

const STORE_MAP = {
  "name": "name",
  "nameen": "nameEn",
  "price": "price",
  "oldprice": "oldPrice",
  "costprice": "costPrice",
  "pricewithouttax": "priceWithoutTax",
  "category": "category",
  "brand": "brand",
  "stock": "stock",
  "weight": "weight",
  "packageweight": "packageWeight",
  "volumetricweight": "volumetricWeight",
  "productdimensions": "productDimensions",
  "packagedimensions": "packageDimensions",
  "targetgender": "targetGender",
  "recommendedage": "recommendedAge",
  "color": "color",
  "material": "material",
  "returns": "returns",
  "description": "description",
  "descriptionen": "descriptionEn",
  "badges": "badges",
  "image": "image",
  "images": "images",
  "metatitle": "metaTitle",
  "metadescription": "metaDescription",
  "sku": "sku",
  "id": "id",
};

// Supplier product info is English-only → name/description land in the
// English fields; the Arabic fields are filled later by auto-translate.
const SUPPLIER_MAP = {
  "product name": "nameEn",
  "description": "descriptionEn",
  "product category": "category",
  "brand": "brand",
  // Vendor SKU is imported into BOTH sku (public ref) and vendorSku
  // (admin-only — used to match local image files to products at upload time)
  "vendor sku": "sku",
  "product id": "id",
  "cost price without tax": "costPrice",
  "price without tax": "priceWithoutTax",
  "product weight": "weight",
  "package weight": "packageWeight",
  "volumetric weight": "volumetricWeight",
  "product dimensions": "productDimensions",
  "package dimensions": "packageDimensions",
  "target gender": "targetGender",
  "recommended age": "recommendedAge",
  "color": "color",
  "material": "material",
  "returns": "returns",
};

// Presence of any of these headers means it's the supplier format.
const SUPPLIER_MARKERS = new Set([
  "vendor sku",
  "cost price without tax",
  "price without tax",
  "product name",
]);

function pickMap(headers) {
  const normed = headers.map(normalizeKey);
  const isSupplier = normed.some((h) => SUPPLIER_MARKERS.has(h));
  return isSupplier ? SUPPLIER_MAP : STORE_MAP;
}

function mapRowWith(rawRow, aliasMap) {
  const out = {};
  const imageUrls = [];
  for (const [key, val] of Object.entries(rawRow)) {
    if (val === undefined || val === null || val === "") continue;
    const nk = normalizeKey(key);

    // image links (supplier uses "Image Link 1 (Primary)", "Image Link 2"...;
    // our template uses "image" / "images")
    if (/^image link/i.test(key)) {
      const parts = String(val).split(/[,|]/).map((s) => s.trim()).filter(Boolean);
      imageUrls.push(...parts);
      continue;
    }
    if (nk === "image" || nk === "images") {
      const parts = String(val).split(/[,|]/).map((s) => s.trim()).filter(Boolean);
      imageUrls.push(...parts);
      continue;
    }

    // Also stash the original Vendor SKU into a separate admin-only field.
    // Admin uses this to match locally-stored image filenames to the right product.
    if (nk === "vendor sku") {
      if (out.vendorSku === undefined) out.vendorSku = String(val).trim();
    }

    const target = aliasMap[nk];
    if (!target) continue;
    if (out[target] === undefined) out[target] = val;
  }

  if (imageUrls.length) {
    out.images = imageUrls.join(",");
    if (!out.image) out.image = imageUrls[0];
  }
  return out;
}

// Supplier xlsx has 3 metadata rows before the real header row (group titles,
// field types, then actual column names). Detect header by scanning the first
// 8 rows for a known product column.
export function detectHeaderRow(matrix) {
  const MAX_SCAN = Math.min(matrix.length, 8);
  const MARKERS = ["product name", "name", "vendor sku", "sku"];
  for (let i = 0; i < MAX_SCAN; i++) {
    const row = matrix[i] || [];
    const lowered = row.map((c) => normalizeKey(c));
    if (MARKERS.some((m) => lowered.includes(m))) return i;
  }
  return 0;
}

export function matrixToObjects(matrix) {
  if (!matrix.length) return [];
  const headerIdx = detectHeaderRow(matrix);
  const rawHeaders = matrix[headerIdx].map((c) => String(c || "").trim());
  const aliasMap = pickMap(rawHeaders);

  const out = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i] || [];
    if (!row.some((c) => String(c || "").trim() !== "")) continue;
    const obj = {};
    rawHeaders.forEach((h, j) => { if (h) obj[h] = row[j] !== undefined ? row[j] : ""; });
    const mapped = mapRowWith(obj, aliasMap);
    if (mapped.name || mapped.nameEn) out.push(mapped);
  }
  return out;
}

// Public helper for callers that already have row-objects (e.g. existing CSV path).
export function normalizeObjects(rows) {
  if (!rows.length) return [];
  const aliasMap = pickMap(Object.keys(rows[0]));
  return rows
    .map((r) => mapRowWith(r, aliasMap))
    .filter((r) => r.name || r.nameEn);
}
