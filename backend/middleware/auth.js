const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "kashkha-secret-change-in-prod";

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "غير مصرح" });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "جلسة منتهية، سجّل الدخول مجدداً" });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "ممنوع" });
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
