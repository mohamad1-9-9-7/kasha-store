const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");

// Tight per-IP limit on coupon code validation. The general limiter is
// 120/min; that's plenty for a real shopper to apply a code (one or two
// attempts) but lets a botnet enumerate the entire coupon namespace in
// minutes. 8/min stops brute-force without inconveniencing legit typos.
const validateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة، حاول بعد دقيقة" },
});

// GET all coupons — ADMIN ONLY.
// Coupons may include private/VIP codes; the storefront validates a code via
// POST /coupons/validate (which only returns the bearer's own coupon details).
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM coupons ORDER BY created_at");
    res.json(rows.map((r) => r.data));
  } catch (e) {
    console.error("GET /coupons:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST validate a coupon by code (public) — returns only validity + value
router.post("/validate", validateLimiter, async (req, res) => {
  try {
    const code = String(req.body?.code || "").toUpperCase();
    if (!code) return res.status(400).json({ error: "رمز الكوبون مطلوب" });
    const { rows } = await pool.query("SELECT data FROM coupons WHERE id = $1", [code]);
    if (!rows.length) return res.status(404).json({ error: "الكوبون غير موجود" });
    const c = rows[0].data;
    if (c.active === false) return res.status(410).json({ error: "الكوبون غير نشط" });
    if (c.expiry && Date.now() > new Date(c.expiry).getTime()) {
      return res.status(410).json({ error: "انتهت صلاحية الكوبون" });
    }
    if (c.maxUses && (c.uses || 0) >= c.maxUses) {
      return res.status(410).json({ error: "تم استنفاد الكوبون" });
    }
    res.json({
      code: c.code,
      type: c.type,
      value: c.value,
      minOrder: c.minOrder || 0,
    });
  } catch (e) {
    console.error("POST /coupons/validate:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST create/upsert coupon (admin) — doc ID = coupon code
router.post("/", requireAdmin, async (req, res) => {
  try {
    const coupon = req.body || {};
    const id = coupon.code?.toUpperCase();
    if (!id) return res.status(400).json({ error: "رمز الكوبون مطلوب" });
    await pool.query(
      "INSERT INTO coupons (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2",
      [id, { ...coupon, code: id }]
    );
    res.json({ ...coupon, code: id });
  } catch (e) {
    console.error("POST /coupons:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PUT update coupon (admin)
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM coupons WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "الكوبون غير موجود" });
    const updated = { ...rows[0].data, ...req.body, code: rows[0].data.code };
    await pool.query("UPDATE coupons SET data = $1 WHERE id = $2", [updated, req.params.id]);
    res.json(updated);
  } catch (e) {
    console.error("PUT /coupons:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// DELETE coupon (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM coupons WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /coupons:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// NOTE: The legacy `POST /:code/use` endpoint was removed. Coupon usage is
// now incremented atomically inside the order-creation transaction
// (see backend/routes/orders.js). Exposing a public bump endpoint allowed
// bots to deplete coupon capacity without ever placing a real order.

module.exports = router;
