const router = require("express").Router();
const { pool } = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");
const { sendMail, orderConfirmationHTML } = require("../lib/mailer");
const { notifyAdminOfOrder } = require("../lib/notifyAdmin");

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

// POST create order — supports both authenticated users AND guest checkout
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    // Decode optional token (guest = no token)
    let user = null;
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        user = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      } catch { /* invalid token → treat as guest */ }
    }

    const id = req.body.id || uuidv4();
    const customer = { ...(req.body.customer || {}) };

    // Logged-in non-admin users must use their own phone; guests can set their own
    if (user && user.role !== "admin") {
      customer.phone = user.id || customer.phone;
    }

    // Guest validation: must have name, phone, city, address
    if (!user) {
      if (!customer.name || !customer.phone || !customer.city || !customer.address) {
        return res.status(400).json({ error: "البيانات ناقصة للطلب كزائر" });
      }
      // Normalize phone: digits only; strip leading country code 971 → local (0…)
      const digits = String(customer.phone).replace(/\D/g, "").replace(/^971/, "0");
      if (!/^05\d{8}$/.test(digits)) {
        return res.status(400).json({ error: "رقم الهاتف غير صالح" });
      }
      customer.phone = digits;
    }

    const orderItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!orderItems.length) return res.status(400).json({ error: "السلة فارغة" });

    await client.query("BEGIN");

    // Stock check + decrement, and rebuild authoritative item list from DB prices
    const verifiedItems = [];
    let computedSubtotal = 0;
    for (const it of orderItems) {
      const pid = String(it.id || "");
      const qty = Number(it.qty) || 1;
      if (!pid || qty < 1) continue;
      const { rows } = await client.query(
        "SELECT data FROM products WHERE id = $1 FOR UPDATE",
        [pid]
      );
      if (!rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: `منتج غير موجود: ${it.name || pid}` });
      }
      const prod = rows[0].data;
      if (Number.isFinite(prod.stock)) {
        if (prod.stock < qty) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: `المخزون غير كافٍ لـ "${prod.name}" (المتاح: ${prod.stock})`,
          });
        }
        const updated = { ...prod, stock: prod.stock - qty };
        await client.query("UPDATE products SET data = $1 WHERE id = $2", [updated, pid]);
      }
      const price = Number(prod.price) || 0;
      computedSubtotal += price * qty;
      verifiedItems.push({
        id: pid,
        name: prod.name,
        price,
        qty,
        image: it.image || prod.image || "",
        category: it.category || prod.category || "",
        variantSummary: Array.isArray(it.variantSummary) ? it.variantSummary : [],
      });
    }

    // Server is the source of truth for money. We accept client-supplied totals
    // only for informational fields; we stamp a computed subtotal + grandTotal hint.
    const clientTotals = req.body.totals || {};
    const serverTotals = {
      ...clientTotals,
      subtotal: computedSubtotal,
      currency: "AED",
    };

    const order = {
      ...req.body,
      customer,
      items: verifiedItems,
      totals: serverTotals,
      id,
      status: "NEW",
      isGuest: !user,
      createdAt: new Date().toISOString(),
    };
    await client.query("INSERT INTO orders (id, data) VALUES ($1, $2)", [id, order]);
    await client.query("COMMIT");

    // Clear any abandoned-cart record for this customer (fire-and-forget)
    if (customer.phone) {
      pool.query("DELETE FROM abandoned_carts WHERE id = $1", [customer.phone]).catch(() => {});
    }

    // 📢 إشعار الأدمن بأي طلب جديد (webhook / WhatsApp / Telegram) — fire & forget
    notifyAdminOfOrder(order).catch((e) => console.error("notifyAdmin:", e.message));

    // Customer confirmation email (fire-and-forget).
    if (customer.email) {
      (async () => {
        try {
          const { rows: sRows } = await pool.query(
            "SELECT data FROM settings WHERE id = 'main'"
          );
          const storeName = sRows[0]?.data?.storeName || "كشخة";
          const html = orderConfirmationHTML(order, storeName);
          sendMail({
            to: customer.email,
            subject: `✅ تأكيد طلبك ${order.id} — ${storeName}`,
            html,
          }).catch(() => {});
        } catch (err) {
          console.error("order email dispatch:", err.message);
        }
      })();
    }

    res.json(order);
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("POST /orders:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  } finally {
    client.release();
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
