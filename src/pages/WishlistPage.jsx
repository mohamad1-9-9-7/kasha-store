import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";
import { fmt, fmtPrice, prodName } from "../Theme";
import MiniNav from "../components/MiniNav";
import { useProducts } from "../hooks/useProducts";

export default function WishlistPage() {
  const { wishlist, toggle } = useWishlist();
  const { products } = useProducts();
  const { lang } = useLang();
  const t = k => T[lang][k] ?? T.ar[k] ?? k;

  // Pull latest name/nameEn from products for items saved before nameEn was stored.
  const enrichedWishlist = useMemo(() => wishlist.map((w) => {
    const p = products.find((x) => String(x.id) === String(w.id));
    return p ? { ...w, name: p.name, nameEn: p.nameEn, image: p.image ?? w.image } : w;
  }), [wishlist, products]);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: lang === "ar" ? "rtl" : "ltr" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .wish-card{transition:transform .2s,box-shadow .2s}
        .wish-card:hover{transform:translateY(-4px);box-shadow:0 16px 32px rgba(0,0,0,.1)!important}
      `}</style>
      <MiniNav title={t("wishlist_title")} backTo="/home" />

      <main style={{ maxWidth: 1600, margin: "20px auto", padding: "0 24px", animation: "fadeUp .4s ease both" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0F172A", marginBottom: 4 }}>{t("wishlist_title")}</h1>
            <p style={{ color: "#64748B", fontSize: 14 }}>{lang === "ar" ? "منتجاتك المفضلة في مكان واحد" : "Your favorite products in one place"}</p>
          </div>
          {wishlist.length > 0 && (
            <span style={{ background: "#FEE2E2", color: "#EF4444", borderRadius: 999, padding: "6px 16px", fontSize: 14, fontWeight: 700 }}>
              ❤️ {wishlist.length}
            </span>
          )}
        </div>

        {wishlist.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 24, border: "2px dashed #E2E8F0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🤍</div>
            <h3 style={{ fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>{t("wishlist_empty")}</h3>
            <p style={{ color: "#94A3B8", marginBottom: 28 }}>{lang === "ar" ? "اضغط على ❤️ على أي منتج لإضافته هنا" : "Tap ❤️ on any product to save it here"}</p>
            <Link to="/home" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", borderRadius: 14, padding: "13px 28px", fontWeight: 800, textDecoration: "none" }}>
              🛍️ {lang === "ar" ? "تصفح المنتجات" : "Browse Products"}
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 20 }}>
            {enrichedWishlist.map((p, i) => {
              const pct = (p.oldPrice > p.price) ? Math.round(100 - (p.price / p.oldPrice) * 100) : null;
              return (
                <div key={p.id} className="wish-card" style={{ background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: "0 2px 12px rgba(0,0,0,.05)", overflow: "hidden", animation: `fadeUp .4s ${i * .05}s both`, position: "relative" }}>
                  <Link to={`/product/${p.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ position: "relative", height: 200, overflow: "hidden", background: "#F8FAFC" }}>
                      <img src={p.image || ""} alt={prodName(p)} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} />
                      {pct && <span style={{ position: "absolute", top: 10, right: 10, background: "#EF4444", color: "#fff", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 800 }}>{lang === "ar" ? `وفر ${pct}%` : `-${pct}%`}</span>}
                    </div>
                  </Link>
                  <button
                    onClick={() => toggle(p)}
                    style={{ position: "absolute", top: 10, left: 10, width: 36, height: 36, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", fontSize: 18, boxShadow: "0 2px 8px rgba(0,0,0,.15)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                    ❤️
                  </button>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "#6366F1", fontWeight: 700, marginBottom: 4 }}>{p.category}</div>
                    <Link to={`/product/${p.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 8, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{prodName(p)}</div>
                    </Link>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 900, fontSize: 17, color: "#6366F1" }}>{fmtPrice(p.price)}</span>
                      {pct && <span style={{ textDecoration: "line-through", fontSize: 13, color: "#94A3B8" }}>{fmtPrice(p.oldPrice)}</span>}
                    </div>
                    <Link to={`/product/${p.id}`} style={{ display: "block", marginTop: 12, padding: "10px", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", borderRadius: 12, textAlign: "center", fontWeight: 800, fontSize: 13, textDecoration: "none" }}>
                      {t("add_to_cart")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
