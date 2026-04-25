const router = require("express").Router();
const { pool } = require("../db");
const { requireAdmin, verifyToken } = require("../middleware/auth");

// Admin-only fields — never returned to non-admin clients.
// Leaking these lets attackers send fake admin notifications, hijack
// webhooks, or impersonate the store on Telegram/WhatsApp.
const ADMIN_ONLY_FIELDS = [
  "adminWebhookUrl",
  "waCloudToken",
  "waCloudPhoneId",
  "waAdminPhone",
  "telegramBotToken",
  "telegramChatId",
];

function isAdminRequest(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return false;
  try {
    return verifyToken(header.slice(7))?.role === "admin";
  } catch {
    return false;
  }
}

function stripAdminOnly(data) {
  const out = { ...data };
  for (const k of ADMIN_ONLY_FIELDS) delete out[k];
  return out;
}

const DEFAULTS = {
  storeName: "كشخة",
  whatsapp: "971585446473",
  announcement: "🚚 توصيل مجاني للطلبات فوق 200 درهم",
  instagram: "",
  tiktok: "",
  facebook: "",
  twitter: "",
  storeEmail: "",
  storeAddress: "",
  pointsEnabled: true,
  pointsPerAED: 1,
  pointsRedeemRate: 100,
  pointsRedeemValue: 10,
  freeShipThreshold: 200,
  minOrderAmount: 0,
  shippingFee: 15,
  vatEnabled: true,
  vatPercent: 5,
  vatIncluded: true,
  // Analytics pixels (paste IDs only)
  fbPixelId: "",         // e.g. 1234567890123456
  gaMeasurementId: "",   // e.g. G-XXXXXXX
  tiktokPixelId: "",     // e.g. ABCDEFGHIJ1234567890
  // Shipping zones: JSON string of [{ zone, emirates: [...], fee, freeOver, perKg }]
  shippingZones: "",
  // إشعارات الأدمن عند أي طلب جديد (اختياري — حط أي واحد أو كلهم)
  adminWebhookUrl: "",     // Zapier / Make / n8n / Discord / Slack
  waCloudToken: "",        // WhatsApp Cloud API — Access Token
  waCloudPhoneId: "",      // WhatsApp Cloud API — Phone Number ID
  waAdminPhone: "",        // رقم الأدمن (مع رمز الدولة)
  telegramBotToken: "",    // Telegram Bot Token
  telegramChatId: "",      // Telegram Chat ID
};

// key → type
const FIELD_TYPES = {
  storeName: "string", whatsapp: "string", announcement: "string",
  instagram: "string", tiktok: "string", facebook: "string", twitter: "string",
  storeEmail: "string", storeAddress: "string",
  pointsEnabled: "bool",
  pointsPerAED: "number", pointsRedeemRate: "number", pointsRedeemValue: "number",
  freeShipThreshold: "number", minOrderAmount: "number", shippingFee: "number",
  vatEnabled: "bool", vatPercent: "number", vatIncluded: "bool",
  fbPixelId: "string", gaMeasurementId: "string", tiktokPixelId: "string",
  shippingZones: "string",
  adminWebhookUrl: "string", waCloudToken: "string", waCloudPhoneId: "string",
  waAdminPhone: "string", telegramBotToken: "string", telegramChatId: "string",
};

function coerce(val, type) {
  if (type === "bool")   return val === true || val === "true" || val === 1 || val === "1";
  if (type === "number") { const n = Number(val); return Number.isFinite(n) ? n : 0; }
  return String(val ?? "");
}

// GET settings — public, but admin-only fields are stripped for non-admins
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM settings WHERE id = 'main'");
    const merged = rows.length ? { ...DEFAULTS, ...rows[0].data } : DEFAULTS;
    res.json(isAdminRequest(req) ? merged : stripAdminOnly(merged));
  } catch (e) {
    console.error("GET /settings:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PUT update settings (admin) — whitelist keys with typed coercion
router.put("/", requireAdmin, async (req, res) => {
  try {
    const sanitized = {};
    for (const [k, type] of Object.entries(FIELD_TYPES)) {
      if (k in (req.body || {})) sanitized[k] = coerce(req.body[k], type);
    }
    const data = { ...DEFAULTS, ...sanitized };
    await pool.query(
      "INSERT INTO settings (id, data) VALUES ('main', $1) ON CONFLICT (id) DO UPDATE SET data = $1",
      [data]
    );
    res.json(data);
  } catch (e) {
    console.error("PUT /settings:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

module.exports = router;
