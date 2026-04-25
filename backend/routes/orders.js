const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { pool } = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");
const { sendMail, orderConfirmationHTML } = require("../lib/mailer");
const { notifyAdminOfOrder } = require("../lib/notifyAdmin");
const { normalizePhone, isValidPhone } = require("../lib/phone");
const { parseZones, computeShipping } = require("../lib/shipping");

// Per-IP cap on order creation to prevent bot floods (real shoppers rarely place >10 orders/15min)
const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "عدد محاولات كبير لإنشاء طلبات، حاول لاحقاً" },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Bundle discount tiers — must stay in sync with src/pages/BundlePage.jsx (BUNDLE_TIERS).
// Discount applies to orders where req.body.type === "BUNDLE".
const BUNDLE_TIERS = [
  { min: 2, pct: 10 },
  { min: 3, pct: 15 },
  { min: 4, pct: 20 },
];
function bundleTierFor(itemCount) {
  for (let i = BUNDLE_TIERS.length - 1; i >= 0; i--) {
    if (itemCount >= BUNDLE_TIERS[i].min) return BUNDLE_TIERS[i];
  }
  return null;
}

// Validate a coupon row and compute its discount given subtotal.
// Returns { discount, error }. Does NOT mutate the coupon (caller increments uses).
function evaluateCoupon(coupon, subtotal) {
  if (!coupon) return { discount: 0, error: "الكوبون غير موجود" };
  if (coupon.active === false) return { discount: 0, error: "الكوبون غير نشط" };
  if (coupon.expiry && Date.now() > new Date(coupon.expiry).getTime()) {
    return { discount: 0, error: "انتهت صلاحية الكوبون" };
  }
  if (coupon.maxUses && (coupon.uses || 0) >= coupon.maxUses) {
    return { discount: 0, error: "تم استنفاد الكوبون" };
  }
  const minOrder = Number(coupon.minOrder) || 0;
  if (minOrder > 0 && subtotal < minOrder) {
    return { discount: 0, error: `الحد الأدنى للطلب: ${minOrder}` };
  }
  const value = Number(coupon.value) || 0;
  let discount = 0;
  if (coupon.type === "percent" || coupon.type === "percentage") {
    discount = round2((subtotal * value) / 100);
  } else {
    discount = round2(value);
  }
  // Discount can't exceed subtotal
  discount = Math.min(discount, subtotal);
  return { discount, error: null };
}

// GET orders — admin: all, user: own orders (by phone in token).
// Pagination: ?page=1&limit=50 returns { items, page, limit, total, hasMore }.
// Without ?page, returns the most recent 200 orders as a flat array (legacy).
router.get("/", requireAuth, async (req, res) => {
  try {
    const { phone } = req.query;
    const paginated = req.query.page != null || req.query.limit != null;
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 200));
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const offset = (page - 1) * limit;

    let whereSql = "";
    const params = [];
    if (req.user?.role === "admin") {
      if (phone) { whereSql = "WHERE data->'customer'->>'phone' = $1"; params.push(phone); }
    } else {
      const userPhone = req.user?.id;
      if (!userPhone) return res.status(401).json({ error: "غير مصرح" });
      if (phone && phone !== userPhone) return res.status(403).json({ error: "ممنوع" });
      whereSql = "WHERE data->'customer'->>'phone' = $1";
      params.push(userPhone);
    }

    const { rows } = await pool.query(
      `SELECT data FROM orders ${whereSql} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, limit, offset]
    );
    const items = rows.map((r) => r.data);
    if (!paginated) return res.json(items);

    const { rows: cRows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM orders ${whereSql}`,
      params
    );
    res.json({ items, page, limit, total: cRows[0]?.c || 0, hasMore: offset + items.length < (cRows[0]?.c || 0) });
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
    // Hard cap to prevent DoS via massive carts that lock thousands of product rows
    const MAX_LINES = 50;
    const MAX_QTY_PER_LINE = 999;
    if (orderItems.length > MAX_LINES) {
      return res.status(400).json({ error: `الحد الأقصى ${MAX_LINES} منتج لكل طلب` });
    }
    for (const it of orderItems) {
      const q = Number(it?.qty) || 0;
      if (q > MAX_QTY_PER_LINE) {
        return res.status(400).json({ error: `الكمية القصوى لكل منتج ${MAX_QTY_PER_LINE}` });
      }
    }

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
        weight: Number(prod.weight) || 0,
        image: it.image || prod.image || "",
        category: it.category || prod.category || "",
        variantSummary: verifiedVariants,
      });
    }

    // ════════════════════════════════════════════════════════════════
    // Server-authoritative money calculation. We DO NOT trust any of:
    //   req.body.totals.*       (subtotal, shippingFee, vatAmount, grandTotal,
    //                            couponDiscount, pointsDiscount, ...)
    //   req.body.loyaltyPoints  (earned, redeemed)
    // The client only supplies: items, customer, couponCode, redeemPoints.
    // Everything money-shaped is recomputed here from DB state.
    // ════════════════════════════════════════════════════════════════
    const subtotal = round2(computedSubtotal);

    // Load store settings (VAT, points, shipping zones) — single source of truth
    const { rows: sRows } = await client.query("SELECT data FROM settings WHERE id = 'main'");
    const settings = sRows[0]?.data || {};

    // ── Bundle discount (server-applied based on item COUNT, not client claim) ──
    const isBundle = req.body?.type === "BUNDLE";
    const itemCount = verifiedItems.reduce((s, it) => s + it.qty, 0);
    const bundleTier = isBundle ? bundleTierFor(itemCount) : null;
    const bundleDiscount = bundleTier ? round2((subtotal * bundleTier.pct) / 100) : 0;

    // ── Coupon (server-validated, locked + incremented in this same transaction) ──
    const couponCodeIn = String(req.body?.couponCode || req.body?.totals?.couponCode || "").trim().toUpperCase();
    let appliedCoupon = null;
    let couponDiscount = 0;
    if (couponCodeIn) {
      const { rows: cRows } = await client.query(
        "SELECT data FROM coupons WHERE id = $1 FOR UPDATE",
        [couponCodeIn]
      );
      const couponRow = cRows[0]?.data || null;
      const evald = evaluateCoupon(couponRow, subtotal);
      if (evald.error) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: evald.error });
      }

      // Per-phone usage cap: if the coupon defines maxUsesPerPhone, count how
      // many active (non-canceled) orders this phone has used the coupon on.
      // Prevents a single bot from exhausting a coupon by spamming guest orders.
      const maxPerPhone = Number(couponRow.maxUsesPerPhone) || 0;
      if (maxPerPhone > 0 && customer.phone) {
        const { rows: usageRows } = await client.query(
          `SELECT COUNT(*)::int AS c FROM orders
            WHERE data->'totals'->>'couponCode' = $1
              AND data->'customer'->>'phone'    = $2
              AND COALESCE(data->>'status', 'NEW') <> 'CANCELED'`,
          [couponCodeIn, customer.phone]
        );
        const used = usageRows[0]?.c || 0;
        if (used >= maxPerPhone) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: `لقد استخدمت هذا الكوبون ${used} مرة (الحد ${maxPerPhone}).`,
          });
        }
      }

      couponDiscount = evald.discount;
      appliedCoupon = { code: couponRow.code, type: couponRow.type, value: couponRow.value };
      // Atomically bump usage count
      await client.query(
        "UPDATE coupons SET data = $1 WHERE id = $2",
        [{ ...couponRow, uses: (couponRow.uses || 0) + 1 }, couponCodeIn]
      );
    }

    // ── Loyalty points (server-validated, debited from user row in same transaction) ──
    const wantRedeem = req.body?.redeemPoints === true || req.body?.redeemPoints === "true";
    const pointsEnabled = settings.pointsEnabled !== false;
    const pointsPerAED      = Number(settings.pointsPerAED)      || 1;
    const pointsRedeemRate  = Number(settings.pointsRedeemRate)  || 100;
    const pointsRedeemValue = Number(settings.pointsRedeemValue) || 10;

    let pointsDiscount = 0;
    let pointsRedeemed = 0;
    let userRow = null;
    let userId = null;
    if (user && user.role !== "admin") {
      userId = user.id;
      const { rows: uRows } = await client.query(
        "SELECT data FROM users WHERE id = $1 FOR UPDATE",
        [userId]
      );
      userRow = uRows[0]?.data || null;
    }

    if (pointsEnabled && wantRedeem && userRow) {
      const balance = Number(userRow.points) || 0;
      const subtotalAfterCoupon = Math.max(0, subtotal - couponDiscount - bundleDiscount);
      const sets = Math.floor(balance / pointsRedeemRate);
      let candidateDiscount = sets * pointsRedeemValue;
      // Discount can't exceed remaining order value
      candidateDiscount = Math.min(candidateDiscount, subtotalAfterCoupon);
      if (candidateDiscount > 0) {
        // Round redeemed point count up to whole sets that cover candidateDiscount
        const setsUsed = Math.ceil(candidateDiscount / pointsRedeemValue);
        pointsRedeemed = setsUsed * pointsRedeemRate;
        pointsDiscount = round2(setsUsed * pointsRedeemValue);
      }
    }

    // ── Shipping (server-computed from zones + customer city) ──
    const zones = parseZones(settings.shippingZones);
    const totalWeightKg = verifiedItems.reduce((s, it) => s + (Number(it.weight) || 0) * it.qty, 0);
    const subtotalAfterDiscounts = Math.max(0, subtotal - couponDiscount - bundleDiscount - pointsDiscount);
    const ship = computeShipping({
      zones,
      emirate: customer.city,
      subtotal: subtotalAfterDiscounts,
      weightKg: totalWeightKg,
      fallbackFee: Number(settings.shippingFee) || 15,
      fallbackFreeOver: Number(settings.freeShipThreshold) || 200,
    });
    const shippingFee = ship.fee;

    // ── VAT (server-computed) ──
    const vatEnabled  = settings.vatEnabled !== false;
    const vatPercent  = Number(settings.vatPercent) || 0;
    const vatIncluded = settings.vatIncluded !== false;
    let vatAmount = 0;
    if (vatEnabled && vatPercent > 0) {
      // VAT is calculated on the goods value after discounts (not on shipping)
      if (vatIncluded) {
        // Price already includes VAT — back it out for reporting
        vatAmount = round2(subtotalAfterDiscounts - subtotalAfterDiscounts / (1 + vatPercent / 100));
      } else {
        vatAmount = round2(subtotalAfterDiscounts * (vatPercent / 100));
      }
    }

    // ── Grand total ──
    // If VAT is "included", prices already had VAT, so don't add it again.
    const goodsTotal = vatEnabled && !vatIncluded
      ? round2(subtotalAfterDiscounts + vatAmount)
      : subtotalAfterDiscounts;
    const grandTotal = round2(goodsTotal + shippingFee);

    // Minimum order check
    const minOrder = Number(settings.minOrderAmount) || 0;
    if (minOrder > 0 && subtotal < minOrder) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `الحد الأدنى للطلب: ${minOrder}` });
    }

    // Earned points are based on the actual amount the customer pays (excluding shipping)
    const earned = pointsEnabled ? Math.floor(goodsTotal * pointsPerAED) : 0;

    // Apply points debit + earn credit to user row in this same transaction
    if (userRow) {
      const newBalance = Math.max(0, (Number(userRow.points) || 0) - pointsRedeemed) + earned;
      await client.query(
        "UPDATE users SET data = $1 WHERE id = $2",
        [{ ...userRow, points: newBalance }, userId]
      );
    }

    const serverTotals = {
      subtotal,
      couponCode: appliedCoupon?.code || null,
      couponDiscount,
      bundleDiscount,
      bundleTier: bundleTier?.pct || 0,
      pointsDiscount,
      shippingFee,
      shippingZone: ship.zoneName,
      totalWeightKg: round2(totalWeightKg),
      vatPercent: vatEnabled ? vatPercent : 0,
      vatIncluded,
      vatAmount,
      grandTotal,
      currency: "AED",
    };

    // Sanitize accepted payment method — never trust raw client value
    const allowedPay = new Set(["cash", "bank"]);
    const payIn = req.body.payment || {};
    const payment = {
      method: allowedPay.has(payIn.method) ? payIn.method : "cash",
      transferRef: payIn.method === "bank" ? String(payIn.transferRef || "").slice(0, 200) : "",
      status: payIn.method === "bank" ? "BANK_PENDING" : "COD_PENDING",
    };

    const order = {
      id,
      type: isBundle ? "BUNDLE" : "STANDARD",
      customer,
      items: verifiedItems,
      totals: serverTotals,
      payment,
      loyaltyPoints: { earned, redeemed: pointsRedeemed },
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

/**
 * Refund the coupon use + reverse the loyalty points (give back redeemed,
 * take back earned) when an order is canceled. Idempotent via the
 * `accountingReversed` flag so double-cancellation can't double-refund.
 */
async function reverseAccountingForOrder(client, order) {
  if (order.accountingReversed) return order;

  // Coupon — decrement uses count
  const couponCode = order.totals?.couponCode;
  if (couponCode) {
    const { rows: cRows } = await client.query(
      "SELECT data FROM coupons WHERE id = $1 FOR UPDATE",
      [couponCode]
    );
    if (cRows.length) {
      const c = cRows[0].data;
      const newUses = Math.max(0, (Number(c.uses) || 0) - 1);
      await client.query(
        "UPDATE coupons SET data = $1 WHERE id = $2",
        [{ ...c, uses: newUses }, couponCode]
      );
    }
  }

  // Loyalty points — only reverse for registered users (guests have no account)
  const phone = order.customer?.phone;
  const earned = Number(order.loyaltyPoints?.earned)   || 0;
  const redeemed = Number(order.loyaltyPoints?.redeemed) || 0;
  if (!order.isGuest && phone && (earned > 0 || redeemed > 0)) {
    const { rows: uRows } = await client.query(
      "SELECT data FROM users WHERE id = $1 FOR UPDATE",
      [phone]
    );
    if (uRows.length) {
      const u = uRows[0].data;
      // Reverse: subtract earned, add back redeemed (clamp at 0)
      const newPoints = Math.max(0, (Number(u.points) || 0) - earned + redeemed);
      await client.query(
        "UPDATE users SET data = $1 WHERE id = $2",
        [{ ...u, points: newPoints }, phone]
      );
    }
  }

  return { ...order, accountingReversed: true };
}

/**
 * Re-apply coupon use + loyalty points when a canceled order is reactivated.
 * Throws if the coupon is now exhausted or the user no longer has enough
 * points — caller should ROLLBACK.
 */
async function reapplyAccountingForOrder(client, order) {
  if (!order.accountingReversed) return order;

  // Coupon — re-validate (still active, still has capacity) before re-incrementing
  const couponCode = order.totals?.couponCode;
  if (couponCode) {
    const { rows: cRows } = await client.query(
      "SELECT data FROM coupons WHERE id = $1 FOR UPDATE",
      [couponCode]
    );
    if (cRows.length) {
      const c = cRows[0].data;
      if (c.active === false) throw new Error("الكوبون لم يعد نشطاً");
      if (c.expiry && Date.now() > new Date(c.expiry).getTime()) throw new Error("الكوبون منتهي الصلاحية");
      if (c.maxUses && (Number(c.uses) || 0) >= c.maxUses) throw new Error("الكوبون استُنفد");
      await client.query(
        "UPDATE coupons SET data = $1 WHERE id = $2",
        [{ ...c, uses: (Number(c.uses) || 0) + 1 }, couponCode]
      );
    }
  }

  // Loyalty points — re-deduct redeemed, re-credit earned
  const phone = order.customer?.phone;
  const earned = Number(order.loyaltyPoints?.earned)   || 0;
  const redeemed = Number(order.loyaltyPoints?.redeemed) || 0;
  if (!order.isGuest && phone && (earned > 0 || redeemed > 0)) {
    const { rows: uRows } = await client.query(
      "SELECT data FROM users WHERE id = $1 FOR UPDATE",
      [phone]
    );
    if (uRows.length) {
      const u = uRows[0].data;
      const balance = Number(u.points) || 0;
      if (balance < redeemed) throw new Error("رصيد النقاط لم يعد كافياً لإعادة تفعيل الطلب");
      const newPoints = Math.max(0, balance - redeemed) + earned;
      await client.query(
        "UPDATE users SET data = $1 WHERE id = $2",
        [{ ...u, points: newPoints }, phone]
      );
    }
  }

  const { accountingReversed, ...rest } = order;
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

    // 📦 إدارة المخزون + المحاسبة (الكوبون والنقاط) حسب تغيير الحالة
    const oldStatus = row.data.status;
    const newStatus = updated.status;
    if (oldStatus !== "CANCELED" && newStatus === "CANCELED") {
      // الطلب اتلغى → رجّع المخزون + ارجع الكوبون + النقاط
      updated = await restoreStockForOrder(client, updated);
      updated = await reverseAccountingForOrder(client, updated);
    } else if (oldStatus === "CANCELED" && newStatus && newStatus !== "CANCELED") {
      // رجّعوه من الإلغاء → اخصم المخزون + اعد تطبيق الكوبون والنقاط
      updated = await deductStockForOrder(client, updated);
      updated = await reapplyAccountingForOrder(client, updated);
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

    // إذا الطلب مش ملغي → رجّع المخزون + الكوبون + النقاط قبل الحذف
    if (row.data.status !== "CANCELED") {
      const restored = await restoreStockForOrder(client, row.data);
      await reverseAccountingForOrder(client, restored);
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
