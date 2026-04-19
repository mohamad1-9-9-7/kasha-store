const router = require("express").Router();
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");

// GET all products (public)
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM products ORDER BY created_at");
    res.json(rows.map((r) => r.data));
  } catch (e) {
    console.error("GET /products:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST bulk import products (admin) — body: { products: [...] }
router.post("/bulk", requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const list = Array.isArray(req.body?.products) ? req.body.products : [];
    if (!list.length) return res.status(400).json({ error: "لا توجد منتجات للاستيراد" });

    await client.query("BEGIN");
    let inserted = 0, updated = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < list.length; i++) {
      const p = list[i] || {};
      if (!p.name) { skipped++; errors.push({ row: i + 1, error: "اسم المنتج مفقود" }); continue; }
      const price = Number(p.price);
      if (!Number.isFinite(price) || price < 0) {
        skipped++; errors.push({ row: i + 1, error: `السعر غير صالح (${p.price})` }); continue;
      }
      const id = String(p.id || `BULK-${Date.now()}-${i}`);
      const record = {
        id,
        name: String(p.name).trim(),
        nameEn: p.nameEn ? String(p.nameEn).trim() : "",
        price,
        oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
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
        sku: p.sku || ("KSH-" + Math.random().toString(36).toUpperCase().slice(2, 9)),
        metaTitle: p.metaTitle || "",
        metaDescription: p.metaDescription || "",
        createdAt: new Date().toISOString(),
      };

      const existing = await client.query("SELECT id FROM products WHERE id = $1", [id]);
      if (existing.rows.length) {
        await client.query("UPDATE products SET data = $1 WHERE id = $2", [record, id]);
        updated++;
      } else {
        await client.query("INSERT INTO products (id, data) VALUES ($1, $2)", [id, record]);
        inserted++;
      }
    }

    await client.query("COMMIT");
    res.json({ inserted, updated, skipped, errors });
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
