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

module.exports = router;
