const router = require("express").Router();
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");

// GET all ratings for a product (public)
router.get("/:productId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT data FROM ratings WHERE product_id = $1 ORDER BY created_at DESC",
      [req.params.productId]
    );
    res.json(rows.map((r) => r.data));
  } catch (e) {
    console.error("GET /ratings:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST submit/update rating for a product (requires login)
router.post("/:productId", requireAuth, async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.user.id;
    const stars = parseInt(req.body?.stars);
    const comment = String(req.body?.comment || "").slice(0, 500);
    const name = String(req.body?.name || "مستخدم").slice(0, 60);

    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5" });
    }

    const data = {
      userId,
      name,
      stars,
      comment,
      date: new Date().toISOString(),
    };

    await pool.query(
      `INSERT INTO ratings (product_id, user_id, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, user_id) DO UPDATE
       SET data = $3, created_at = NOW()`,
      [productId, userId, data]
    );
    res.json(data);
  } catch (e) {
    console.error("POST /ratings:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// DELETE a user's own rating
router.delete("/:productId", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM ratings WHERE product_id = $1 AND user_id = $2",
      [req.params.productId, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /ratings:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

module.exports = router;
