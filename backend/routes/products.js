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
