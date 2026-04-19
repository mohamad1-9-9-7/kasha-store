const router = require("express").Router();
const { pool } = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

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

// GET user points — user can only fetch own, admin can fetch any
router.get("/:id/points", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.id !== req.params.id) {
      return res.status(403).json({ error: "ممنوع" });
    }
    const { rows } = await pool.query("SELECT data FROM users WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.json({ points: 0 });
    res.json({ points: rows[0].data.points || 0 });
  } catch (e) {
    console.error("GET /users/:id/points:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PUT update user points — user can only update own, admin can update any
router.put("/:id/points", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.id !== req.params.id) {
      return res.status(403).json({ error: "ممنوع" });
    }
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
