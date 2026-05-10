const { Pool } = require("pg");
require("./env");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ratings (
      product_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (product_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS ratings_product_idx ON ratings(product_id);
    CREATE TABLE IF NOT EXISTS abandoned_carts (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── Hot-path indexes on JSONB columns ──
    -- Without these, every "find by sku/phone/code/category" hits a full table scan.
    -- Expression indexes are immutable and cheap to maintain.
    CREATE INDEX IF NOT EXISTS products_sku_idx       ON products       ((data->>'sku'));
    CREATE INDEX IF NOT EXISTS products_category_idx  ON products       ((data->>'category'));
    CREATE INDEX IF NOT EXISTS products_featured_idx  ON products       ((data->>'featured')) WHERE (data->>'featured') = 'true';
    CREATE INDEX IF NOT EXISTS orders_phone_idx       ON orders         ((data->'customer'->>'phone'));
    CREATE INDEX IF NOT EXISTS orders_status_idx      ON orders         ((data->>'status'));
    CREATE INDEX IF NOT EXISTS orders_created_idx     ON orders         (created_at DESC);
    CREATE INDEX IF NOT EXISTS categories_name_idx    ON categories     ((data->>'name'));
    CREATE INDEX IF NOT EXISTS categories_slug_idx    ON categories     ((data->>'slug'));
    CREATE INDEX IF NOT EXISTS coupons_code_idx       ON coupons        ((data->>'code'));
    CREATE INDEX IF NOT EXISTS abandoned_carts_phone_idx ON abandoned_carts ((data->>'phone'));
  `);
  console.log("✅ DB tables ready");
}

module.exports = { pool, initDB };
