import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { C, shadow, r, safeParse, slugify, fmt, catName } from "../Theme";
import MiniNav from "../components/MiniNav";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";
import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";

export default function CategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = k => T[lang][k] ?? T.ar[k] ?? k;
  const [nowMs, setNowMs] = useState(Date.now());
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");
  const [brand, setBrand] = useState("");

  const { categories } = useCategories();
  const { products: allProds } = useProducts();

  const categoryName = useMemo(() => {
    const catObj = categories.map(c => typeof c === "string" ? { name: c } : c).find(c => slugify(c?.name) === categoryId);
    return catObj ? catName(catObj) : categoryId;
  }, [categories, categoryId, lang]);

  const products = useMemo(() => allProds.filter(p => slugify(p?.category) === categoryId), [allProds, categoryId]);

  const brands = useMemo(() => {
    const set = new Set(products.map(p => (p.brand || "").trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const countdown = (endIso) => {
    if (!endIso) return null;
    const left = new Date(endIso) - nowMs;
    if (left <= 0) return null;
    const h = Math.floor(left / 3600000), m = Math.floor(left / 60000) % 60, s = Math.floor(left / 1000) % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const filtered = useMemo(() => {
    let arr = [...products];
    if (search) arr = arr.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));
    if (brand)  arr = arr.filter(p => (p.brand || "").trim() === brand);
    if (sort === "price-asc")  arr.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") arr.sort((a, b) => b.price - a.price);
    return arr;
  }, [products, search, sort, brand]);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: lang === "ar" ? "rtl" : "ltr" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .prod-card { transition: transform .22s ease, box-shadow .22s ease; }
        .prod-card:hover { transform: translateY(-6px); box-shadow: 0 20px 44px rgba(0,0,0,.12)!important; }
        @media(max-width:768px){
          .cat-filter { flex-direction: column !important; }
          .cat-grid   { grid-template-columns: repeat(2,1fr) !important; }
          .cat-header { padding: 24px 16px !important; }
        }
        @media(max-width:480px){
          .cat-grid { grid-template-columns: repeat(2,1fr) !important; gap: 12px !important; }
        }
      `}</style>

      <MiniNav title={categoryName} backTo="/home" />

      {/* هيدر القسم */}
      <div className="cat-header" style={{ background: "linear-gradient(135deg,#0F172A,#1E1B4B)", padding: "36px 24px", color: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ color: "#818CF8", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>تسوّق من قسم</p>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: 0 }}>{categoryName}</h1>
          </div>
          <div style={{ background: "rgba(255,255,255,.1)", borderRadius: 12, padding: "10px 20px", border: "1px solid rgba(255,255,255,.15)", fontSize: 14, color: "#C7D2FE", fontWeight: 700 }}>
            {products.length} {t("cat_products")}
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>

        {/* شريط البحث والفلترة */}
        {products.length > 0 && (
          <div className="cat-filter" style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: shadow.sm, padding: "16px 20px", marginBottom: 24, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <input
                placeholder={t("cat_search_ph")}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 40px 10px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 14, outline: "none", background: "#F8FAFC", boxSizing: "border-box", fontFamily: "'Tajawal',sans-serif", transition: "border-color .2s" }}
                onFocus={e => { e.target.style.borderColor = "#6366F1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.1)"; }}
                onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
              />
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 16, pointerEvents: "none" }}>🔍</span>
            </div>
            {brands.length > 0 && (
              <select value={brand} onChange={e => setBrand(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 14, background: "#F8FAFC", color: "#334155", fontWeight: 600, fontFamily: "'Tajawal',sans-serif", cursor: "pointer", outline: "none" }}>
                <option value="">🏷️ كل الماركات</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
            <select value={sort} onChange={e => setSort(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 14, background: "#F8FAFC", color: "#334155", fontWeight: 600, fontFamily: "'Tajawal',sans-serif", cursor: "pointer", outline: "none" }}>
              <option value="default">{t("cat_sort_new")}</option>
              <option value="price-asc">{t("cat_sort_price_asc")}</option>
              <option value="price-desc">{t("cat_sort_price_desc")}</option>
            </select>
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 24, border: "2px dashed #E2E8F0" }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>📦</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>
              {search ? "لا توجد نتائج" : "لا توجد منتجات في هذا القسم"}
            </h3>
            <p style={{ color: "#94A3B8", marginBottom: 24 }}>{search ? "جرّب كلمة بحث مختلفة" : "عد لاحقاً أو تصفح أقساماً أخرى"}</p>
            <Link to="/home" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", borderRadius: 12, padding: "11px 22px", fontWeight: 700, boxShadow: "0 6px 18px rgba(99,102,241,.35)" }}>
              ← الأقسام
            </Link>
          </div>
        ) : (
          <div className="cat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 20 }}>
            {filtered.map((p, idx) => {
              const price = Number(p.price), old = Number(p.oldPrice);
              const pct = (Number.isFinite(old) && old > price) ? Math.round(100 - (price / old) * 100) : null;
              const stock = Number.isFinite(p.stock) ? p.stock : null;
              const timer = countdown(p.saleEnd);
              const soldOut = stock === 0;

              return (
                <article key={p.id} className="prod-card"
                  style={{ background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: shadow.sm, overflow: "hidden", animation: `fadeUp .4s ${idx * 0.04}s both` }}>

                  <Link to={`/product/${p.id}`} style={{ display: "block", position: "relative" }}>
                    <div style={{ position: "relative", overflow: "hidden", height: 200 }}>
                      <img src={(p.image || "").trim() || "https://via.placeholder.com/400x300?text=صورة"}
                        alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .4s ease" }}
                        onMouseOver={e => e.currentTarget.style.transform = "scale(1.06)"}
                        onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                        onError={e => { e.currentTarget.src = "https://via.placeholder.com/400x300?text=صورة"; }} />
                      {pct && (
                        <span style={{ position: "absolute", top: 12, right: 12, background: "#EF4444", color: "#fff", borderRadius: 999, padding: "4px 10px", fontWeight: 800, fontSize: 12 }}>
                          وفر {pct}%
                        </span>
                      )}
                      {soldOut && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ background: "#fff", color: "#0F172A", borderRadius: 10, padding: "8px 16px", fontWeight: 800, fontSize: 14 }}>نفد المخزون</span>
                        </div>
                      )}
                    </div>
                  </Link>

                  <div style={{ padding: "16px" }}>
                    {p.brand && <div style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", marginBottom: 4 }}>🏷️ {p.brand}</div>}
                    <Link to={`/product/${p.id}`} style={{ display: "block", fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 8, lineHeight: 1.4 }}>{p.name}</Link>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontWeight: 900, fontSize: 18, color: "#6366F1" }}>{fmt(price)}</span>
                      {pct && <span style={{ textDecoration: "line-through", fontSize: 13, color: "#94A3B8" }}>{fmt(old)}</span>}
                    </div>

                    {stock !== null && stock > 0 && stock <= (p.lowStockThreshold || 5) && (
                      <div style={{ fontSize: 12, color: "#F59E0B", fontWeight: 700, marginBottom: 8 }}>🔥 بقي {stock} فقط!</div>
                    )}
                    {timer && <div style={{ fontSize: 12, color: "#EC4899", fontWeight: 700, marginBottom: 8 }}>⏰ ينتهي العرض: {timer}</div>}

                    <Link to={`/product/${p.id}`}
                      style={{ display: "block", background: soldOut ? "#F1F5F9" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color: soldOut ? "#94A3B8" : "#fff", borderRadius: 10, padding: "10px", textAlign: "center", fontWeight: 700, fontSize: 14, boxShadow: soldOut ? "none" : "0 4px 14px rgba(99,102,241,.35)", transition: "opacity .15s" }}>
                      {soldOut ? "غير متاح" : "عرض التفاصيل ←"}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
