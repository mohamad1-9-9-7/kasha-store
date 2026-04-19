const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set. Refusing to start auth routes without it.");
  process.exit(1);
}

const ADMIN_PHONE = process.env.ADMIN_PHONE;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // bcrypt hash
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // plaintext fallback (discouraged)
if (!ADMIN_PHONE || (!ADMIN_PASSWORD_HASH && !ADMIN_PASSWORD)) {
  console.error("FATAL: ADMIN_PHONE and ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH) are required.");
  process.exit(1);
}

const sign = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

// Constant-time string comparison to mitigate timing attacks
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Generic message to avoid user enumeration
const INVALID_CREDS = "رقم الهاتف أو كلمة المرور غير صحيحة";

// Admin login
router.post("/admin-login", async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) return res.status(400).json({ error: "البيانات ناقصة" });

    const phoneOk = safeEqual(String(phone), String(ADMIN_PHONE));
    let passOk = false;
    if (ADMIN_PASSWORD_HASH) {
      passOk = await bcrypt.compare(String(password), ADMIN_PASSWORD_HASH);
    } else {
      passOk = safeEqual(String(password), String(ADMIN_PASSWORD));
    }
    if (!phoneOk || !passOk) return res.status(401).json({ error: INVALID_CREDS });

    const token = sign({ id: "admin", role: "admin" });
    res.json({ token });
  } catch (e) {
    console.error("admin-login:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// User register
router.post("/register", async (req, res) => {
  try {
    const { name, phone, password, city = "", address = "" } = req.body || {};
    if (!name || !phone || !password) return res.status(400).json({ error: "البيانات ناقصة" });
    if (!/^05\d{8}$/.test(String(phone))) return res.status(400).json({ error: "رقم الهاتف غير صحيح" });
    if (String(password).length < 6) return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 خانات على الأقل" });
    if (String(name).length > 100 || String(city).length > 100 || String(address).length > 200) {
      return res.status(400).json({ error: "طول الحقول يتجاوز الحد المسموح" });
    }

    const exists = await pool.query("SELECT id FROM users WHERE id = $1", [phone]);
    if (exists.rows.length > 0) return res.status(400).json({ error: "رقم الهاتف مسجل مسبقاً" });

    const hashed = await bcrypt.hash(password, 10);
    const userData = {
      name: String(name).trim(),
      phone: String(phone),
      city: String(city).trim(),
      address: String(address).trim(),
      password: hashed,
      points: 0,
      createdAt: new Date().toISOString(),
    };
    await pool.query("INSERT INTO users (id, data) VALUES ($1, $2)", [phone, userData]);

    const user = { name: userData.name, phone, city: userData.city, address: userData.address, points: 0 };
    res.json({ token: sign({ id: phone, role: "user", name: userData.name }), user });
  } catch (e) {
    console.error("register:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// User login
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) return res.status(400).json({ error: "البيانات ناقصة" });
    const result = await pool.query("SELECT data FROM users WHERE id = $1", [phone]);
    if (!result.rows.length) return res.status(401).json({ error: INVALID_CREDS });

    const u = result.rows[0].data;
    const valid = await bcrypt.compare(password, u.password);
    if (!valid) return res.status(401).json({ error: INVALID_CREDS });

    const user = { name: u.name, phone, city: u.city, address: u.address, points: u.points || 0 };
    res.json({ token: sign({ id: phone, role: "user", name: u.name }), user });
  } catch (e) {
    console.error("login:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PUT /api/auth/profile — update name, city, address
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { name, city, address } = req.body || {};
    if (!name) return res.status(400).json({ error: "الاسم مطلوب" });
    if (String(name).length > 100 || String(city || "").length > 100 || String(address || "").length > 200) {
      return res.status(400).json({ error: "طول الحقول يتجاوز الحد المسموح" });
    }
    const { rows } = await pool.query("SELECT data FROM users WHERE id = $1", [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: "المستخدم غير موجود" });
    const updated = {
      ...rows[0].data,
      name: String(name).trim(),
      city: String(city || "").trim(),
      address: String(address || "").trim(),
    };
    await pool.query("UPDATE users SET data = $1 WHERE id = $2", [updated, req.user.id]);
    const user = {
      name: updated.name,
      phone: req.user.id,
      city: updated.city,
      address: updated.address,
      points: updated.points || 0,
    };
    res.json({ user });
  } catch (e) {
    console.error("profile:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PUT /api/auth/change-password
router.put("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "البيانات ناقصة" });
    if (String(newPassword).length < 6) return res.status(400).json({ error: "كلمة المرور الجديدة قصيرة جداً" });
    const { rows } = await pool.query("SELECT data FROM users WHERE id = $1", [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: "المستخدم غير موجود" });
    const valid = await bcrypt.compare(currentPassword, rows[0].data.password);
    if (!valid) return res.status(401).json({ error: "كلمة المرور الحالية خاطئة" });
    const hashed = await bcrypt.hash(newPassword, 10);
    const updated = { ...rows[0].data, password: hashed };
    await pool.query("UPDATE users SET data = $1 WHERE id = $2", [updated, req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error("change-password:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

module.exports = router;
