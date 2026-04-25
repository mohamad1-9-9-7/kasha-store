const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { pool } = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");
const { sendMail, orderConfirmationHTML } = require("../lib/mailer");
const { notifyAdminOfOrder } = require("../lib/notifyAdmin");
const { normalizePhone, isValidPhone } = require("../lib/phone");

// Per-IP cap on order creation to prevent bot floods (real shoppers rarely place >10 orders/15min)
const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "عدد محاولات كبير لإنشاء طلبات، حاول لاحقاً" },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
router.post("/", createOrderLimiter, async (req, res) => {
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
      const normalized = normalizePhone(customer.phone);
      if (!isValidPhone(normalized)) {
        return res.status(400).json({ error: "رقم الهاتف غير صالح" });
      }
      customer.phone = normalized;
    }

    // Optional email — if provided, must be syntactically valid
    if (customer.email != null && customer.email !== "") {
      const email = String(customer.email).trim().toLowerCase();
      if (!EMAIL_RE.test(email) || email.length > 254) {
        return res.status(400).json({ error: "البريد الإلكتروني غير صالح" });
      }
      customer.email = email;
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

      // Validate variantSummary against the product's variant schema
      const rawVariants = Array.isArray(it.variantSummary) ? it.variantSummary : [];
      const productVariants = Array.isArray(prod.variants) ? prod.variants : [];
      const verifiedVariants = [];
      for (const v of rawVariants) {
        const grpName = v?.group;
        const optLabel = v?.value;
        if (!grpName || !optLabel) continue;
        const grp = productVariants.find((g) => g?.name === grpName);
        if (!grp) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: `الخيار "${grpName}" غير متوفر للمنتج "${prod.name}"`,
          });
        }
        const opt = (grp.options || []).find((o) => o?.label === optLabel);
        if (!opt) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: `الخيار "${grpName}: ${optLabel}" غير متوفر للمنتج "${prod.name}"`,
          });
        }
        verifiedVariants.push({ group: grp.name, value: opt.label, hex: opt.hex });
      }

      verifiedItems.push({
        id: pid,
        name: prod.name,
        price,
        qty,
        image: it.image || prod.image || "",
        category: it.category || prod.category || "",
        variantSummary: verifiedVariants,
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
async function findOrderRow(id, client = pool) {
  let { rows } = await client.query("SELECT id, data FROM orders WHERE id = $1", [id]);
  if (rows.length) return rows[0];
  const r = await client.query("SELECT id, data FROM orders WHERE data->>'id' = $1", [id]);
  return r.rows[0] || null;
}

/**
 * يرجّع مخزون كل منتجات الطلب (عند الإلغاء أو الحذف).
 * idempotent: لو المخزون مرجوع مسبقاً ما بيرجع مرتين.
 */
async function restoreStockForOrder(client, order) {
  if (order.stockRestored) return order;
  for (const it of (order.items || [])) {
    const pid = String(it.id || "");
    const qty = Number(it.qty) || 0;
    if (!pid || qty < 1) continue;
    const { rows } = await client.query(
      "SELECT data FROM products WHERE id = $1 FOR UPDATE",
      [pid]
    );
    if (!rows.length) continue; // المنتج اتحذف — تخطّاه
    const prod = rows[0].data;
    if (Number.isFinite(prod.stock)) {
      const updated = { ...prod, stock: prod.stock + qty };
      await client.query("UPDATE products SET data = $1 WHERE id = $2", [updated, pid]);
    }
  }
  return { ...order, stockRestored: true };
}

/**
 * يخصم المخزون (عند الرجوع من حالة CANCELED لأي حالة نشطة).
 */
async function deductStockForOrder(client, order) {
  if (!order.stockRestored) return order; // المخزون لسا مخصوم
  for (const it of (order.items || [])) {
    const pid = String(it.id || "");
    const qty = Number(it.qty) || 0;
    if (!pid || qty < 1) continue;
    const { rows } = await client.query(
      "SELECT data FROM products WHERE id = $1 FOR UPDATE",
      [pid]
    );
    if (!rows.length) continue;
    const prod = rows[0].data;
    if (Number.isFinite(prod.stock)) {
      const newStock = Math.max(0, prod.stock - qty);
      const updated = { ...prod, stock: newStock };
      await client.query("UPDATE products SET data = $1 WHERE id = $2", [updated, pid]);
    }
  }
  const { stockRestored, ...rest } = order;
  return rest;
}

// PUT update order status (admin) — whitelist allowed fields + auto-restore stock
const ORDER_UPDATABLE = ["status", "note", "trackingNumber", "paymentStatus"];
router.put("/:id", requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await findOrderRow(req.params.id, client);
    if (!row) { await client.query("ROLLBACK"); return res.status(404).json({ error: "الطلب غير موجود" }); }

    const patch = {};
    for (const k of ORDER_UPDATABLE) {
      if (k in req.body) patch[k] = req.body[k];
    }

    let updated = { ...row.data, ...patch };

    // 📦 إدارة المخزون حسب تغيير الحالة
    const oldStatus = row.data.status;
    const newStatus = updated.status;
    if (oldStatus !== "CANCELED" && newStatus === "CANCELED") {
      // الطلب اتلغى → رجّع المخزون
      updated = await restoreStockForOrder(client, updated);
    } else if (oldStatus === "CANCELED" && newStatus && newStatus !== "CANCELED") {
      // رجّعوه من الإلغاء → اخصم المخزون من جديد
      updated = await deductStockForOrder(client, updated);
    }

    await client.query("UPDATE orders SET data = $1 WHERE id = $2", [updated, row.id]);
    await client.query("COMMIT");
    res.json(updated);
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("PUT /orders:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  } finally {
    client.release();
  }
});

// DELETE order (admin) — يرجّع المخزون إذا لسا مخصوم
router.delete("/:id", requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await findOrderRow(req.params.id, client);
    if (!row) { await client.query("ROLLBACK"); return res.status(404).json({ error: "الطلب غير موجود" }); }

    // إذا الطلب مش ملغي → رجّع المخزون قبل الحذف
    if (row.data.status !== "CANCELED") {
      await restoreStockForOrder(client, row.data);
    }

    await client.query("DELETE FROM orders WHERE id = $1", [row.id]);
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("DELETE /orders:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  } finally {
    client.release();
  }
});

module.exports = router;
