require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initDB } = require("./db");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "20mb" })); // base64 images

app.use("/api/auth",       require("./routes/auth"));
app.use("/api/products",   require("./routes/products"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/orders",     require("./routes/orders"));
app.use("/api/coupons",    require("./routes/coupons"));
app.use("/api/settings",   require("./routes/settings"));
app.use("/api/users",      require("./routes/users"));

app.get("/", (req, res) => res.json({ status: "كشخة backend يشتغل ✅" }));

const PORT = process.env.PORT || 3001;
initDB()
  .then(() => app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`)))
  .catch((e) => { console.error("DB init failed:", e); process.exit(1); });
