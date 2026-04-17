const router = require("express").Router();
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

// GET orders — admin: all, user: by phone query param
router.get("/", async (req, res) => {
  try {
    const { phone } = req.query;
    if (phone) {
      const { rows } = await pool.query(
        "SELECT data FROM orders WHERE data->'customer'->>'phone' = $1 ORDER BY created_at DESC",
        [phone]
      );
      return res.json(rows.map((r) => r.data));
    }
    // admin — requires token
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "غير مصرح" });
    const { rows } = await pool.query("SELECT data FROM orders ORDER BY created_at DESC");
    res.json(rows.map((r) => r.data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create order (public)
router.post("/", async (req, res) => {
  try {
    const id = uuidv4();
    const order = { id, ...req.body, status: "NEW", createdAt: new Date().toISOString() };
    await pool.query("INSERT INTO orders (id, data) VALUES ($1, $2)", [id, order]);
    res.json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update order status (admin)
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM orders WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "الطلب غير موجود" });
    const updated = { ...rows[0].data, ...req.body };
    await pool.query("UPDATE orders SET data = $1 WHERE id = $2", [updated, req.params.id]);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE order (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM orders WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
