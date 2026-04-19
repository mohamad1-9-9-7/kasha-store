require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { initDB } = require("./db");

const app = express();

// Behind a proxy/load balancer (Vercel/Render/Heroku)
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS — allow only configured frontend URL(s)
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = FRONTEND_URL.split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // mobile apps / curl
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
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

app.get("/", (req, res) => res.json({ status: "كشخة backend يشتغل ✅" }));

// Centralized error handler — hides internals from the client
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: "خطأ في الخادم" });
});

const PORT = process.env.PORT || 3001;
initDB()
  .then(() => app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`)))
  .catch((e) => {
    console.error("DB init failed:", e);
    process.exit(1);
  });
