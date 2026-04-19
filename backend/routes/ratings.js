const router = require("express").Router();
const { pool } = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// GET approved ratings for a product (public)
router.get("/:productId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT data FROM ratings WHERE product_id = $1 ORDER BY created_at DESC",
      [req.params.productId]
    );
    const approved = rows
      .map((r) => r.data)
      .filter((d) => d && d.approved === true);
    res.json(approved);
  } catch (e) {
    console.error("GET /ratings:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// GET /ratings/admin/pending — all pending ratings (admin)
router.get("/admin/pending", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT product_id, user_id, data FROM ratings ORDER BY created_at DESC"
    );
    const pending = rows
      .filter((r) => r.data && r.data.approved !== true)
      .map((r) => ({ productId: r.product_id, userId: r.user_id, ...r.data }));
    res.json(pending);
  } catch (e) {
    console.error("GET /ratings/admin/pending:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// GET /ratings/admin/all — all ratings (admin)
router.get("/admin/all", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT product_id, user_id, data FROM ratings ORDER BY created_at DESC"
    );
    res.json(rows.map((r) => ({ productId: r.product_id, userId: r.user_id, ...r.data })));
  } catch (e) {
    console.error("GET /ratings/admin/all:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST submit/update rating (requires login, starts as pending)
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
      approved: false,
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

// PUT /ratings/admin/:productId/:userId — approve/reject (admin)
router.put("/admin/:productId/:userId", requireAdmin, async (req, res) => {
  try {
    const approved = req.body?.approved === true;
    const { rows } = await pool.query(
      "SELECT data FROM ratings WHERE product_id = $1 AND user_id = $2",
      [req.params.productId, req.params.userId]
    );
    if (!rows.length) return res.status(404).json({ error: "التقييم غير موجود" });
    const updated = { ...rows[0].data, approved };
    await pool.query(
      "UPDATE ratings SET data = $1 WHERE product_id = $2 AND user_id = $3",
      [updated, req.params.productId, req.params.userId]
    );
    res.json(updated);
  } catch (e) {
    console.error("PUT /ratings/admin:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// DELETE own rating
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

// DELETE /ratings/admin/:productId/:userId — admin deletes any rating
router.delete("/admin/:productId/:userId", requireAdmin, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM ratings WHERE product_id = $1 AND user_id = $2",
      [req.params.productId, req.params.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /ratings/admin:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

module.exports = router;
