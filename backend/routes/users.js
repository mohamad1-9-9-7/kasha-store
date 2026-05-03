const router = require("express").Router();
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");

// GET all users (admin)
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM users ORDER BY created_at DESC");
    // Never expose passwords
    res.json(rows.map((r) => {
      const { password, ...safe } = r.data;
      return safe;
    }));
  } catch (e) {
    console.error("GET /users:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Note: GET /:id/points was removed. The frontend reads points from the
// localStorage user object (set on login + after each order from the server's
// authoritative response), so the endpoint had no real callers — but it did
// let an authenticated user probe phone-number existence by distinguishing
// `{points: 0}` (404 silently coerced) from a real value.

// PUT user points — ADMIN ONLY.
// Regular users CANNOT set their own points; loyalty points are managed
// by the order flow (POST /api/orders) which credits earnings and debits
// redemptions in a single transaction. A user-writable points endpoint
// would let any logged-in user grant themselves unlimited points.
router.put("/:id/points", requireAdmin, async (req, res) => {
  try {
    const { points } = req.body;
    const newPoints = Number(points);
    if (!Number.isFinite(newPoints) || newPoints < 0) {
      return res.status(400).json({ error: "قيمة نقاط غير صالحة" });
    }
    const { rows } = await pool.query("SELECT data FROM users WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "المستخدم غير موجود" });
    const updated = { ...rows[0].data, points: newPoints };
    await pool.query("UPDATE users SET data = $1 WHERE id = $2", [updated, req.params.id]);
    res.json({ points: updated.points });
  } catch (e) {
    console.error("PUT /users/:id/points:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// DELETE user (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /users:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

module.exports = router;
