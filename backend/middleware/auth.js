const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Pin the verification algorithm to HS256. Without this, jsonwebtoken would
// accept any algorithm declared in the token header — including 'none' or
// asymmetric algs (RS256/ES256) where an attacker can use the HMAC secret as
// the public key. This is the classic JWT "alg confusion" attack.
const JWT_VERIFY_OPTS = { algorithms: ["HS256"] };

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, JWT_VERIFY_OPTS);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "غير مصرح" });
  try {
    req.user = verifyToken(header.slice(7));
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

module.exports = { requireAuth, requireAdmin, verifyToken };
