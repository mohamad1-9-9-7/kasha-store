const router = require("express").Router();
const { pool } = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

// GET orders — admin: all, user: own orders (by phone in token)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { phone } = req.query;
    // Admin can fetch all or filter
    if (req.user?.role === "admin") {
      if (phone) {
        const { rows } = await pool.query(
          "SELECT data FROM orders WHERE data->'customer'->>'phone' = $1 ORDER BY created_at DESC",
          [phone]
        );
        return res.json(rows.map((r) => r.data));
      }
      const { rows } = await pool.query("SELECT data FROM orders ORDER BY created_at DESC");
      return res.json(rows.map((r) => r.data));
    }
    // Regular user can only fetch their own orders
    const userPhone = req.user?.id;
    if (!userPhone) return res.status(401).json({ error: "غير مصرح" });
    if (phone && phone !== userPhone) return res.status(403).json({ error: "ممنوع" });
    const { rows } = await pool.query(
      "SELECT data FROM orders WHERE data->'customer'->>'phone' = $1 ORDER BY created_at DESC",
      [userPhone]
    );
    res.json(rows.map((r) => r.data));
  } catch (e) {
    console.error("GET /orders:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST create order (authenticated user)
router.post("/", requireAuth, async (req, res) => {
  try {
    const id = req.body.id || uuidv4();
    // Force the customer phone to match the authenticated user (prevents spoofing)
    const customer = { ...(req.body.customer || {}) };
    if (req.user?.role !== "admin") {
      customer.phone = req.user?.id || customer.phone;
    }
    const order = {
      ...req.body,
      customer,
      id,
      status: "NEW",
      createdAt: new Date().toISOString(),
    };
    await pool.query("INSERT INTO orders (id, data) VALUES ($1, $2)", [id, order]);
    res.json(order);
  } catch (e) {
    console.error("POST /orders:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Helper: find order row by either id column or data->>'id' (handles legacy rows)
async function findOrderRow(id) {
  let { rows } = await pool.query("SELECT id, data FROM orders WHERE id = $1", [id]);
  if (rows.length) return rows[0];
  const r = await pool.query("SELECT id, data FROM orders WHERE data->>'id' = $1", [id]);
  return r.rows[0] || null;
}

// PUT update order status (admin) — whitelist allowed fields
const ORDER_UPDATABLE = ["status", "note", "trackingNumber", "paymentStatus"];
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const row = await findOrderRow(req.params.id);
    if (!row) return res.status(404).json({ error: "الطلب غير موجود" });
    const patch = {};
    for (const k of ORDER_UPDATABLE) {
      if (k in req.body) patch[k] = req.body[k];
    }
    const updated = { ...row.data, ...patch };
    await pool.query("UPDATE orders SET data = $1 WHERE id = $2", [updated, row.id]);
    res.json(updated);
  } catch (e) {
    console.error("PUT /orders:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// DELETE order (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const row = await findOrderRow(req.params.id);
    if (!row) return res.status(404).json({ error: "الطلب غير موجود" });
    await pool.query("DELETE FROM orders WHERE id = $1", [row.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /orders:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

module.exports = router;
