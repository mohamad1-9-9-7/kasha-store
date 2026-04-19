const router = require("express").Router();
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");

const DEFAULTS = {
  storeName: "كشخة",
  whatsapp: "971585446473",
  announcement: "🚚 توصيل مجاني للطلبات فوق 200 درهم",
  instagram: "",
  tiktok: "",
  facebook: "",
  twitter: "",
};

const ALLOWED_KEYS = Object.keys(DEFAULTS);

// GET settings (public)
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM settings WHERE id = 'main'");
    res.json(rows.length ? rows[0].data : DEFAULTS);
  } catch (e) {
    console.error("GET /settings:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PUT update settings (admin) — whitelist keys
router.put("/", requireAdmin, async (req, res) => {
  try {
    const sanitized = {};
    for (const k of ALLOWED_KEYS) {
      if (k in (req.body || {})) sanitized[k] = String(req.body[k] ?? "");
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
