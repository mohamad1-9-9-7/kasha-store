const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "kashkha-secret-change-in-prod";
const sign = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });

// Admin login
router.post("/admin-login", (req, res) => {
  const { phone, password } = req.body;
  const adminPhone = process.env.ADMIN_PHONE || "0585446473";
  const adminPass  = process.env.ADMIN_PASSWORD || "802410";
  if (phone !== adminPhone || password !== adminPass) {
    return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
  }
  const token = sign({ id: "admin", role: "admin" });
  res.json({ token });
});

// User register
router.post("/register", async (req, res) => {
  try {
    const { name, phone, password, city = "", address = "" } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ error: "البيانات ناقصة" });

    const exists = await pool.query("SELECT id FROM users WHERE id = $1", [phone]);
    if (exists.rows.length > 0) return res.status(400).json({ error: "رقم الهاتف مسجل مسبقاً" });

    const hashed = await bcrypt.hash(password, 10);
    const userData = { name, phone, city, address, password: hashed, points: 0, createdAt: new Date().toISOString() };
    await pool.query("INSERT INTO users (id, data) VALUES ($1, $2)", [phone, userData]);

    const user = { name, phone, city, address, points: 0 };
    res.json({ token: sign({ id: phone, role: "user", name }), user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// User login
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    const result = await pool.query("SELECT data FROM users WHERE id = $1", [phone]);
    if (!result.rows.length) return res.status(401).json({ error: "المستخدم غير موجود" });

    const u = result.rows[0].data;
    const valid = await bcrypt.compare(password, u.password);
    if (!valid) return res.status(401).json({ error: "كلمة المرور غير صحيحة" });

    const user = { name: u.name, phone, city: u.city, address: u.address, points: u.points || 0 };
    res.json({ token: sign({ id: phone, role: "user", name: u.name }), user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/auth/profile — update name, city, address
router.put("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "غير مصرح" });
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: "رمز غير صالح" }); }
    const { name, city, address } = req.body;
    if (!name) return res.status(400).json({ error: "الاسم مطلوب" });
    const { rows } = await pool.query("SELECT data FROM users WHERE id = $1", [decoded.id]);
    if (!rows.length) return res.status(404).json({ error: "المستخدم غير موجود" });
    const updated = { ...rows[0].data, name, city: city || "", address: address || "" };
    await pool.query("UPDATE users SET data = $1 WHERE id = $2", [updated, decoded.id]);
    const user = { name: updated.name, phone: decoded.id, city: updated.city, address: updated.address, points: updated.points || 0 };
    res.json({ user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/auth/change-password
router.put("/change-password", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "غير مصرح" });
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: "رمز غير صالح" }); }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "البيانات ناقصة" });
    if (newPassword.length < 4) return res.status(400).json({ error: "كلمة المرور الجديدة قصيرة جداً" });
    const { rows } = await pool.query("SELECT data FROM users WHERE id = $1", [decoded.id]);
    if (!rows.length) return res.status(404).json({ error: "المستخدم غير موجود" });
    const valid = await bcrypt.compare(currentPassword, rows[0].data.password);
    if (!valid) return res.status(401).json({ error: "كلمة المرور الحالية خاطئة" });
    const hashed = await bcrypt.hash(newPassword, 10);
    const updated = { ...rows[0].data, password: hashed };
    await pool.query("UPDATE users SET data = $1 WHERE id = $2", [updated, decoded.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
