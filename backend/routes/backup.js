const router = require("express").Router();
const { pool } = require("../db");
const { requireAdmin } = require("../middleware/auth");

// GET /api/backup — admin downloads a full JSON backup of the store DB
router.get("/", requireAdmin, async (req, res) => {
  try {
    const tables = ["products", "categories", "orders", "users", "coupons", "settings", "ratings", "abandoned_carts"];
    const out = {
      meta: {
        createdAt: new Date().toISOString(),
        version: 1,
        store: "kashkha",
      },
      data: {},
    };

    for (const t of tables) {
      if (t === "ratings") {
        const { rows } = await pool.query("SELECT product_id, user_id, data, created_at FROM ratings");
        out.data.ratings = rows;
      } else {
        const { rows } = await pool.query(`SELECT * FROM ${t}`);
        out.data[t] = rows;
      }
    }

    // Remove password hashes from users for safety in the exported file
    if (Array.isArray(out.data.users)) {
      out.data.users = out.data.users.map((u) => {
        const data = u.data || {};
        const { password, ...safe } = data;
        return { ...u, data: { ...safe, password: "***REDACTED***" } };
      });
    }

    const filename = `kashkha-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error("GET /backup:", e);
    res.status(500).json({ error: "خطأ في إنشاء النسخة: " + e.message });
  }
});

// GET /api/backup/stats — quick counts for the admin UI
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const tables = ["products", "categories", "orders", "users", "coupons", "ratings", "abandoned_carts"];
    const stats = {};
    for (const t of tables) {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
      stats[t] = rows[0]?.n || 0;
    }
    res.json(stats);
  } catch (e) {
    console.error("GET /backup/stats:", e);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

module.exports = router;
