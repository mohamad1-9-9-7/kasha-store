const router = require("express").Router();
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");

// GET all products (public)
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM products ORDER BY created_at");
    res.json(rows.map((r) => r.data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create/upsert product (admin)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const product = req.body;
    const id = String(product.id);
    await pool.query(
      "INSERT INTO products (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2",
      [id, product]
    );
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update product (admin)
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM products WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "المنتج غير موجود" });
    const updated = { ...rows[0].data, ...req.body };
    await pool.query("UPDATE products SET data = $1 WHERE id = $2", [updated, req.params.id]);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE product (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
