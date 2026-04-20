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

// costPrice is internal — never expose to the storefront
function stripPrivate(data) {
  if (!data) return data;
  const { costPrice, ...rest } = data;
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

// POST bulk import products (admin) — body: { products: [...] }
// Query ?translate=1 enables EN → AR auto-translation for empty Arabic fields.
router.post("/bulk", requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const list = Array.isArray(req.body?.products) ? req.body.products : [];
    if (!list.length) return res.status(400).json({ error: "لا توجد منتجات للاستيراد" });

    // Build records first (no DB work yet, so translation can run freely)
    const records = [];
    const errors = [];
    let skipped = 0;

    for (let i = 0; i < list.length; i++) {
      const p = list[i] || {};
      const fallbackName = p.name || p.nameEn;
      if (!fallbackName) { skipped++; errors.push({ row: i + 1, error: "اسم المنتج مفقود" }); continue; }
      const price = Number(p.price);
      if (!Number.isFinite(price) || price < 0) {
        skipped++; errors.push({ row: i + 1, error: `السعر غير صالح (${p.price})` }); continue;
      }

      const sku = p.sku ? String(p.sku).trim() : ("KSH-" + uuidv4().slice(0, 8).toUpperCase());
      const record = {
        id: String(p.id || sku),
        sku,
        name: p.name ? String(p.name).trim() : "",
        nameEn: p.nameEn ? String(p.nameEn).trim() : "",
        price,
        oldPrice: p.oldPrice !== undefined && p.oldPrice !== "" ? Number(p.oldPrice) : undefined,
        costPrice: p.costPrice !== undefined && p.costPrice !== "" ? Number(p.costPrice) : undefined,
        currency: p.currency || "AED",
        category: p.category ? String(p.category).trim() : "",
        brand: p.brand ? String(p.brand).trim() : "",
        stock: p.stock !== undefined && p.stock !== "" ? parseInt(p.stock) : 0,
        weight: p.weight !== undefined && p.weight !== "" ? Number(p.weight) : undefined,
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
