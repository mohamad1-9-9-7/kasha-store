const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");
const { sendMail, isConfigured } = require("../lib/mailer");
// Use the SAME normalizer as orders.js so a cart written here is deleted by
// the order flow on submit. Previously this file had its own version that
// only stripped non-digits, so '+971585446473' became '971585446473' here
// while orders.js stored '0585446473' — orphan abandoned-cart row forever.
const { normalizePhone: normalizePhoneCanonical } = require("../lib/phone");

// Tight per-IP limit on the public POST. The general limiter is 120/min;
// a single browser legitimately pings this endpoint once every few seconds
// while the user fills the checkout form, so 30/min is plenty for real
// users while making cart-poisoning enumeration infeasible.
const publicWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

function normalizePhone(s) {
  return normalizePhoneCanonical(s);
}

// Only http(s) URLs are allowed for cart item images. Without this guard a
// poisoned cart could embed `javascript:` or `data:` URLs that render in
// the admin's reminder email when reviewed in webmail clients.
function safeImageUrl(s) {
  const v = String(s || "").trim();
  if (!v) return "";
  if (v.length > 500) return "";
  return /^https?:\/\//i.test(v) ? v : "";
}

function clampString(s, max) {
  return String(s || "").slice(0, max);
}

function reminderHTML(cart, storeName = "كشخة", storeUrl = "") {
  const items = (cart.items || [])
    .map((it) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">
        ${it.image ? `<img src="${escapeHtml(it.image)}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-left:10px" />` : ""}
        ${escapeHtml(it.name)}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${Number(it.qty) || 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:left">${(Number(it.price) || 0).toFixed(2)} د.إ</td>
    </tr>`)
    .join("");
  const name = cart.customer?.name || "";
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8" /><title>سلتك بانتظارك</title></head>
<body style="font-family:Tahoma,Arial,sans-serif;background:#F8FAFC;padding:20px;color:#0F172A;margin:0">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0">
    <div style="background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;padding:28px 24px;text-align:center">
      <div style="font-size:26px;font-weight:900">🛒 سلتك بانتظارك!</div>
      <div style="font-size:14px;opacity:.9;margin-top:6px">${name ? `مرحباً ${escapeHtml(name)}،` : ""} لاحظنا أنك نسيت إتمام طلبك</div>
    </div>
    <div style="padding:24px">
      <p style="font-size:14px;line-height:1.8;color:#334155;margin-bottom:16px">
        منتجاتك المفضّلة لا تزال في انتظارك. أكمل طلبك الآن قبل أن تنفد الكميات! 🔥
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;border:1px solid #F1F5F9;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#6366F1;color:#fff"><th style="padding:10px;text-align:right">المنتج</th><th style="padding:10px">الكمية</th><th style="padding:10px;text-align:left">السعر</th></tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
      <div style="text-align:left;font-weight:900;font-size:18px;color:#6366F1;margin-bottom:22px">
        الإجمالي: ${Number(cart.subtotal || 0).toFixed(2)} د.إ
      </div>
      <div style="text-align:center">
        <a href="${escapeHtml(storeUrl || "#")}/cart" style="display:inline-block;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;padding:13px 36px;border-radius:12px;font-weight:900;text-decoration:none;font-size:15px">
          🛍️ أكمل طلبك الآن
        </a>
      </div>
      <div style="margin-top:24px;padding:14px;background:#ECFDF5;border-radius:10px;font-size:13px;color:#059669">
        💝 إذا احتجت أي مساعدة، تواصل معنا عبر واتساب.
      </div>
    </div>
    <div style="padding:16px;text-align:center;font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0">
      ${escapeHtml(storeName)} — شكراً لاهتمامك 💜
    </div>
  </div>
</body>
</html>`.trim();
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Upsert abandoned cart (public — pinged by the checkout form as the user types).
// Validation is strict: anyone can call this without auth, so cart poisoning
// (writing garbage or phishing image URLs to another customer's row) and PII
// enumeration (probing whether a phone exists) are the threats we mitigate.
const MAX_ITEMS = 50;
const MAX_NAME_LEN = 200;
router.post("/", publicWriteLimiter, async (req, res) => {
  try {
    const { id, customer, items, subtotal } = req.body || {};
    const phone = normalizePhone(id);
    // Phone-only keys, length 7–15 digits (E.164 max). Rejecting non-phone keys
    // also blocks abuse where an attacker writes random fingerprints to bloat the table.
    if (!phone || phone.length < 7 || phone.length > 15) {
      return res.status(400).json({ error: "رقم غير صالح" });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
      return res.status(400).json({ error: "بيانات ناقصة" });
    }
    const cleanItems = items.map((it) => ({
      id: clampString(it?.id, 64),
      name: clampString(it?.name, MAX_NAME_LEN),
      price: Math.max(0, Math.min(1e6, Number(it?.price) || 0)),
      qty: Math.max(1, Math.min(999, Number(it?.qty) || 1)),
      image: safeImageUrl(it?.image),
    }));
    const c = customer || {};
    const data = {
      id: phone,
      customer: {
        name: clampString(c.name, 100),
        phone,
        email: clampString(c.email, 200),
        city: clampString(c.city, 50),
        address: clampString(c.address, 300),
      },
      items: cleanItems,
      subtotal: Math.max(0, Math.min(1e7, Number(subtotal) || 0)),
      updatedAt: new Date().toISOString(),
    };
    await pool.query(
      `INSERT INTO abandoned_carts (id, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [phone, data]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("POST /abandoned-carts:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Note: there's no public DELETE here. The order-creation flow already deletes
// the cart by normalized phone (orders.js:429), so the client never needs to
// call delete directly. Admin deletion is exposed under /admin/:id below.

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

// Admin: send reminder email to a specific abandoned cart
router.post("/admin/:id/remind", requireAdmin, async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ error: "SMTP غير مُعدّ — أضف متغيرات البيئة" });
    }
    const { rows } = await pool.query("SELECT data FROM abandoned_carts WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "السلة غير موجودة" });
    const cart = rows[0].data;
    const email = cart.customer?.email;
    if (!email) return res.status(400).json({ error: "لا يوجد بريد إلكتروني لهذا العميل" });

    const settingsQ = await pool.query("SELECT data FROM settings WHERE id = 'main'");
    const storeName = settingsQ.rows[0]?.data?.storeName || "كشخة";
    const storeUrl = req.body?.storeUrl || req.headers.origin || "";

    const result = await sendMail({
      to: email,
      subject: `🛒 سلتك بانتظارك في ${storeName}`,
      html: reminderHTML(cart, storeName, storeUrl),
    });
    if (result.skipped) return res.status(503).json({ error: "SMTP غير مُعدّ" });
    if (result.ok === false) return res.status(502).json({ error: result.error || "فشل الإرسال" });

    // Mark last reminder time
    const patched = { ...cart, lastReminderAt: new Date().toISOString() };
    await pool.query("UPDATE abandoned_carts SET data = $1 WHERE id = $2", [patched, req.params.id]);

    res.json({ ok: true, sentTo: email });
  } catch (e) {
    console.error("POST /abandoned-carts/admin/:id/remind:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Admin: bulk send reminders to all abandoned carts that have email
router.post("/admin/remind-all", requireAdmin, async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ error: "SMTP غير مُعدّ — أضف متغيرات البيئة" });
    }
    const { rows } = await pool.query("SELECT id, data FROM abandoned_carts ORDER BY updated_at DESC");
    const settingsQ = await pool.query("SELECT data FROM settings WHERE id = 'main'");
    const storeName = settingsQ.rows[0]?.data?.storeName || "كشخة";
    const storeUrl = req.body?.storeUrl || req.headers.origin || "";
    const maxAgeHours = Number(req.body?.maxAgeHours) || 168; // default 7 days
    const now = Date.now();

    let sent = 0, skipped = 0, failed = 0;
    const errors = [];
    for (const r of rows) {
      const cart = r.data || {};
      const email = cart.customer?.email;
      if (!email) { skipped++; continue; }
      const updatedAt = cart.updatedAt ? new Date(cart.updatedAt).getTime() : 0;
      if (updatedAt && (now - updatedAt) / 3600000 > maxAgeHours) { skipped++; continue; }

      const result = await sendMail({
        to: email,
        subject: `🛒 سلتك بانتظارك في ${storeName}`,
        html: reminderHTML(cart, storeName, storeUrl),
      }).catch((e) => ({ ok: false, error: e.message }));

      if (result.ok) {
        sent++;
        const patched = { ...cart, lastReminderAt: new Date().toISOString() };
        await pool.query("UPDATE abandoned_carts SET data = $1 WHERE id = $2", [patched, r.id]);
      } else {
        failed++;
        errors.push({ id: r.id, error: result.error || "unknown" });
      }
    }

    res.json({ sent, skipped, failed, errors: errors.slice(0, 20) });
  } catch (e) {
    console.error("POST /abandoned-carts/admin/remind-all:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

module.exports = router;
