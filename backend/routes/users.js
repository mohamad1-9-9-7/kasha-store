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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET user points
router.get("/:id/points", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM users WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.json({ points: 0 });
    res.json({ points: rows[0].data.points || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update user points
router.put("/:id/points", async (req, res) => {
  try {
    const { points } = req.body;
    const { rows } = await pool.query("SELECT data FROM users WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "المستخدم غير موجود" });
    const updated = { ...rows[0].data, points: Number(points) || 0 };
    await pool.query("UPDATE users SET data = $1 WHERE id = $2", [updated, req.params.id]);
    res.json({ points: updated.points });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE user (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
