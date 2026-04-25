const router = require("express").Router();
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const { translate } = require("../lib/translate");

const JWT_SECRET = process.env.JWT_SECRET;

function isAdminRequest(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return false;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    return payload?.role === "admin";
  } catch {
    return false;
  }
}

// Internal fields — never expose to the storefront
//   costPrice, priceWithoutTax → cost accounting
//   vendorSku                  → supplier's original SKU, kept for image-file matching
function stripPrivate(data) {
  if (!data) return data;
  const { costPrice, priceWithoutTax, vendorSku, ...rest } = data;
  return rest;
}

// GET all products (public — non-admins never see costPrice)
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM products ORDER BY created_at");
    const admin = isAdminRequest(req);
    res.json(rows.map((r) => admin ? r.data : stripPrivate(r.data)));
  } catch (e) {
    console.error("GET /products:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Translate a batch of product records in parallel with bounded concurrency.
// Only fills the Arabic field when it's empty and the English field has content.
async function autoTranslateBatch(records, concurrency = 4) {
  const needs = [];
  records.forEach((rec, idx) => {
    if (!rec.name && rec.nameEn) needs.push({ idx, field: "name", src: rec.nameEn });
    if (!rec.description && rec.descriptionEn) needs.push({ idx, field: "description", src: rec.descriptionEn });
  });

  let translated = 0;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, needs.length) }, async () => {
    while (cursor < needs.length) {
      const job = needs[cursor++];
      try {
        const out = await translate(job.src);
        if (out && out !== job.src) {
          records[job.idx][job.field] = out;
          translated++;
        }
      } catch (e) {
        console.warn(`translate failed for record ${job.idx}.${job.field}:`, e.message);
      }
    }
  });
  await Promise.all(workers);
  return translated;
}

// Ensure a category with the given name exists; create it if missing.
// Returns the name (unchanged) for convenience.
async function ensureCategory(client, name) {
  if (!name) return name;
  const { rows } = await client.query(
    "SELECT id FROM categories WHERE data->>'name' = $1 LIMIT 1",
    [name]
  );
  if (rows.length) return name;
  const id = uuidv4();
  const cat = { id, name, hidden: false, createdAt: new Date().toISOString() };
  await client.query("INSERT INTO categories (id, data) VALUES ($1, $2)", [id, cat]);
  return name;
}

// POST bulk import products (admin) — body: { products: [...] }
// Query params:
//   ?translate=1        → EN → AR auto-translation for empty Arabic fields
//   ?targetCategory=X   → override every row's category with X (auto-creates the category if missing)
//   ?markFeatured=1     → set featured=true on every imported row (shown on homepage)
router.post("/bulk", requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const list = Array.isArray(req.body?.products) ? req.body.products : [];
    if (!list.length) return res.status(400).json({ error: "لا توجد منتجات للاستيراد" });

    const targetCategory = String(req.query.targetCategory || "").trim();
    const markFeatured = req.query.markFeatured === "1" || req.query.markFeatured === "true";

    // Build records first (no DB work yet, so translation can run freely)
    const records = [];
    const errors = [];
    let skipped = 0;

    for (let i = 0; i < list.length; i++) {
      const p = list[i] || {};
      const fallbackName = p.name || p.nameEn;
      if (!fallbackName) { skipped++; errors.push({ row: i + 1, error: "اسم المنتج مفقود" }); continue; }
      // If supplier only gave "Price Without Tax", use it as initial sale price.
      // Admin can override later from the edit page.
      const rawPrice = (p.price !== undefined && p.price !== "") ? p.price : p.priceWithoutTax;
      const price = Number(rawPrice);
      if (!Number.isFinite(price) || price < 0) {
        skipped++; errors.push({ row: i + 1, error: `السعر غير صالح (${rawPrice})` }); continue;
      }

      const sku = p.sku ? String(p.sku).trim() : ("KSH-" + uuidv4().slice(0, 8).toUpperCase());
      const rawCategory = p.category ? String(p.category).trim() : "";
      const record = {
        id: String(p.id || sku),
        sku,
        vendorSku: p.vendorSku ? String(p.vendorSku).trim() : "",
        name: p.name ? String(p.name).trim() : "",
        nameEn: p.nameEn ? String(p.nameEn).trim() : "",
        price,
        oldPrice: p.oldPrice !== undefined && p.oldPrice !== "" ? Number(p.oldPrice) : undefined,
        costPrice: p.costPrice !== undefined && p.costPrice !== "" ? Number(p.costPrice) : undefined,
        priceWithoutTax: p.priceWithoutTax !== undefined && p.priceWithoutTax !== "" ? Number(p.priceWithoutTax) : undefined,
        currency: p.currency || "AED",
        category: targetCategory || rawCategory,
        supplierCategory: rawCategory && targetCategory && rawCategory !== targetCategory ? rawCategory : undefined,
        featured: markFeatured || !!p.featured,
        brand: p.brand ? String(p.brand).trim() : "",
        stock: Math.max(1, parseInt(p.stock) || 1),
        weight: p.weight !== undefined && p.weight !== "" ? Number(p.weight) : undefined,
        packageWeight: p.packageWeight !== undefined && p.packageWeight !== "" ? Number(p.packageWeight) : undefined,
        volumetricWeight: p.volumetricWeight !== undefined && p.volumetricWeight !== "" ? Number(p.volumetricWeight) : undefined,
        productDimensions: p.productDimensions ? String(p.productDimensions).trim() : "",
        packageDimensions: p.packageDimensions ? String(p.packageDimensions).trim() : "",
        targetGender: p.targetGender ? String(p.targetGender).trim() : "",
        recommendedAge: p.recommendedAge ? String(p.recommendedAge).trim() : "",
        color: p.color ? String(p.color).trim() : "",
        material: p.material ? String(p.material).trim() : "",
        returns: p.returns ? String(p.returns).trim() : "",
        description: p.description ? String(p.description).trim() : "",
        descriptionEn: p.descriptionEn ? String(p.descriptionEn).trim() : "",
        badges: typeof p.badges === "string"
          ? p.badges.split(/[,|]/).map((s) => s.trim()).filter(Boolean)
          : Array.isArray(p.badges) ? p.badges : [],
        image: p.image || "",
        images: typeof p.images === "string"
          ? p.images.split(/[,|]/).map((s) => s.trim()).filter(Boolean)
          : Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []),
        metaTitle: p.metaTitle || "",
        metaDescription: p.metaDescription || "",
        createdAt: new Date().toISOString(),
      };
      records.push(record);
    }

    // Auto-translate empty Arabic fields when requested (default on)
    const shouldTranslate = req.query.translate !== "0" && req.query.translate !== "false";
    let translated = 0;
    if (shouldTranslate) {
      translated = await autoTranslateBatch(records);
    }
    // Ensure every record ends up with an Arabic name (fallback to English)
    for (const r of records) {
      if (!r.name) r.name = r.nameEn;
    }

    await client.query("BEGIN");
    let inserted = 0, updated = 0;

    if (targetCategory) await ensureCategory(client, targetCategory);

    for (const record of records) {
      // Match existing products by SKU first, then fall back to id
      const existing = await client.query(
        "SELECT id FROM products WHERE id = $1 OR data->>'sku' = $2 LIMIT 1",
        [record.id, record.sku]
      );
      if (existing.rows.length) {
        const existingId = existing.rows[0].id;
        record.id = existingId; // keep original id on update
        await client.query("UPDATE products SET data = $1 WHERE id = $2", [record, existingId]);
        updated++;
      } else {
        await client.query("INSERT INTO products (id, data) VALUES ($1, $2)", [record.id, record]);
        inserted++;
      }
    }

    await client.query("COMMIT");
    res.json({ inserted, updated, skipped, translated, errors });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("POST /products/bulk:", e);
    res.status(500).json({ error: "خطأ في الاستيراد: " + e.message });
  } finally {
    client.release();
  }
});

// POST create/upsert product (admin)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const product = req.body || {};
    if (!product.id) return res.status(400).json({ error: "معرف المنتج مطلوب" });
    if (!product.name) return res.status(400).json({ error: "اسم المنتج مطلوب" });
    const price = Number(product.price);
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: "السعر غير صالح" });
    const id = String(product.id);
    await pool.query(
      "INSERT INTO products (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2",
      [id, product]
    );
    res.json(product);
  } catch (e) {
    console.error("POST /products:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PUT update product (admin)
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM products WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "المنتج غير موجود" });
    // Preserve original id; merge the rest
    const updated = { ...rows[0].data, ...req.body, id: rows[0].data.id };
    await pool.query("UPDATE products SET data = $1 WHERE id = $2", [updated, req.params.id]);
    res.json(updated);
  } catch (e) {
    console.error("PUT /products:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// DELETE product (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /products:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

module.exports = router;
