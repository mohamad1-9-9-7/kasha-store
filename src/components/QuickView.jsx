import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fmtPrice, prodName, prodDesc } from "../Theme";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";
import { CartContext } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";

export default function QuickView({ product, onClose }) {
  const { lang } = useLang();
  const t = k => T[lang][k] ?? T.ar[k] ?? k;
  const { addToCart } = useContext(CartContext) || { addToCart: () => {} };
  const { toggle: toggleWish, isWishlisted } = useWishlist() || { toggle: () => {}, isWishlisted: () => false };
  const toast = useToast();

  const [qty, setQty] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  if (!product) return null;

  const price = Number(product.price);
  const old = Number(product.oldPrice);
  const pct = (Number.isFinite(old) && old > price) ? Math.round(100 - (price / old) * 100) : null;
  const stock = Number(product.stock);
  const soldOut = Number.isFinite(stock) && stock <= 0;
  const imgs = [product.image, ...(Array.isArray(product.images) ? product.images.filter(x => x && x !== product.image) : [])].filter(Boolean);
  const wished = isWishlisted(product.id);
  const hasVariants = (product.variants || []).length > 0;
  const allVariantsSelected = !hasVariants || (product.variants || []).every((g, gi) => selectedVariants[g.id ?? `g-${gi}`]);

  const onAdd = () => {
    if (soldOut) return;
    if (!allVariantsSelected) {
      toast?.(lang === "ar" ? "اختر كل الخيارات" : "Select all options", "warning");
      return;
    }
    addToCart({ ...product, selectedVariants }, qty);
    toast?.(lang === "ar" ? "✅ أُضيف للسلة" : "✅ Added to cart", "success");
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,.7)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      animation: "qvFade .2s ease", direction: lang === "ar" ? "rtl" : "ltr",
    }}>
      <style>{`
        @keyframes qvFade{from{opacity:0}to{opacity:1}}
        @keyframes qvIn{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        .qv-box{animation: qvIn .25s ease}
      `}</style>
      <div className="qv-box" onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 20, maxWidth: 860, width: "100%", maxHeight: "90vh",
        overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,.3)",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, fontFamily: "'Tajawal',sans-serif",
      }}>
        {/* إغلاق */}
        <button onClick={onClose} style={{
          position: "absolute", top: 16, insetInlineEnd: 16, width: 36, height: 36, borderRadius: "50%",
          background: "#fff", border: "none", cursor: "pointer", fontSize: 18, fontWeight: 800,
          boxShadow: "0 4px 12px rgba(0,0,0,.15)", zIndex: 2,
        }}>×</button>

        {/* صور */}
        <div style={{ padding: 16, background: "#F8FAFC" }}>
          <div style={{ borderRadius: 14, overflow: "hidden", background: "#fff", aspectRatio: "1/1", position: "relative" }}>
            <img src={imgs[activeImg] || "https://via.placeholder.com/500"} alt={prodName(product)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => e.currentTarget.src = "https://via.placeholder.com/500"} />
            {pct && (
              <span style={{ position: "absolute", top: 12, insetInlineEnd: 12, background: "#EF4444", color: "#fff", borderRadius: 999, padding: "4px 11px", fontWeight: 800, fontSize: 13 }}>
                -{pct}%
              </span>
            )}
          </div>
          {imgs.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto" }}>
              {imgs.map((u, i) => (
                <button key={i} onClick={() => setActiveImg(i)} style={{
                  flexShrink: 0, width: 56, height: 56, borderRadius: 10, overflow: "hidden",
                  border: `2px solid ${activeImg === i ? "#6366F1" : "#E2E8F0"}`, cursor: "pointer", padding: 0, background: "#fff",
                }}>
                  <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* تفاصيل */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          {product.brand && <div style={{ fontSize: 11, fontWeight: 800, color: "#16A34A", textTransform: "uppercase" }}>{product.brand}</div>}
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0F172A", lineHeight: 1.3 }}>{prodName(product)}</h2>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 900, fontSize: 26, color: "#6366F1" }}>{fmtPrice(price)}</span>
            {pct && <span style={{ textDecoration: "line-through", fontSize: 16, color: "#94A3B8" }}>{fmtPrice(old)}</span>}
          </div>

          {soldOut ? (
            <span style={{ display: "inline-block", width: "fit-content", background: "#FEF2F2", color: "#B91C1C", borderRadius: 10, padding: "5px 12px", fontWeight: 800, fontSize: 13 }}>
              {t("prod_sold_out")}
            </span>
          ) : stock > 0 ? (
            <span style={{ display: "inline-block", width: "fit-content", background: "#ECFDF5", color: "#047857", borderRadius: 10, padding: "5px 12px", fontWeight: 800, fontSize: 13 }}>
              {stock <= (product.lowStockThreshold || 5) ? `🔥 ${lang === "ar" ? `بقي ${stock} فقط!` : `Only ${stock} left!`}` : t("prod_in_stock")}
            </span>
          ) : null}

          {prodDesc(product) && (
            <p style={{ margin: 0, color: "#475569", fontSize: 14, lineHeight: 1.6, maxHeight: 100, overflow: "auto" }}>
              {prodDesc(product)}
            </p>
          )}

          {/* الخيارات */}
          {(product.variants || []).map((g, gi) => {
            const gid = g.id ?? `g-${gi}`;
            return (
              <div key={gid}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 6 }}>{g.name}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(g.options || []).map((o, oi) => {
                    const oid = o.id ?? `o-${gi}-${oi}`;
                    const active = selectedVariants[gid] === oid;
                    return (
                      <button key={oid} onClick={() => setSelectedVariants(s => ({ ...s, [gid]: oid }))}
                        style={{
                          padding: "6px 12px", background: active ? "#6366F1" : "#F1F5F9",
                          color: active ? "#fff" : "#334155", border: "none", borderRadius: 999,
                          fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Tajawal',sans-serif",
                        }}>
                        {g.type === "color" && o.hex && <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: o.hex, marginInlineEnd: 6, verticalAlign: "middle", border: "1px solid #fff" }} />}
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* الكمية */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#334155" }}>{t("prod_qty")}</span>
            <div style={{ display: "inline-flex", alignItems: "center", background: "#F1F5F9", borderRadius: 10, overflow: "hidden" }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, fontWeight: 900 }}>−</button>
              <span style={{ minWidth: 28, textAlign: "center", fontWeight: 800 }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, fontWeight: 900 }}>+</button>
            </div>
          </div>

          {/* أزرار */}
          <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
            <button onClick={onAdd} disabled={soldOut}
              style={{
                flex: 1, background: soldOut ? "#F1F5F9" : "linear-gradient(135deg,#6366F1,#8B5CF6)",
                color: soldOut ? "#94A3B8" : "#fff", border: "none", borderRadius: 12, padding: "12px",
                fontWeight: 800, fontSize: 14, cursor: soldOut ? "not-allowed" : "pointer",
                fontFamily: "'Tajawal',sans-serif",
                boxShadow: soldOut ? "none" : "0 8px 20px rgba(99,102,241,.35)",
              }}>
              {soldOut ? t("prod_unavailable") : t("prod_add")}
            </button>
            <button onClick={() => { toggleWish(product); }} title={lang === "ar" ? "المفضلة" : "Wishlist"}
              style={{
                width: 46, background: wished ? "#FEF2F2" : "#F1F5F9", border: `2px solid ${wished ? "#EF4444" : "transparent"}`,
                borderRadius: 12, cursor: "pointer", fontSize: 18,
              }}>
              {wished ? "❤️" : "🤍"}
            </button>
            <Link to={`/product/${product.id}`} onClick={onClose}
              style={{
                background: "#F1F5F9", color: "#334155", borderRadius: 12, padding: "12px 14px",
                fontWeight: 800, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center",
              }}>
              {lang === "ar" ? "التفاصيل ←" : "Details →"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
