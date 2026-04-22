import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";
import { C, shadow, safeParse, slugify, fmt } from "../Theme";
import MiniNav from "../components/MiniNav";
import { useProducts } from "../hooks/useProducts";
import { useRatings, submitRating } from "../hooks/useRatings";

function useCountdown(endIso) {
  const [left, setLeft] = useState(() => endIso ? new Date(endIso) - Date.now() : 0);
  useEffect(() => {
    if (!endIso) return;
    const t = setInterval(() => setLeft(new Date(endIso) - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endIso]);
  if (!endIso || left <= 0) return null;
  const h = Math.floor(left / 3600000), m = Math.floor(left / 60000) % 60, s = Math.floor(left / 1000) % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── نجوم ── */
function Stars({ value, size = 20, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i}
          onClick={() => onChange && onChange(i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{ fontSize: size, cursor: onChange ? "pointer" : "default", color: i <= (hover || value) ? "#F59E0B" : "#E2E8F0", transition: "color .1s", lineHeight: 1 }}>★</span>
      ))}
    </div>
  );
}

/* ── كارد منتج مصغر ── */
function ProductCard({ p }) {
  const pct = (p.oldPrice > p.price) ? Math.round(100 - (p.price / p.oldPrice) * 100) : null;
  return (
    <Link to={`/product/${p.id}`} style={{ textDecoration: "none", display: "block", background: "#fff", borderRadius: 18, border: "1px solid #F1F5F9", boxShadow: shadow.sm, overflow: "hidden", transition: "transform .2s, box-shadow .2s" }}
      onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = shadow.md; }}
      onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadow.sm; }}>
      <div style={{ height: 160, background: "#F8FAFC", position: "relative", overflow: "hidden" }}>
        {p.image
          ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display="none"} />
          : <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,opacity:.25 }}>📦</div>
        }
        {pct && <span style={{ position:"absolute",top:8,right:8,background:"#EF4444",color:"#fff",borderRadius:999,padding:"3px 8px",fontSize:11,fontWeight:800 }}>-{pct}%</span>}
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A", marginBottom: 6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontWeight: 900, fontSize: 15, color: "#6366F1" }}>{fmt(p.price)}</span>
          {p.oldPrice > p.price && <span style={{ textDecoration:"line-through", fontSize:12, color:"#94A3B8" }}>{fmt(p.oldPrice)}</span>}
        </div>
      </div>
    </Link>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cartCtx = useContext(CartContext);
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [viewers, setViewers] = useState(() => Math.floor(Math.random() * 7) + 2);
  // اختيارات المتغيرات: { [groupId]: optionId }
  const [selectedVars, setSelectedVars] = useState({});

  /* تقييمات */
  const { ratings, refresh: refreshRatings } = useRatings(id);
  const [myStars, setMyStars]       = useState(0);
  const [myComment, setMyComment]   = useState("");
  const [submitted, setSubmitted]   = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const { toggle, isWishlisted } = useWishlist();
  const { lang } = useLang();
  const t = k => T[lang][k] ?? T.ar[k] ?? k;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const user = useMemo(() => safeParse("user", null), []);
  const { products: allProds, loading: productsLoading } = useProducts();

  useEffect(() => {
    if (!allProds.length) return;
    setAllProducts(allProds);
    const found = allProds.find((p) => String(p.id) === String(id)) || null;
    setProduct(found);
    setActiveImg(0);
    setImgLoaded(false);
    // Open Graph meta tags — use custom metaTitle/metaDescription if set
    if (found) {
      const metaTitle = (found.metaTitle || "").trim() || `${found.name} — كشخة`;
      const metaDesc = (found.metaDescription || "").trim()
        || found.description
        || `${found.name} — ${fmt(found.price)} درهم`;

      document.title = metaTitle;
      const setMeta = (prop, val, isName) => {
        const sel = isName ? `meta[name="${prop}"]` : `meta[property="${prop}"]`;
        let el = document.querySelector(sel);
        if (!el) { el = document.createElement("meta"); el[isName ? "name" : "property"] = prop; document.head.appendChild(el); }
        el.content = val;
      };
      const url = window.location.href;
      setMeta("og:title", metaTitle);
      setMeta("og:description", metaDesc);
      setMeta("og:image", found.image || "");
      setMeta("og:url", url);
      setMeta("og:type", "product");
      setMeta("twitter:title", metaTitle);
      setMeta("twitter:description", metaDesc);
      setMeta("twitter:image", found.image || "");
      setMeta("description", metaDesc, true);
    }
    return () => { document.title = "كشخة"; };
  }, [id, allProds]);

  /* تغيير عدد المشاهدين كل 30 ثانية */
  useEffect(() => {
    const t = setInterval(() => setViewers(Math.floor(Math.random() * 7) + 2), 30000);
    return () => clearInterval(t);
  }, []);

  const addToCart = useMemo(() => {
    if (cartCtx?.addToCart) return cartCtx.addToCart;
    return (prod, q) => {
      const cart = safeParse("cart", []);
      const idx = cart.findIndex((it) => String(it.id) === String(prod.id));
      if (idx >= 0) cart[idx].qty = (cart[idx].qty || 0) + q;
      else cart.push({ id: prod.id, name: prod.name, price: prod.price, qty: q, image: prod.image, category: prod.category });
      localStorage.setItem("cart", JSON.stringify(cart));
    };
  }, [cartCtx]);

  const timer = useCountdown(product?.saleEnd);

  /* سعر بعد الخيارات */
  const variantPriceAdj = useMemo(() => {
    if (!product?.variants) return 0;
    return product.variants.reduce((sum, grp) => {
      const selId = selectedVars[grp.id];
      const opt = grp.options?.find(o => o.id === selId);
      return sum + (opt?.priceAdj || 0);
    }, 0);
  }, [selectedVars, product]);

  /* التحقق إن كل الخيارات الإجبارية محددة */
  const allVariantsSelected = useMemo(() => {
    if (!product?.variants?.length) return true;
    return product.variants.filter(g => g.required).every(g => selectedVars[g.id]);
  }, [selectedVars, product]);

  /* منتجات مشابهة */
  const related = useMemo(() => {
    if (!product) return [];
    return allProducts.filter(p => p.category === product.category && String(p.id) !== String(id) && !p.hidden).slice(0, 4);
  }, [product, allProducts, id]);

  /* متوسط التقييم */
  const avgRating = useMemo(() => {
    if (!ratings.length) return 0;
    return ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
  }, [ratings]);

  /* تحميل تقييم المستخدم الحالي من البيانات المجلوبة */
  useEffect(() => {
    if (!user || !ratings.length) return;
    const myId = user.uid || user.phone;
    const mine = ratings.find(r => r.userId === myId);
    if (mine) { setMyStars(mine.stars); setMyComment(mine.comment || ""); setSubmitted(true); }
  }, [ratings, user]);

  const handleSubmitRating = async () => {
    if (!myStars || submittingRating) return;
    if (!user) { alert("سجّل الدخول أولاً لتقييم المنتج"); return; }
    try {
      setSubmittingRating(true);
      await submitRating(id, {
        stars: myStars,
        comment: myComment.trim(),
        name: user.name || "مستخدم",
      });
      await refreshRatings();
      setSubmitted(true);
      alert("✅ شكراً! تقييمك قيد المراجعة وسيظهر بعد موافقة الإدارة.");
    } catch (e) {
      alert("❌ فشل إرسال التقييم: " + (e.message || ""));
    } finally {
      setSubmittingRating(false);
    }
  };

  if (productsLoading || (!product && !allProds.length)) return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: dir, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: 48 }}>
        <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>⏳</div>
        <p style={{ color: "#64748B", fontWeight: 600 }}>{lang === "ar" ? "جاري تحميل المنتج..." : "Loading product..."}</p>
      </div>
    </div>
  );

  if (!product) return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: dir, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: 48, background: "#fff", borderRadius: 24, boxShadow: shadow.md }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>😕</div>
        <h3 style={{ color: "#0F172A", fontWeight: 800, marginBottom: 8 }}>{lang === "ar" ? "المنتج غير موجود" : "Product not found"}</h3>
        <Link to="/home" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", borderRadius: 12, padding: "10px 22px", fontWeight: 700, marginTop: 16 }}>← {t("nav_home")}</Link>
      </div>
    </div>
  );

  const price = Number(product.price), old = Number(product.oldPrice);
  const pct = (Number.isFinite(old) && old > price) ? Math.round(100 - (price / old) * 100) : null;
  const stock = Number.isFinite(product.stock) ? product.stock : null;
  const canBuy = stock === null || stock > 0;
  const backCat = product.category ? slugify(product.category) : null;
  const images = (product.images?.length ? product.images : [product.image]).filter(Boolean);

  const finalPrice = price + variantPriceAdj;

  const handleAdd = () => {
    if (!allVariantsSelected) return;
    // بناء ملخص الخيارات المحددة
    const variantSummary = product.variants
      ? product.variants.map(grp => {
          const opt = grp.options?.find(o => o.id === selectedVars[grp.id]);
          return opt ? { group: grp.name, value: opt.label, hex: opt.hex } : null;
        }).filter(Boolean)
      : [];
    // ✅ نخزّن فقط الحقول الخفيفة بالسلة (بدون كل الصور لتفادي امتلاء localStorage)
    const cartItem = {
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: product.image || product.images?.[0] || "",
      category: product.category || "",
      variantSummary,
    };
    addToCart(cartItem, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const shareWhatsApp = () => {
    const url = window.location.href;
    const text = product.name + " — " + fmt(price) + "\n" + url;
    window.open("https://wa.me/?text=" + encodeURIComponent(text));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const wishlisted = isWishlisted(product.id);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: dir }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .thumb { transition: border-color .15s, transform .15s; cursor: pointer; }
        .thumb:hover { transform: scale(1.05); }
        .share-btn { transition: background .15s, transform .15s; }
        .share-btn:hover { transform: translateY(-2px); }
        @media(max-width:768px){
          .pd-grid { grid-template-columns: 1fr !important; }
          .pd-img  { min-height: 280px !important; max-height: 340px !important; }
          .pd-body { padding: 20px !important; }
          .pd-btns { flex-direction: column !important; }
          .pd-btns button, .pd-btns a { flex: none !important; width: 100% !important; }
          .related-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media(max-width:480px){
          .related-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>

      <MiniNav backTo={backCat ? `/category/${backCat}` : "/home"} />

      <main style={{ maxWidth: 1060, margin: "32px auto", padding: "0 20px" }}>

        {/* ═══ المنتج الرئيسي ═══ */}
        <div className="pd-grid" style={{ background: "#fff", borderRadius: 24, border: "1px solid #F1F5F9", boxShadow: shadow.md, overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr", animation: "fadeUp .4s ease both" }}>

          {/* الصورة */}
          <div style={{ background: "#F8FAFC", display: "flex", flexDirection: "column" }}>
            <div className="pd-img" style={{ position: "relative", flex: 1, minHeight: 380 }}>
              {!imgLoaded && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#F1F5F9" }}>
                  <div style={{ fontSize: 48, opacity: .3 }}>📦</div>
                </div>
              )}
              <img
                src={(images[activeImg] || "").trim() || "https://placehold.co/600x500?text=صورة"}
                alt={product.name}
                onLoad={() => setImgLoaded(true)}
                style={{ width: "100%", height: "100%", minHeight: 380, objectFit: "cover", display: "block", opacity: imgLoaded ? 1 : 0, transition: "opacity .3s" }}
                onError={e => { e.currentTarget.src = "https://placehold.co/600x500?text=صورة"; setImgLoaded(true); }}
              />
              {pct && (
                <span style={{ position: "absolute", top: 16, right: 16, background: "#EF4444", color: "#fff", borderRadius: 999, padding: "6px 14px", fontWeight: 800, fontSize: 13 }}>
                  وفر {pct}%
                </span>
              )}
              {/* زر المفضلة */}
              <button onClick={() => toggle(product)}
                style={{ position: "absolute", top: 12, left: 12, width: 42, height: 42, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", fontSize: 20, boxShadow: "0 2px 10px rgba(0,0,0,.15)", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s", zIndex: 2 }}
                onMouseOver={e => e.currentTarget.style.transform="scale(1.12)"} onMouseOut={e => e.currentTarget.style.transform="scale(1)"}>
                {wishlisted ? "❤️" : "🤍"}
              </button>
              {/* 🔥 عدد المشاهدين */}
              <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(15,23,42,.75)", backdropFilter: "blur(6px)", color: "#fff", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                {viewers} {lang === "ar" ? "يشاهدون الآن" : "watching now"}
              </div>
            </div>
            {/* Thumbnails */}
            {images.length > 1 && (
              <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", background: "#fff", borderTop: "1px solid #F1F5F9" }}>
                {images.map((img, i) => (
                  <img key={i} src={img} alt={`صورة ${i+1}`} onClick={() => { setActiveImg(i); setImgLoaded(false); }}
                    className="thumb"
                    style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 10, border: `2.5px solid ${activeImg === i ? "#6366F1" : "#E2E8F0"}`, flexShrink: 0 }}
                    onError={e => e.currentTarget.style.display="none"}
                  />
                ))}
              </div>
            )}
          </div>

          {/* التفاصيل */}
          <div className="pd-body" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: 16 }}>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>{product.category}</span>
                {product.brand && <span style={{ background: "#F0FDF4", color: "#16A34A", borderRadius: 999, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>🏷️ {product.brand}</span>}
                {product.returns === "Returnable" && <span style={{ background: "#ECFDF5", color: "#059669", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>↩️ {lang === "ar" ? "قابل للإرجاع" : "Returnable"}</span>}
                {product.returns === "Non-Returnable" && <span style={{ background: "#FEF2F2", color: "#DC2626", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>🚫 {lang === "ar" ? "غير قابل للإرجاع" : "Non-Returnable"}</span>}
                {product.sku && <span style={{ background: "#F1F5F9", color: "#64748B", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 600, fontFamily: "monospace", letterSpacing: .5 }}>SKU: {product.sku}</span>}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0F172A", marginTop: 12, lineHeight: 1.4 }}>{product.name}</h1>
              {/* متوسط التقييم */}
              {ratings.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <Stars value={Math.round(avgRating)} size={16} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B" }}>{avgRating.toFixed(1)}</span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>({ratings.length} تقييم)</span>
                </div>
              )}
            </div>

            {/* السعر */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px", background: "#F8FAFC", borderRadius: 14, border: "1px solid #F1F5F9" }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: "#6366F1" }}>{fmt(finalPrice)}</span>
              {variantPriceAdj > 0 && (
                <span style={{ fontSize: 13, color: "#10B981", fontWeight: 700 }}>+{fmt(variantPriceAdj)}</span>
              )}
              {pct && (
                <>
                  <span style={{ textDecoration: "line-through", fontSize: 16, color: "#94A3B8" }}>{fmt(old)}</span>
                  <span style={{ background: "#FEF2F2", color: "#EF4444", borderRadius: 999, padding: "4px 10px", fontWeight: 800, fontSize: 12 }}>- {pct}%</span>
                </>
              )}
            </div>

            {/* المخزون */}
            {stock !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: stock === 0 ? "#EF4444" : stock <= (product.lowStockThreshold || 5) ? "#F59E0B" : "#10B981" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: stock === 0 ? "#EF4444" : stock <= (product.lowStockThreshold || 5) ? "#F59E0B" : "#10B981" }}>
                  {stock === 0 ? "نفد المخزون" : stock <= (product.lowStockThreshold || 5) ? `⚠️ بقي ${stock} فقط!` : "✅ متوفر في المخزون"}
                </span>
              </div>
            )}

            {timer && (
              <div style={{ background: "#FDF2F8", border: "1px solid #FBCFE8", color: "#DB2777", borderRadius: 12, padding: "10px 16px", fontWeight: 700, fontSize: 14 }}>
                ⏰ ينتهي العرض خلال: <strong>{timer}</strong>
              </div>
            )}

            {/* الوصف */}
            {product.description && (
              <p style={{ color: "#64748B", lineHeight: 1.8, fontSize: 14, borderTop: "1px solid #F1F5F9", paddingTop: 14, margin: 0 }}>{product.description}</p>
            )}

            {/* جدول المواصفات */}
            {(() => {
              const genderLabel = {
                Unisex: lang === "ar" ? "للجنسين" : "Unisex",
                Male:   lang === "ar" ? "ذكر"     : "Male",
                Female: lang === "ar" ? "أنثى"    : "Female",
              };
              const specs = [
                { label: lang === "ar" ? "المادة"          : "Material",            value: product.material },
                { label: lang === "ar" ? "اللون"           : "Color",               value: product.color },
                { label: lang === "ar" ? "الجنس المستهدف"  : "Target Gender",       value: genderLabel[product.targetGender] || product.targetGender },
                { label: lang === "ar" ? "العمر الموصى به" : "Recommended Age",     value: product.recommendedAge },
                { label: lang === "ar" ? "أبعاد المنتج"    : "Product Dimensions",  value: product.productDimensions },
                { label: lang === "ar" ? "أبعاد العبوة"    : "Package Dimensions",  value: product.packageDimensions },
                { label: lang === "ar" ? "وزن المنتج"      : "Product Weight",      value: product.weight ? `${product.weight} ${lang === "ar" ? "كغ" : "kg"}` : "" },
                { label: lang === "ar" ? "وزن العبوة"      : "Package Weight",      value: product.packageWeight ? `${product.packageWeight} ${lang === "ar" ? "كغ" : "kg"}` : "" },
                { label: lang === "ar" ? "الوزن الحجمي"    : "Volumetric Weight",   value: product.volumetricWeight ? `${product.volumetricWeight} ${lang === "ar" ? "كغ" : "kg"}` : "" },
              ].filter(s => s.value);
              if (!specs.length) return null;
              return (
                <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#334155", marginBottom: 10 }}>
                    📋 {lang === "ar" ? "المواصفات" : "Specifications"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid #F1F5F9", borderRadius: 10, overflow: "hidden" }}>
                    {specs.map((s, i) => (
                      <React.Fragment key={i}>
                        <div style={{ padding: "10px 14px", background: "#F8FAFC", fontSize: 13, fontWeight: 700, color: "#64748B", borderBottom: i < specs.length - 1 ? "1px solid #F1F5F9" : "none" }}>{s.label}</div>
                        <div style={{ padding: "10px 14px", fontSize: 13, color: "#0F172A", fontWeight: 600, borderBottom: i < specs.length - 1 ? "1px solid #F1F5F9" : "none" }}>{s.value}</div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* الشارات */}
            {(product.badges || []).length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {product.badges.map((b, i) => (
                  <span key={i} style={{ background: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{b}</span>
                ))}
              </div>
            )}

            {/* ═══ اختيار المتغيرات ═══ */}
            {(product.variants || []).map(grp => {
              const selId = selectedVars[grp.id];
              return (
                <div key={grp.id}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#334155", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    {grp.name}
                    {grp.required && !selId && <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 600 }}>* مطلوب</span>}
                    {selId && (
                      <span style={{ fontSize: 12, background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "2px 10px", fontWeight: 700 }}>
                        {grp.options?.find(o=>o.id===selId)?.label}
                      </span>
                    )}
                  </div>
                  {grp.type === "color" ? (
                    /* دوائر الألوان */
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {(grp.options || []).map(opt => (
                        <button key={opt.id} type="button" onClick={() => setSelectedVars(s => ({ ...s, [grp.id]: opt.id }))}
                          title={opt.label}
                          style={{ position: "relative", width: 38, height: 38, borderRadius: "50%", background: opt.hex || "#ccc", border: selId === opt.id ? "3px solid #6366F1" : "3px solid transparent", cursor: "pointer", boxShadow: selId === opt.id ? "0 0 0 2px #fff, 0 0 0 4px #6366F1" : "0 2px 6px rgba(0,0,0,.15)", transition: "all .15s", outline: "none" }}>
                          {selId === opt.id && (
                            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 900, textShadow: "0 1px 3px rgba(0,0,0,.4)" }}>✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* أزرار النص */
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(grp.options || []).map(opt => {
                        const outOfStock = opt.stock !== null && opt.stock === 0;
                        const isSelected = selId === opt.id;
                        return (
                          <button key={opt.id} type="button" onClick={() => !outOfStock && setSelectedVars(s => ({ ...s, [grp.id]: opt.id }))}
                            disabled={outOfStock}
                            style={{ padding: "8px 18px", borderRadius: 12, border: `2px solid ${isSelected ? "#6366F1" : "#E2E8F0"}`, background: isSelected ? "#EEF2FF" : outOfStock ? "#F8FAFC" : "#fff", color: isSelected ? "#6366F1" : outOfStock ? "#CBD5E1" : "#334155", fontWeight: isSelected ? 800 : 600, fontSize: 14, cursor: outOfStock ? "not-allowed" : "pointer", fontFamily: "'Tajawal',sans-serif", transition: "all .15s", position: "relative", textDecoration: outOfStock ? "line-through" : "none" }}>
                            {opt.label}
                            {opt.priceAdj > 0 && <span style={{ fontSize: 11, color: isSelected ? "#6366F1" : "#10B981", marginRight: 4 }}>+{opt.priceAdj}</span>}
                            {opt.stock !== null && opt.stock > 0 && opt.stock <= 3 && <span style={{ fontSize: 10, color: "#F59E0B", position: "absolute", top: -6, right: -4 }}>•</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* تنبيه لو لم يختر كل الخيارات */}
            {product.variants?.length > 0 && !allVariantsSelected && (
              <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#B45309", fontWeight: 700 }}>
                ⚠️ {lang === "ar" ? "يرجى اختيار جميع الخيارات المطلوبة" : "Please select all required options"}
              </div>
            )}

            {/* الكمية */}
            {canBuy && (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontWeight: 700, color: "#334155", fontSize: 14 }}>الكمية:</span>
                <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 40, height: 40, background: "#F8FAFC", border: "none", cursor: "pointer", fontSize: 18, color: "#334155", fontWeight: 700 }}
                    onMouseOver={e => e.currentTarget.style.background="#EEF2FF"} onMouseOut={e => e.currentTarget.style.background="#F8FAFC"}>−</button>
                  <span style={{ width: 44, textAlign: "center", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>{qty}</span>
                  <button onClick={() => setQty(q => stock ? Math.min(stock, q + 1) : q + 1)} style={{ width: 40, height: 40, background: "#F8FAFC", border: "none", cursor: "pointer", fontSize: 18, color: "#334155", fontWeight: 700 }}
                    onMouseOver={e => e.currentTarget.style.background="#EEF2FF"} onMouseOut={e => e.currentTarget.style.background="#F8FAFC"}>+</button>
                </div>
              </div>
            )}

            {/* الأزرار */}
            <div className="pd-btns" style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={handleAdd} disabled={!canBuy || !allVariantsSelected}
                style={{ flex: 2, padding: "14px", background: added ? "#10B981" : (!canBuy || !allVariantsSelected) ? "#F1F5F9" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color: (!canBuy || !allVariantsSelected) ? "#94A3B8" : "#fff", border: "none", borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: (!canBuy || !allVariantsSelected) ? "not-allowed" : "pointer", boxShadow: (!canBuy || !allVariantsSelected) ? "none" : "0 6px 18px rgba(99,102,241,.35)", transition: "all .2s", fontFamily: "'Tajawal',sans-serif" }}>
                {added ? "✅ تمت الإضافة!" : !canBuy ? (lang==="ar" ? "غير متاح" : "Unavailable") : !allVariantsSelected ? (lang==="ar" ? "اختر الخيارات أولاً" : "Select options first") : (lang==="ar" ? "🛒 أضف إلى السلة" : "🛒 Add to Cart")}
              </button>
              <Link to="/cart" style={{ flex: 1, padding: "14px", background: "#EEF2FF", color: "#6366F1", border: "1.5px solid #6366F1", borderRadius: 14, fontWeight: 700, fontSize: 14, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                السلة ←
              </Link>
            </div>

            {/* مشاركة */}
            <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid #F1F5F9" }}>
              <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600, alignSelf: "center" }}>مشاركة:</span>
              <button className="share-btn" onClick={shareWhatsApp}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#ECFDF5", color: "#10B981", border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                💬 واتساب
              </button>
              <button className="share-btn" onClick={copyLink}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#EEF2FF", color: "#6366F1", border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                🔗 نسخ الرابط
              </button>
            </div>
          </div>
        </div>

        {/* ═══ التقييمات ═══ */}
        <div style={{ background: "#fff", borderRadius: 24, border: "1px solid #F1F5F9", boxShadow: shadow.sm, padding: "28px", marginTop: 24, animation: "fadeUp .5s .1s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ fontWeight: 900, fontSize: 18, color: "#0F172A", margin: 0 }}>⭐ التقييمات</h2>
            {ratings.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFBEB", borderRadius: 14, padding: "8px 16px" }}>
                <Stars value={Math.round(avgRating)} size={20} />
                <span style={{ fontWeight: 900, fontSize: 22, color: "#F59E0B" }}>{avgRating.toFixed(1)}</span>
                <span style={{ color: "#94A3B8", fontSize: 13 }}>من 5 | {ratings.length} تقييم</span>
              </div>
            )}
          </div>

          {/* نموذج التقييم */}
          {user && !submitted && (
            <div style={{ background: "#F8FAFC", borderRadius: 16, padding: "20px", marginBottom: 24, border: "1.5px dashed #C7D2FE" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#334155", marginBottom: 12 }}>قيّم هذا المنتج</div>
              <Stars value={myStars} size={28} onChange={setMyStars} />
              <textarea placeholder="أضف تعليقك (اختياري)..." value={myComment} onChange={e => setMyComment(e.target.value)} rows={3}
                style={{ width: "100%", marginTop: 12, padding: "12px 14px", borderRadius: 12, border: "1.5px solid #E2E8F0", fontSize: 14, fontFamily: "'Tajawal',sans-serif", color: "#334155", background: "#fff", resize: "vertical", boxSizing: "border-box", outline: "none" }}
                onFocus={e => e.target.style.borderColor="#6366F1"} onBlur={e => e.target.style.borderColor="#E2E8F0"} />
              <button onClick={handleSubmitRating} disabled={!myStars || submittingRating}
                style={{ marginTop: 12, padding: "10px 24px", background: myStars ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : "#F1F5F9", color: myStars ? "#fff" : "#94A3B8", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: myStars && !submittingRating ? "pointer" : "not-allowed", fontFamily: "'Tajawal',sans-serif", opacity: submittingRating ? 0.6 : 1 }}>
                {submittingRating ? "⏳ جاري الإرسال..." : "نشر التقييم ✓"}
              </button>
            </div>
          )}

          {submitted && (
            <div style={{ background: "#ECFDF5", borderRadius: 14, padding: "12px 16px", marginBottom: 20, color: "#10B981", fontWeight: 700, fontSize: 14 }}>
              ✅ شكراً! تم نشر تقييمك
            </div>
          )}

          {!user && (
            <div style={{ background: "#EEF2FF", borderRadius: 14, padding: "14px 16px", marginBottom: 20, color: "#6366F1", fontWeight: 700, fontSize: 14 }}>
              🔐 <Link to="/user-login" style={{ color: "#6366F1" }}>سجّل دخولك</Link> لتتمكن من إضافة تقييم
            </div>
          )}

          {/* قائمة التقييمات */}
          {ratings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px", color: "#94A3B8", background: "#F8FAFC", borderRadius: 14, border: "2px dashed #E2E8F0" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⭐</div>
              <div style={{ fontWeight: 700 }}>لا يوجد تقييمات بعد — كن أول من يقيّم!</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {ratings.map((r, i) => (
                <div key={i} style={{ background: "#F8FAFC", borderRadius: 16, padding: "16px 18px", border: "1px solid #F1F5F9", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: `hsl(${(r.name||"م").charCodeAt(0)*37}deg,60%,55%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>
                    {(r.name || "م").charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "#0F172A" }}>{r.name}</span>
                      <Stars value={r.stars} size={14} />
                      <span style={{ fontSize: 12, color: "#94A3B8", marginRight: "auto" }}>{r.date}</span>
                    </div>
                    {r.comment && <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, margin: 0 }}>{r.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ منتجات قد تعجبك ═══ */}
        {related.length > 0 && (
          <div style={{ marginTop: 32, animation: "fadeUp .5s .2s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontWeight: 900, fontSize: 20, color: "#0F172A", margin: 0 }}>✨ منتجات قد تعجبك</h2>
              {backCat && <Link to={`/category/${backCat}`} style={{ color: "#6366F1", fontWeight: 700, fontSize: 14 }}>عرض الكل ←</Link>}
            </div>
            <div className="related-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {related.map(p => <ProductCard key={p.id} p={p} />)}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
