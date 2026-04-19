import React, { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { slugify, fmt } from "../Theme";
import MiniNav from "../components/MiniNav";
import { ProductSkeleton } from "../components/Skeleton";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";
import { useProducts } from "../hooks/useProducts";
import { fuzzySearch } from "../utils/fuzzySearch";

export default function SearchPage() {
  const { lang } = useLang();
  const t = k => T[lang][k] ?? T.ar[k] ?? k;
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [input, setInput] = useState(q);
  const { products, loading } = useProducts();

  // Fuzzy search with Arabic normalization + typo tolerance
  const results = useMemo(() => fuzzySearch(products, q, 100), [products, q]);

  const search = (e) => {
    e.preventDefault();
    if (input.trim()) setSearchParams({ q: input.trim() });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: lang === "ar" ? "rtl" : "ltr" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} .prod-card{transition:transform .22s ease,box-shadow .22s ease} .prod-card:hover{transform:translateY(-6px);box-shadow:0 20px 44px rgba(0,0,0,.12)!important}`}</style>
      <MiniNav title={q ? `${t("search_for")} "${q}"` : t("search_results")} backTo="/home" />

      <main style={{ maxWidth: 1100, margin: "28px auto", padding: "0 20px" }}>

        {/* سيرش بار */}
        <form onSubmit={search} style={{ marginBottom: 32, display: "flex", gap: 12 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t("search_ph")}
              style={{ width: "100%", padding: "14px 48px 14px 16px", borderRadius: 16, border: "1.5px solid #E2E8F0", fontSize: 16, outline: "none", background: "#fff", boxSizing: "border-box", fontFamily: "'Tajawal',sans-serif", boxShadow: "0 2px 12px rgba(0,0,0,.05)", transition: "border-color .2s, box-shadow .2s" }}
              onFocus={e => { e.target.style.borderColor = "#6366F1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.1)"; }}
              onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "0 2px 12px rgba(0,0,0,.05)"; }}
            />
            <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: "#94A3B8", pointerEvents: "none" }}>🔍</span>
          </div>
          <button type="submit" style={{ padding: "14px 28px", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", borderRadius: 16, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", boxShadow: "0 4px 14px rgba(99,102,241,.4)" }}>
            بحث
          </button>
        </form>

        {/* النتائج */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 20 }}>
            {[1,2,3,4].map(i => <ProductSkeleton key={i} />)}
          </div>
        ) : !q.trim() ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#94A3B8" }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>🔍</div>
            <h3 style={{ fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>ابحث عن أي شيء</h3>
            <p>اكتب اسم منتج أو قسم أو ماركة</p>
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 24, border: "2px dashed #E2E8F0" }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>😕</div>
            <h3 style={{ fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>لا توجد نتائج لـ "{q}"</h3>
            <p style={{ color: "#94A3B8", marginBottom: 24 }}>جرّب كلمات مختلفة أو تصفح الأقسام</p>
            <Link to="/home" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", borderRadius: 12, padding: "11px 24px", fontWeight: 700 }}>
              تصفح الأقسام ←
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ color: "#64748B", fontSize: 14 }}>{lang === "ar" ? "وجدنا" : "Found"} <strong style={{ color: "#6366F1" }}>{results.length}</strong> {lang === "ar" ? `نتيجة لـ "${q}"` : `results for "${q}"`}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 20 }}>
              {results.map((p, i) => {
                const price = Number(p.price), old = Number(p.oldPrice);
                const pct = (Number.isFinite(old) && old > price) ? Math.round(100 - (price / old) * 100) : null;
                return (
                  <Link key={p.id} to={`/product/${p.id}`} className="prod-card"
                    style={{ display: "block", background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: "0 2px 12px rgba(0,0,0,.05)", overflow: "hidden", textDecoration: "none", animation: `fadeUp .4s ${i * .04}s both` }}>
                    <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
                      <img src={p.image || ""} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} />
                      {pct && <span style={{ position: "absolute", top: 10, right: 10, background: "#EF4444", color: "#fff", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 800 }}>وفر {pct}%</span>}
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 11, color: "#6366F1", fontWeight: 700, marginBottom: 4 }}>{p.category}</div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 8, lineHeight: 1.4 }}>{p.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 900, fontSize: 17, color: "#6366F1" }}>{fmt(price)}</span>
                        {pct && <span style={{ textDecoration: "line-through", fontSize: 13, color: "#94A3B8" }}>{fmt(old)}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
