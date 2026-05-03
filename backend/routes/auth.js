const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { normalizePhone, isValidPhone } = require("../lib/phone");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set. Refusing to start auth routes without it.");
  process.exit(1);
}

const ADMIN_PHONE = process.env.ADMIN_PHONE;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // bcrypt hash — required
if (!ADMIN_PHONE || !ADMIN_PASSWORD_HASH) {
  console.error(
    "FATAL: ADMIN_PHONE and ADMIN_PASSWORD_HASH are required. " +
    "Generate a hash with: node -e \"console.log(require('bcryptjs').hashSync('YOUR_PASSWORD', 10))\""
  );
  process.exit(1);
}

const sign = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

// Admin password hash lives in settings.main.adminPasswordHash once the admin
// changes it through the UI. The env value is the bootstrap that lets the very
// first login work; after a UI change the DB value wins. This way admins can
// rotate their password without redeploying / editing .env on the server.
async function getAdminHash() {
  try {
    const { rows } = await pool.query("SELECT data FROM settings WHERE id = 'main'");
    const stored = rows[0]?.data?.adminPasswordHash;
    if (stored) return stored;
  } catch (e) {
    console.error("getAdminHash:", e.message);
  }
  return ADMIN_PASSWORD_HASH;
}

async function setAdminHash(newHash) {
  const { rows } = await pool.query("SELECT data FROM settings WHERE id = 'main'");
  const merged = { ...(rows[0]?.data || {}), adminPasswordHash: newHash };
  await pool.query(
    `INSERT INTO settings (id, data) VALUES ('main', $1)
     ON CONFLICT (id) DO UPDATE SET data = $1`,
    [merged]
  );
}

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

// User register
router.post("/register", async (req, res) => {
  try {
    const { name, phone, password, city = "", address = "" } = req.body || {};
    if (!name || !phone || !password) return res.status(400).json({ error: "البيانات ناقصة" });
    const normPhone = normalizePhone(phone);
    if (!isValidPhone(normPhone)) return res.status(400).json({ error: "رقم الهاتف غير صحيح" });
    if (String(password).length < 6) return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 خانات على الأقل" });
    if (String(name).length > 100 || String(city).length > 100 || String(address).length > 200) {
      return res.status(400).json({ error: "طول الحقول يتجاوز الحد المسموح" });
    }

    const exists = await pool.query("SELECT id FROM users WHERE id = $1", [normPhone]);
    if (exists.rows.length > 0) return res.status(400).json({ error: "رقم الهاتف مسجل مسبقاً" });

    const hashed = await bcrypt.hash(password, 10);
    const userData = {
      name: String(name).trim(),
      phone: normPhone,
      city: String(city).trim(),
      address: String(address).trim(),
      password: hashed,
      points: 0,
      createdAt: new Date().toISOString(),
    };
    await pool.query("INSERT INTO users (id, data) VALUES ($1, $2)", [normPhone, userData]);

    const user = { name: userData.name, phone: normPhone, city: userData.city, address: userData.address, points: 0 };
    res.json({ token: sign({ id: normPhone, role: "user", name: userData.name }), user });
  } catch (e) {
    console.error("register:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Unified login — handles both admin and regular users from a single endpoint.
// We branch on the phone matching ADMIN_PHONE; everything else falls through
// to the DB-backed user lookup. Both branches use the same generic error
// message so an attacker can't tell whether a phone is admin, registered, or
// non-existent.
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) return res.status(400).json({ error: "البيانات ناقصة" });
    const normPhone = normalizePhone(phone);

    // Admin path — phone matches the configured admin phone
    if (safeEqual(normPhone, normalizePhone(ADMIN_PHONE))) {
      const adminHash = await getAdminHash();
      const passOk = await bcrypt.compare(String(password), adminHash);
      if (!passOk) return res.status(401).json({ error: INVALID_CREDS });
      const token = sign({ id: "admin", role: "admin" });
      const user = { phone: normPhone, isAdmin: true };
      return res.json({ token, user });
    }

    // Regular user path
    const result = await pool.query("SELECT data FROM users WHERE id = $1", [normPhone]);
    if (!result.rows.length) {
      // Bcrypt-compare against a throwaway hash to keep response time roughly
      // constant whether the phone exists or not (mitigates timing-based user
      // enumeration). We don't care about the result.
      await bcrypt.compare(String(password), ADMIN_PASSWORD_HASH);
      return res.status(401).json({ error: INVALID_CREDS });
    }

    const u = result.rows[0].data;
    const valid = await bcrypt.compare(password, u.password);
    if (!valid) return res.status(401).json({ error: INVALID_CREDS });

    const user = { name: u.name, phone: normPhone, city: u.city, address: u.address, points: u.points || 0 };
    res.json({ token: sign({ id: normPhone, role: "user", name: u.name }), user });
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
// Handles both admins (hash stored in settings.main.adminPasswordHash) and
// regular users (hash stored in users.data.password). Branching on JWT role
// keeps a single client-facing endpoint.
router.put("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "البيانات ناقصة" });
    if (String(newPassword).length < 8) return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 8 خانات على الأقل" });

    if (req.user?.role === "admin") {
      const currentHash = await getAdminHash();
      const valid = await bcrypt.compare(String(currentPassword), currentHash);
      if (!valid) return res.status(401).json({ error: "كلمة المرور الحالية خاطئة" });
      // Cost 12 — modern recommendation. Only the admin path uses 12 because
      // user registration/login still uses 10 and we don't want to invalidate
      // existing user hashes here.
      const hashed = await bcrypt.hash(String(newPassword), 12);
      await setAdminHash(hashed);
      return res.json({ ok: true });
    }

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
