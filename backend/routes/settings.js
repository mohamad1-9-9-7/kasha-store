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

// GET settings (public)
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM settings WHERE id = 'main'");
    res.json(rows.length ? rows[0].data : DEFAULTS);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update settings (admin)
router.put("/", requireAdmin, async (req, res) => {
  try {
    const data = { ...DEFAULTS, ...req.body };
    await pool.query(
      "INSERT INTO settings (id, data) VALUES ('main', $1) ON CONFLICT (id) DO UPDATE SET data = $1",
      [data]
    );
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
