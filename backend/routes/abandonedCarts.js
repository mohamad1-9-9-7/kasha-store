const router = require("express").Router();
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");

// Upsert abandoned cart (public — anyone can ping)
// id = phone OR browser fingerprint OR random client key
router.post("/", async (req, res) => {
  try {
    const { id, customer, items, subtotal } = req.body || {};
    const key = String(id || "").trim();
    if (!key || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "بيانات ناقصة" });
    }
    const data = {
      id: key,
      customer: customer || {},
      items: items.map((it) => ({
        id: it.id,
        name: it.name,
        price: Number(it.price) || 0,
        qty: Number(it.qty) || 1,
        image: it.image || "",
      })),
      subtotal: Number(subtotal) || 0,
      updatedAt: new Date().toISOString(),
    };
    await pool.query(
      `INSERT INTO abandoned_carts (id, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [key, data]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("POST /abandoned-carts:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Remove when order completes (public — called by client after success)
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM abandoned_carts WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /abandoned-carts:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Admin: list all
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT data FROM abandoned_carts ORDER BY updated_at DESC"
    );
    res.json(rows.map((r) => r.data));
  } catch (e) {
    console.error("GET /abandoned-carts:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Admin: delete one
router.delete("/admin/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM abandoned_carts WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /abandoned-carts/admin:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

module.exports = router;
