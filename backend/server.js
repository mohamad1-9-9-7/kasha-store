require("./env");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { initDB, pool } = require("./db");

const app = express();

// Behind a proxy/load balancer (Vercel/Render/Heroku)
app.set("trust proxy", 1);

// ── Request ID — attach a short correlation id to every request so we can grep
// logs to pinpoint a single bad request among the noise.
app.use((req, res, next) => {
  req.id = crypto.randomBytes(4).toString("hex");
  res.setHeader("X-Request-Id", req.id);
  next();
});

// Crash safety. After an uncaughtException the process state is undefined
// (open transactions, leaked file handles, half-mutated globals), so we MUST
// exit and let the orchestrator (Render) restart with a clean slate. We log
// first, then call shutdown() if it's defined yet, otherwise exit directly.
process.on("unhandledRejection", (reason) => {
  console.error("[UNHANDLED_REJECTION]", reason?.stack || reason);
});
process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT_EXCEPTION]", err?.stack || err);
  // Give logs a tick to flush, then exit non-zero so Render restarts the container.
  setTimeout(() => process.exit(1), 200).unref();
});

// Security headers
app.use(helmet());

// CORS — allow configured frontend URL(s), plus any localhost origin so the
// dev server (5173, 5174, …) and Vite preview don't get blocked when hitting
// the deployed backend. Localhost can never be reached by an external attacker
// so it's safe to whitelist regardless of NODE_ENV.
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = FRONTEND_URL.split(",").map((s) => s.trim()).filter(Boolean);
const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // mobile apps / curl
      if (LOCALHOST_RE.test(origin)) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Reject without throwing — throwing turns into a 500 from Express's
      // default error handler, which is misleading. Returning false makes the
      // browser block the request (correct CORS behavior) without poisoning logs.
      return cb(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));

// Rate limiting — tighter on auth endpoints, general limit on everything else
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "عدد محاولات كبير، حاول لاحقاً" },
});
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use(generalLimiter);
app.use("/api/products", require("./routes/products"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/coupons", require("./routes/coupons"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/users", require("./routes/users"));
app.use("/api/ratings", require("./routes/ratings"));
app.use("/api/abandoned-carts", require("./routes/abandonedCarts"));
app.use("/api/backup", require("./routes/backup"));

app.get("/", (req, res) => res.json({ status: "كشخة backend يشتغل ✅" }));

// Health probe — used by Render and uptime monitors.
// Verifies DB connectivity, doesn't expose internals.
app.get("/healthz", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ ok: false });
  }
});

// Centralized error handler — hides internals from the client, but logs
// enough context (request id, route, method, status, message) to debug.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(JSON.stringify({
    level: "error",
    rid: req.id,
    method: req.method,
    path: req.originalUrl,
    status,
    message: err?.message || String(err),
    // Stack only in non-production to avoid leaking paths in logs aggregators
    stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
    ts: new Date().toISOString(),
  }));
  if (res.headersSent) return next(err);
  res.status(status).json({ error: "خطأ في الخادم", rid: req.id });
});

const PORT = process.env.PORT || 3001;
const server = initDB()
  .then(() => app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`)))
  .catch((e) => {
    console.error("DB init failed:", e);
    process.exit(1);
  });

// Graceful shutdown — Render sends SIGTERM ~30s before forcibly killing the
// container. Drain HTTP + DB connections so in-flight requests aren't truncated.
function shutdown(signal) {
  console.log(`[${signal}] shutting down gracefully...`);
  Promise.resolve(server).then((s) => {
    s?.close?.(() => {
      pool.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 8000).unref();
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
