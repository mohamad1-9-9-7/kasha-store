import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { apiFetch } from "../api";
import { C, shadow, r, inputBase, focusIn, focusOut, safeParse, fmt } from "../Theme";
import MiniNav from "../components/MiniNav";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";
import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";
import { useSettings } from "../hooks/useSettings";
import InvoiceModal from "../components/InvoiceModal";

/* ── بيانات الإمارات ── */
const EMIRATES = [
  { value: "abu-dhabi",     label: "أبوظبي",      labelEn: "Abu Dhabi" },
  { value: "dubai",         label: "دبي",          labelEn: "Dubai" },
  { value: "sharjah",       label: "الشارقة",      labelEn: "Sharjah" },
  { value: "ajman",         label: "عجمان",        labelEn: "Ajman" },
  { value: "umm-al-quwain", label: "أم القيوين",  labelEn: "Umm Al Quwain" },
  { value: "ras-al-khaimah", label: "رأس الخيمة", labelEn: "Ras Al Khaimah" },
  { value: "fujairah",      label: "الفجيرة",      labelEn: "Fujairah" },
];

/* ── خصم الباندل (من 2 فأكثر) ── */
const BUNDLE_TIERS = [
  { min: 2, pct: 10, emoji: "🔥" },
  { min: 3, pct: 15, emoji: "💎" },
  { min: 4, pct: 20, emoji: "🚀" },
];
function bundleDiscount(count) {
  for (let i = BUNDLE_TIERS.length - 1; i >= 0; i--) {
    if (count >= BUNDLE_TIERS[i].min) return BUNDLE_TIERS[i];
  }
  return null;
}

export default function BundlePage() {
  const navigate = useNavigate();
  const toast    = useToast();
  const cartCtx  = useContext(CartContext);
  const { lang } = useLang();
  const t = k => T[lang]?.[k] ?? T.ar[k] ?? k;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const isAr = lang === "ar";

  /* ── بيانات المنتجات والأقسام ── */
  const { products } = useProducts();
  const { categories: allCats } = useCategories();
  const categories = useMemo(() => allCats.filter(c => products.some(p => p.category === c.name || p.category === c.id)), [allCats, products]);
  const { settings: storeSettings } = useSettings();
  const POINTS_ENABLED = storeSettings.pointsEnabled !== false;
  const POINTS_PER_AED = Number(storeSettings.pointsPerAED) || 1;
  const VAT_ENABLED    = storeSettings.vatEnabled !== false;
  const VAT_PERCENT    = Number(storeSettings.vatPercent) || 0;
  const VAT_INCLUDED   = storeSettings.vatIncluded !== false;

  /* ── حالة الباندل ── */
  const [bundle, setBundle]   = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [search, setSearch]   = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  useEffect(() => { if (categories.length && !activeCat) setActiveCat(categories[0]?.name || categories[0]?.id); }, [categories]);

  /* ── إضافة / حذف من الباندل ── */
  const toggle = (p) => {
    setBundle(prev => {
      const exists = prev.find(x => String(x.id) === String(p.id));
      if (exists) return prev.filter(x => String(x.id) !== String(p.id));
      return [...prev, { ...p, qty: 1 }];
    });
  };
  const inBundle = (id) => bundle.some(x => String(x.id) === String(id));
  const updateQty = (id, delta) => {
    setBundle(prev => prev.map(x => String(x.id) === String(id) ? { ...x, qty: Math.max(1, (x.qty || 1) + delta) } : x));
  };
  const removeFromBundle = (id) => setBundle(prev => prev.filter(x => String(x.id) !== String(id)));

  /* ── حسابات ── */
  const subtotal     = bundle.reduce((s, it) => s + (Number(it.price) || 0) * (it.qty || 1), 0);
  const tier         = bundleDiscount(bundle.length);
  const discountAmt  = tier ? Math.round(subtotal * tier.pct / 100) : 0;
  const afterDisc    = Math.max(0, subtotal - discountAmt);
  const vatAmount    = VAT_ENABLED
    ? (VAT_INCLUDED
        ? +(afterDisc * VAT_PERCENT / (100 + VAT_PERCENT)).toFixed(2)
        : +(afterDisc * VAT_PERCENT / 100).toFixed(2))
    : 0;
  const grandTotal   = VAT_ENABLED && !VAT_INCLUDED ? afterDisc + vatAmount : afterDisc;

  /* ── منتجات القسم الحالي ── */
  const filtered = useMemo(() => {
    let list = products.filter(p => p.category === activeCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => (p.name || "").toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCat, search]);

  /* ── One-click checkout ── */
  const user = safeParse("user");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", city: "", address: "", notes: "", payMethod: "cash" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (user) {
      const em = EMIRATES.find(e => e.label === user.city || e.labelEn === user.city);
      setForm(f => ({ ...f, name: user.name || "", phone: user.phone || "", city: em?.value || "", address: user.address || "" }));
    }
  }, []);

  const hasFullProfile = user && user.name && user.phone && user.address;

  const submitOrder = async (oneClick = false) => {
    if (!bundle.length) return toast(isAr ? "أضف منتجات للباندل أولاً" : "Add products to bundle first", "error");
    const f = oneClick ? { name: user?.name, phone: user?.phone, city: EMIRATES.find(e => e.label === user?.city || e.labelEn === user?.city)?.value || form.city, address: user?.address, payMethod: "cash" } : form;
    if (!f.name || !f.phone || !f.address) return toast(isAr ? "يرجى تعبئة جميع البيانات" : "Please fill in all details", "error");

    setLoading(true);
    try {
      const orderId  = `BDL-${Date.now()}`;
      const cityObj  = EMIRATES.find(e => e.value === f.city);
      const cityLabel = isAr ? (cityObj?.label || f.city) : (cityObj?.labelEn || f.city);
      const earnedPoints = POINTS_ENABLED ? Math.floor(grandTotal * POINTS_PER_AED) : 0;

      const createdOrder = await apiFetch("/api/orders", {
        method: "POST",
        body: {
          id: orderId, status: "NEW", type: "BUNDLE",
          customer: { name: f.name, phone: f.phone, city: f.city, cityLabel, address: f.address, notes: f.notes || "" },
          items: bundle.map(it => ({ id: it.id, name: it.name, price: Number(it.price) || 0, qty: it.qty || 1, image: it.image || "", category: it.category || "", variantSummary: it.variantSummary || [] })),
          totals: {
            subtotal,
            bundleDiscount: discountAmt,
            bundleTier: tier?.pct || 0,
            vatPercent: VAT_ENABLED ? VAT_PERCENT : 0,
            vatIncluded: VAT_INCLUDED,
            vatAmount,
            grandTotal,
            currency: "AED",
          },
          payment: { method: f.payMethod || "cash", status: "COD_PENDING" },
          loyaltyPoints: { earned: earnedPoints, redeemed: 0 },
        },
      });

      /* نقاط الولاء */
      if (user && POINTS_ENABLED && earnedPoints > 0) {
        const newPoints = (user.points || 0) + earnedPoints;
        localStorage.setItem("user", JSON.stringify({ ...user, points: newPoints }));
        apiFetch(`/api/users/${user.phone}/points`, { method: "PUT", body: { points: newPoints } }).catch(() => {});
      }

      /* واتساب */
      const adminPhone = (storeSettings.whatsapp || "971585446473").replace(/\D/g, "");
      const itemsList = bundle.map(it => {
        const vs = (it.variantSummary || []).map(v => `${v.group}: ${v.value}`).join(" - ");
        return `• ${it.name} × ${it.qty}${vs ? ` (${vs})` : ""}`;
      }).join("%0A");
      const waMsg = `📦 *باندل جديد!*%0Aرقم: ${orderId}%0Aالعميل: ${f.name}%0Aهاتف: ${f.phone}%0A%0Aالمنتجات:%0A${itemsList}%0A%0Aخصم الباندل: ${tier?.pct || 0}%25%0Aالإجمالي: ${fmt(grandTotal)}`;
      window.open(`https://wa.me/${adminPhone}?text=${waMsg}`, "_blank");

      toast(`✅ ${isAr ? `تم طلب الباندل! ربحت ${earnedPoints} نقطة` : `Bundle ordered! You earned ${earnedPoints} points`}`, "success");
      setBundle([]);
      setInvoiceOrder(createdOrder || null);
    } catch (e) { console.error(e); toast(isAr ? "خطأ في الإرسال" : "Error submitting order", "error"); }
    finally { setLoading(false); }
  };

  const emirateLabel = em => isAr ? em.label : em.labelEn;

  /* ── أيقونة القسم ── */
  const ICON_MAP = { "إلكتر": "💻", "جوال": "📱", "ساعة": "⌚", "عطر": "🌹", "ألعاب": "🧸", "ملاب": "👗", "منزل": "🏠", "رياض": "⚽", "هدا": "🎁", "اكسسوار": "💍" };
  const iconFor = n => { const s = (n || "").toLowerCase(); for (const [k, v] of Object.entries(ICON_MAP)) if (s.includes(k)) return v; return "📦"; };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: dir }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes shimmerBg{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes bounceIn{0%{transform:scale(.3);opacity:0}50%{transform:scale(1.05)}70%{transform:scale(.95)}100%{transform:scale(1);opacity:1}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @media(max-width:900px){.bundle-grid{grid-template-columns:1fr!important}}
        @media(max-width:600px){.products-grid{grid-template-columns:repeat(2,1fr)!important}.cat-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch}}
      `}</style>

      {/* فاتورة رقمية */}
      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          store={storeSettings}
          onClose={() => { setInvoiceOrder(null); navigate("/my-orders"); }}
        />
      )}

      <MiniNav title={isAr ? "📦 بناء الباندل" : "📦 Bundle Builder"} backTo="/home" />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px", animation: "fadeUp .4s ease both" }}>

        {/* ── هيرو ── */}
        <div style={{
          background: "linear-gradient(135deg, #6366F1 0%, #EC4899 50%, #F59E0B 100%)",
          borderRadius: 24, padding: "36px 28px", marginBottom: 28, position: "relative", overflow: "hidden",
          boxShadow: "0 12px 40px rgba(99,102,241,.3)"
        }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
          <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 42, marginBottom: 8 }}>📦</div>
            <h1 style={{ color: "#fff", fontWeight: 900, fontSize: 28, marginBottom: 8, lineHeight: 1.3 }}>
              {isAr ? "اصنع باندلك الخاص" : "Build Your Bundle"}
            </h1>
            <p style={{ color: "rgba(255,255,255,.85)", fontSize: 16, marginBottom: 20, maxWidth: 500, lineHeight: 1.6 }}>
              {isAr
                ? "اختر منتجاتك المفضلة من أقسام مختلفة واحصل على خصم فوري! كل ما زادت المنتجات زاد الخصم 🎉"
                : "Pick your favorite products from different categories and get an instant discount! The more you add, the bigger the savings 🎉"}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {BUNDLE_TIERS.map(tier => (
                <div key={tier.min} style={{
                  background: "rgba(255,255,255,.15)", backdropFilter: "blur(8px)", borderRadius: 12,
                  padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
                  border: "1px solid rgba(255,255,255,.2)"
                }}>
                  <span style={{ fontSize: 20 }}>{tier.emoji}</span>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
                      {isAr ? `${tier.min} منتجات` : `${tier.min} items`}
                    </div>
                    <div style={{ color: "rgba(255,255,255,.8)", fontSize: 12, fontWeight: 600 }}>
                      {isAr ? `خصم ${tier.pct}%` : `${tier.pct}% OFF`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── شريط التقدم ── */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: shadow.sm,
          padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: bundle.length >= 2 ? "linear-gradient(135deg,#10B981,#059669)" : "#F1F5F9",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 18, color: bundle.length >= 2 ? "#fff" : "#94A3B8",
              transition: "all .3s"
            }}>
              {bundle.length}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#0F172A" }}>
                {isAr ? "منتجات مختارة" : "Items Selected"}
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                {tier
                  ? <span style={{ color: "#10B981", fontWeight: 700 }}>{tier.emoji} {isAr ? `خصم ${tier.pct}% مفعّل!` : `${tier.pct}% discount active!`}</span>
                  : <span>{isAr ? `أضف ${2 - bundle.length} منتج للخصم` : `Add ${2 - bundle.length} more for discount`}</span>
                }
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ height: 8, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 999, transition: "width .4s ease",
                width: `${Math.min(100, (bundle.length / 4) * 100)}%`,
                background: bundle.length >= 4 ? "linear-gradient(90deg,#10B981,#059669)" : bundle.length >= 3 ? "linear-gradient(90deg,#6366F1,#8B5CF6)" : bundle.length >= 2 ? "linear-gradient(90deg,#F59E0B,#F97316)" : "#E2E8F0"
              }} />
            </div>
          </div>
          {bundle.length > 0 && (
            <div style={{ textAlign: "end" }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: "#6366F1" }}>{fmt(grandTotal)}</div>
              {discountAmt > 0 && <div style={{ fontSize: 12, color: "#10B981", fontWeight: 700 }}>
                {isAr ? `وفّرت ${fmt(discountAmt)}` : `You save ${fmt(discountAmt)}`}
              </div>}
            </div>
          )}
        </div>

        {/* ── الشبكة الرئيسية ── */}
        <div className="bundle-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>

          {/* ── يسار: منتقي المنتجات ── */}
          <div>
            {/* تبويبات الأقسام */}
            <div className="cat-tabs" style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "nowrap", paddingBottom: 4 }}>
              {categories.map(cat => {
                const name = cat.name || cat.id;
                const active = activeCat === name;
                return (
                  <button key={name} onClick={() => { setActiveCat(name); setSearch(""); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "10px 18px", borderRadius: 12, fontWeight: 700, fontSize: 13,
                      border: active ? "2px solid #6366F1" : "1.5px solid #E2E8F0",
                      background: active ? "#EEF2FF" : "#fff", color: active ? "#6366F1" : "#64748B",
                      cursor: "pointer", whiteSpace: "nowrap", transition: "all .15s",
                      fontFamily: "'Tajawal',sans-serif",
                      boxShadow: active ? "0 4px 12px rgba(99,102,241,.15)" : "none"
                    }}>
                    <span style={{ fontSize: 16 }}>{iconFor(name)}</span>
                    {name}
                    <span style={{
                      background: active ? "#6366F1" : "#F1F5F9", color: active ? "#fff" : "#94A3B8",
                      borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 800,
                      minWidth: 20, textAlign: "center"
                    }}>
                      {products.filter(p => p.category === name).length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* بحث */}
            <div style={{ marginBottom: 16 }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder={isAr ? "🔍 ابحث في هذا القسم..." : "🔍 Search in this category..."}
                style={{ ...inputBase, background: "#fff", boxShadow: shadow.sm }}
                onFocus={focusIn} onBlur={focusOut}
              />
            </div>

            {/* شبكة المنتجات */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#94A3B8" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>📦</div>
                <div style={{ fontWeight: 700 }}>{isAr ? "لا توجد منتجات في هذا القسم" : "No products in this category"}</div>
              </div>
            ) : (
              <div className="products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                {filtered.map(p => {
                  const selected = inBundle(p.id);
                  const pct = (p.oldPrice > p.price) ? Math.round(100 - (p.price / p.oldPrice) * 100) : null;
                  return (
                    <div key={p.id}
                      onClick={() => toggle(p)}
                      style={{
                        background: "#fff", borderRadius: 18, overflow: "hidden", cursor: "pointer",
                        border: selected ? "2.5px solid #6366F1" : "1px solid #F1F5F9",
                        boxShadow: selected ? "0 8px 24px rgba(99,102,241,.2)" : shadow.sm,
                        transition: "all .2s", position: "relative",
                        transform: selected ? "scale(1.02)" : "scale(1)"
                      }}
                      onMouseOver={e => { if (!selected) e.currentTarget.style.transform = "translateY(-4px)"; }}
                      onMouseOut={e => { if (!selected) e.currentTarget.style.transform = "scale(1)"; }}
                    >
                      {/* صورة */}
                      <div style={{ height: 140, background: "#F8FAFC", position: "relative", overflow: "hidden" }}>
                        {p.image
                          ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .3s" }}
                              onError={e => e.currentTarget.style.display = "none"} />
                          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, opacity: .2 }}>📦</div>
                        }
                        {pct && <span style={{ position: "absolute", top: 8, left: 8, background: "#EF4444", color: "#fff", borderRadius: 999, padding: "3px 8px", fontSize: 11, fontWeight: 800 }}>-{pct}%</span>}

                        {/* علامة الاختيار */}
                        {selected && (
                          <div style={{
                            position: "absolute", top: 8, right: 8, width: 32, height: 32,
                            borderRadius: "50%", background: "#6366F1", display: "flex",
                            alignItems: "center", justifyContent: "center",
                            boxShadow: "0 4px 12px rgba(99,102,241,.4)",
                            animation: "bounceIn .4s ease"
                          }}>
                            <span style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>✓</span>
                          </div>
                        )}
                      </div>

                      {/* معلومات */}
                      <div style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 900, fontSize: 15, color: "#6366F1" }}>{fmt(p.price)}</span>
                            {p.oldPrice > p.price && <span style={{ textDecoration: "line-through", fontSize: 11, color: "#94A3B8" }}>{fmt(p.oldPrice)}</span>}
                          </div>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: selected ? "#6366F1" : "#F1F5F9",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all .2s"
                          }}>
                            <span style={{ color: selected ? "#fff" : "#94A3B8", fontWeight: 900, fontSize: 18, lineHeight: 1 }}>
                              {selected ? "−" : "+"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── يمين: ملخص الباندل ── */}
          <div style={{ position: "sticky", top: 80, display: "grid", gap: 16 }}>

            {/* باندلك */}
            <div style={{
              background: "#fff", borderRadius: 20, border: "1px solid #E2E8F0",
              boxShadow: shadow.md, padding: "20px", maxHeight: 400, overflow: "auto"
            }}>
              <h3 style={{ fontWeight: 900, fontSize: 16, color: "#0F172A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                📦 {isAr ? "باندلك" : "Your Bundle"}
                {bundle.length > 0 && (
                  <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 800 }}>
                    {bundle.length}
                  </span>
                )}
              </h3>

              {bundle.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "#94A3B8" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🛍️</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{isAr ? "اختر منتجات لبناء باندلك" : "Select products to build your bundle"}</div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {bundle.map(it => (
                    <div key={it.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      background: "#FAFBFF", borderRadius: 14, border: "1px solid #F1F5F9",
                      animation: "slideUp .3s ease"
                    }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 10, overflow: "hidden",
                        border: "1px solid #F1F5F9", flexShrink: 0, background: "#F8FAFC"
                      }}>
                        {it.image
                          ? <img src={it.image} alt={it.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} />
                          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, opacity: .3 }}>📦</div>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
                        <div style={{ fontSize: 12, color: "#6366F1", fontWeight: 800 }}>{fmt(it.price)}</div>
                      </div>
                      {/* كمية */}
                      <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
                        <button onClick={e => { e.stopPropagation(); updateQty(it.id, -1); }}
                          style={{ width: 26, height: 26, background: "#F8FAFC", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "#334155" }}>−</button>
                        <span style={{ width: 28, textAlign: "center", fontWeight: 800, fontSize: 13 }}>{it.qty || 1}</span>
                        <button onClick={e => { e.stopPropagation(); updateQty(it.id, 1); }}
                          style={{ width: 26, height: 26, background: "#F8FAFC", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "#334155" }}>+</button>
                      </div>
                      <button onClick={e => { e.stopPropagation(); removeFromBundle(it.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#EF4444", padding: 4 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ملخص مالي */}
            {bundle.length > 0 && (
              <div style={{
                background: "#fff", borderRadius: 20, border: "1px solid #E2E8F0",
                boxShadow: shadow.md, padding: "20px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "#64748B", fontSize: 14 }}>
                  <span>{isAr ? "المجموع الفرعي" : "Subtotal"}</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14 }}>
                    <span style={{ color: "#10B981", fontWeight: 700 }}>{tier.emoji} {isAr ? `خصم الباندل (${tier.pct}%)` : `Bundle Discount (${tier.pct}%)`}</span>
                    <span style={{ color: "#10B981", fontWeight: 800 }}>-{fmt(discountAmt)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "#64748B", fontSize: 14 }}>
                  <span>{isAr ? "التوصيل" : "Delivery"}</span>
                  <span style={{ color: "#10B981", fontWeight: 700 }}>{isAr ? "مجاني 🎉" : "Free 🎉"}</span>
                </div>
                {VAT_ENABLED && vatAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "#64748B", fontSize: 13 }}>
                    <span>
                      {isAr ? `ضريبة (${VAT_PERCENT}%)` : `VAT (${VAT_PERCENT}%)`}
                      {VAT_INCLUDED && <span style={{ fontSize: 11, color: "#94A3B8", marginInlineStart: 6 }}>{isAr ? "شاملة" : "incl."}</span>}
                    </span>
                    <span>{fmt(vatAmount)}</span>
                  </div>
                )}
                <div style={{ height: 1, background: "#F1F5F9", margin: "12px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 20, color: "#6366F1" }}>
                  <span>{isAr ? "الإجمالي" : "Total"}</span>
                  <span>{fmt(grandTotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <div style={{ marginTop: 10, background: "#ECFDF5", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#059669", fontWeight: 700, textAlign: "center" }}>
                    🎉 {isAr ? `وفّرت ${fmt(discountAmt)}!` : `You saved ${fmt(discountAmt)}!`}
                  </div>
                )}

                {/* نقاط ستكسبها */}
                {POINTS_ENABLED && (
                  <div style={{ marginTop: 10, background: "#FAF5FF", border: "1px solid #E9D5FF", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>⭐</span>
                    <span style={{ fontSize: 12, color: "#7C3AED", fontWeight: 700 }}>
                      {isAr ? `ستربح ${Math.floor(grandTotal * POINTS_PER_AED)} نقطة!` : `You'll earn ${Math.floor(grandTotal * POINTS_PER_AED)} points!`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* أزرار الشراء */}
            {bundle.length > 0 && (
              <div style={{ display: "grid", gap: 10 }}>
                {/* زر One-Click */}
                {hasFullProfile && (
                  <button onClick={() => submitOrder(true)} disabled={loading}
                    style={{
                      width: "100%", padding: "16px", border: "none", borderRadius: 14,
                      fontWeight: 900, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
                      fontFamily: "'Tajawal',sans-serif", transition: "all .2s",
                      background: loading ? "#94A3B8" : "linear-gradient(135deg, #10B981, #059669)",
                      color: "#fff",
                      boxShadow: loading ? "none" : "0 8px 24px rgba(16,185,129,.4)",
                      animation: !loading ? "pulse 2s infinite" : "none"
                    }}>
                    {loading ? (isAr ? "⏳ جاري الإرسال..." : "⏳ Submitting...")
                      : `⚡ ${isAr ? "شراء فوري بنقرة واحدة" : "One-Click Buy"} — ${fmt(grandTotal)}`}
                  </button>
                )}

                {/* زر Checkout عادي */}
                <button onClick={() => setShowCheckout(!showCheckout)}
                  style={{
                    width: "100%", padding: "14px", borderRadius: 14,
                    fontWeight: 900, fontSize: 15, cursor: "pointer",
                    fontFamily: "'Tajawal',sans-serif", transition: "all .2s",
                    background: hasFullProfile ? "#EEF2FF" : "linear-gradient(135deg,#6366F1,#8B5CF6)",
                    color: hasFullProfile ? "#6366F1" : "#fff",
                    boxShadow: hasFullProfile ? "none" : "0 8px 24px rgba(99,102,241,.4)",
                    border: hasFullProfile ? "2px solid #6366F1" : "2px solid transparent"
                  }}>
                  {showCheckout
                    ? (isAr ? "▲ إخفاء التفاصيل" : "▲ Hide Details")
                    : (isAr ? "📋 إتمام الطلب بالتفصيل" : "📋 Detailed Checkout")}
                </button>

                {/* نموذج checkout */}
                {showCheckout && (
                  <div style={{
                    background: "#fff", borderRadius: 20, border: "1px solid #E2E8F0",
                    boxShadow: shadow.md, padding: "20px", animation: "slideUp .3s ease"
                  }}>
                    <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 16 }}>
                      📍 {isAr ? "بيانات التوصيل" : "Delivery Details"}
                    </h3>
                    <div style={{ display: "grid", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "#334155" }}>{t("name_label")}</label>
                        <input placeholder={t("name_ph")} value={form.name} onChange={set("name")} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "#334155" }}>{t("phone_label")}</label>
                        <input type="tel" placeholder={t("phone_ph")} value={form.phone} onChange={set("phone")} style={{ ...inputBase, direction: "ltr", textAlign: dir === "rtl" ? "right" : "left" }} onFocus={focusIn} onBlur={focusOut} />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "#334155" }}>{t("city_label")}</label>
                        <select value={form.city} onChange={set("city")} style={{ ...inputBase, cursor: "pointer" }} onFocus={focusIn} onBlur={focusOut}>
                          <option value="">{isAr ? "اختر الإمارة" : "Select Emirate"}</option>
                          {EMIRATES.map(em => <option key={em.value} value={em.value}>{emirateLabel(em)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "#334155" }}>{t("address_label")}</label>
                        <textarea placeholder={t("address_ph")} value={form.address} onChange={set("address")} rows={2} style={{ ...inputBase, resize: "vertical" }} onFocus={focusIn} onBlur={focusOut} />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "#334155" }}>{isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}</label>
                        <textarea placeholder={isAr ? "أي ملاحظات..." : "Any notes..."} value={form.notes} onChange={set("notes")} rows={2} style={{ ...inputBase, resize: "vertical" }} onFocus={focusIn} onBlur={focusOut} />
                      </div>
                    </div>

                    {/* طريقة الدفع */}
                    <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", margin: "18px 0 12px" }}>
                      💳 {isAr ? "طريقة الدفع" : "Payment Method"}
                    </h3>
                    <div style={{ display: "grid", gap: 8 }}>
                      {[
                        { val: "cash", label: isAr ? "💵 دفع عند الاستلام" : "💵 Cash on Delivery" },
                        { val: "bank", label: isAr ? "🏦 تحويل بنكي" : "🏦 Bank Transfer" }
                      ].map(opt => (
                        <label key={opt.val} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                          borderRadius: 12, cursor: "pointer", transition: "all .15s",
                          border: `2px solid ${form.payMethod === opt.val ? "#6366F1" : "#E2E8F0"}`,
                          background: form.payMethod === opt.val ? "#EEF2FF" : "#fff"
                        }}>
                          <input type="radio" name="bundlePay" checked={form.payMethod === opt.val}
                            onChange={() => setForm(f => ({ ...f, payMethod: opt.val }))}
                            style={{ accentColor: "#6366F1" }} />
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{opt.label}</span>
                        </label>
                      ))}
                    </div>

                    <button onClick={() => submitOrder(false)} disabled={loading}
                      style={{
                        width: "100%", padding: "16px", marginTop: 16, border: "none", borderRadius: 14,
                        fontWeight: 900, fontSize: 16, cursor: loading ? "not-allowed" : "pointer",
                        fontFamily: "'Tajawal',sans-serif",
                        background: loading ? "#94A3B8" : "linear-gradient(135deg,#6366F1,#8B5CF6)",
                        color: "#fff",
                        boxShadow: loading ? "none" : "0 8px 24px rgba(99,102,241,.4)"
                      }}>
                      {loading ? (isAr ? "⏳ جاري الإرسال..." : "⏳ Submitting...")
                        : `✅ ${isAr ? "تأكيد الطلب" : "Confirm Order"} — ${fmt(grandTotal)}`}
                    </button>
                  </div>
                )}

                {/* إضافة الباندل للسلة بدلاً من الشراء */}
                <button onClick={() => {
                  bundle.forEach(it => {
                    // ✅ حقول خفيفة فقط (بدون كل الصور لتفادي امتلاء localStorage)
                    const light = {
                      id: it.id,
                      name: it.name,
                      price: Number(it.price) || 0,
                      image: it.image || it.images?.[0] || "",
                      category: it.category || "",
                    };
                    if (cartCtx?.addToCart) cartCtx.addToCart(light, it.qty || 1);
                  });
                  toast(isAr ? `✅ تمت إضافة ${bundle.length} منتج للسلة` : `✅ ${bundle.length} items added to cart`, "success");
                  setBundle([]);
                }}
                  style={{
                    width: "100%", padding: "12px", border: "1.5px solid #E2E8F0", borderRadius: 12,
                    fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#64748B",
                    background: "#FAFBFF", fontFamily: "'Tajawal',sans-serif", transition: "all .15s"
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = "#6366F1"; e.currentTarget.style.color = "#6366F1"; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#64748B"; }}>
                  🛒 {isAr ? "أضف الكل للسلة بدلاً من ذلك" : "Add All to Cart Instead"}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
