const router = require("express").Router();
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");

// GET all coupons (public — frontend validates locally)
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM coupons ORDER BY created_at");
    res.json(rows.map((r) => r.data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create/upsert coupon (admin) — doc ID = coupon code
router.post("/", requireAdmin, async (req, res) => {
  try {
    const coupon = req.body;
    const id = coupon.code?.toUpperCase();
    if (!id) return res.status(400).json({ error: "رمز الكوبون مطلوب" });
    await pool.query(
      "INSERT INTO coupons (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2",
      [id, { ...coupon, code: id }]
    );
    res.json({ ...coupon, code: id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update coupon (admin)
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM coupons WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "الكوبون غير موجود" });
    const updated = { ...rows[0].data, ...req.body };
    await pool.query("UPDATE coupons SET data = $1 WHERE id = $2", [updated, req.params.id]);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE coupon (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM coupons WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST increment coupon uses (public — called on order creation)
router.post("/:code/use", async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { rows } = await pool.query("SELECT data FROM coupons WHERE id = $1", [code]);
    if (!rows.length) return res.status(404).json({ error: "الكوبون غير موجود" });
    const updated = { ...rows[0].data, uses: (rows[0].data.uses || 0) + 1 };
    await pool.query("UPDATE coupons SET data = $1 WHERE id = $2", [updated, code]);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
