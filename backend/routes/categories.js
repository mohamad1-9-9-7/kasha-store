const router = require("express").Router();
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

// GET all categories (public)
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM categories ORDER BY created_at");
    res.json(rows.map((r) => r.data));
  } catch (e) {
    console.error("GET /categories:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST create category (admin)
router.post("/", requireAdmin, async (req, res) => {
  try {
    if (!req.body?.name) return res.status(400).json({ error: "اسم القسم مطلوب" });
    const id = uuidv4();
    const cat = { id, ...req.body };
    await pool.query("INSERT INTO categories (id, data) VALUES ($1, $2)", [id, cat]);
    res.json(cat);
  } catch (e) {
    console.error("POST /categories:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PUT update category (admin)
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM categories WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "القسم غير موجود" });
    const updated = { ...rows[0].data, ...req.body, id: rows[0].data.id };
    await pool.query("UPDATE categories SET data = $1 WHERE id = $2", [updated, req.params.id]);
    res.json(updated);
  } catch (e) {
    console.error("PUT /categories:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// DELETE category (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM categories WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /categories:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

module.exports = router;
