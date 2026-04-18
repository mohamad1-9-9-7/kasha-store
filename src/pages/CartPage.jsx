import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { apiFetch } from "../api";
import { C, shadow, inputBase, focusIn, focusOut, safeParse, fmt } from "../Theme";
import MiniNav from "../components/MiniNav";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import { useWishlist } from "../context/WishlistContext";
import { T } from "../i18n";
import { useProducts } from "../hooks/useProducts";
import { useSettings } from "../hooks/useSettings";
import { useCoupons, incrementCouponUses } from "../hooks/useCoupons";

/* ─────────── ثوابت ─────────── */
const FREE_SHIP_THRESHOLD = 200; // درهم

const EMIRATES = [
  { value: "abu-dhabi",      label: "أبوظبي",      labelEn: "Abu Dhabi" },
  { value: "dubai",          label: "دبي",          labelEn: "Dubai" },
  { value: "sharjah",        label: "الشارقة",      labelEn: "Sharjah" },
  { value: "ajman",          label: "عجمان",        labelEn: "Ajman" },
  { value: "umm-al-quwain",  label: "أم القيوين",  labelEn: "Umm Al Quwain" },
  { value: "ras-al-khaimah", label: "رأس الخيمة",  labelEn: "Ras Al Khaimah" },
  { value: "fujairah",       label: "الفجيرة",      labelEn: "Fujairah" },
];

/* ── كوبونات — التحقق يصير داخل Component بعد ما يتحمل الكوبونات من Firebase ── */
function validateCoupon(coupons, code, subtotal) {
  const c = coupons.find(x => x.code === code.toUpperCase() && x.active);
  if (!c)                                          return { error: "رمز الكوبون غير صحيح" };
  if (c.expiry && new Date(c.expiry) < new Date()) return { error: "انتهت صلاحية هذا الكوبون" };
  if (c.uses >= c.maxUses)                         return { error: "تم استنفاد هذا الكوبون" };
  if (subtotal < c.minOrder)                       return { error: `الحد الأدنى للطلب ${fmt(c.minOrder)}` };
  const discount = c.type === "percent"
    ? Math.round((subtotal * c.value) / 100)
    : Math.min(c.value, subtotal);
  return { coupon: c, discount };
}

/* ── نقاط ── */
const POINTS_PER_AED    = 1;
const POINTS_REDEEM_RATE  = 100;
const POINTS_REDEEM_VALUE = 10;

const S = {
  card: { background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: shadow.md, padding: "24px" },
  lbl:  { display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "#334155" },
};

/* ════════════════════════════════════ COMPONENT ════════════════════════════════════ */
export default function CartPage() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const cartCtx   = useContext(CartContext);
  const { lang }  = useLang();
  const { toggle: wishlistToggle, isWishlisted } = useWishlist();
  const { products: allProducts } = useProducts();
  const { settings: storeSettings } = useSettings();
  const { coupons: allCoupons } = useCoupons();
  const t  = k => T[lang]?.[k] ?? T.ar[k] ?? k;
  const isAr = lang === "ar";
  const dir  = isAr ? "rtl" : "ltr";

  /* ── سلة ── */
  const [localCart, setLocalCart] = useState(() => safeParse("cart", []));
  const items = cartCtx?.cart?.length ? cartCtx.cart : localCart;

  const setItems = (next) => {
    const val = typeof next === "function" ? next(items) : next;
    if (cartCtx?.setCart) cartCtx.setCart(val);
    setLocalCart(val);
    localStorage.setItem("cart", JSON.stringify(val));
  };

  /* ── حالات ── */
  const [form, setForm]     = useState({ name: "", phone: "", city: "", address: "", notes: "", payMethod: "cash", transferRef: "" });
  const [loading, setLoading] = useState(false);
  const [couponInput, setCouponInput]     = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError]     = useState("");
  const [redeemPoints, setRedeemPoints]   = useState(false);
  const [locationData, setLocationData]   = useState(null); // { lat, lng, address }
  const [locLoading, setLocLoading]       = useState(false);
  const [hoverImg, setHoverImg]           = useState(null); // { src, x, y }

  const user          = safeParse("user");
  const userPoints    = user?.points || 0;
  const maxRedeemSets = Math.floor(userPoints / POINTS_REDEEM_RATE);
  const pointsDiscount = redeemPoints ? maxRedeemSets * POINTS_REDEEM_VALUE : 0;


  /* ── تعبئة بيانات المستخدم ── */
  useEffect(() => {
    if (user) {
      const em = EMIRATES.find(e => e.label === user.city || e.labelEn === user.city);
      setForm(f => ({ ...f, name: user.name || "", phone: user.phone || "", city: em?.value || "", address: user.address || "" }));
    }
  }, []);

  /* ── حسابات ── */
  const set      = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const inc      = id => setItems(arr => arr.map(it => String(it.id) === String(id) ? { ...it, qty: (it.qty || 1) + 1 } : it));
  const dec      = id => setItems(arr => arr.map(it => String(it.id) === String(id) ? { ...it, qty: Math.max(1, (it.qty || 1) - 1) } : it));
  const remove   = id => setItems(arr => arr.filter(it => String(it.id) !== String(id)));
  const clearCart = () => {
    if (cartCtx?.clearCart) cartCtx.clearCart();
    else { setLocalCart([]); localStorage.removeItem("cart"); }
  };

  const subtotal     = useMemo(() => (items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1), 0), [items]);
  const grandTotal   = Math.max(0, subtotal - couponDiscount - pointsDiscount);
  const toFreeShip   = Math.max(0, FREE_SHIP_THRESHOLD - subtotal);
  const freeShipPct  = Math.min(100, Math.round((subtotal / FREE_SHIP_THRESHOLD) * 100));
  const isFreeShip   = subtotal >= FREE_SHIP_THRESHOLD;

  /* ── Save for Later ── */
  const saveForLater = (it) => {
    wishlistToggle(it);
    remove(it.id);
    toast(isAr ? `❤️ ${it.name} محفوظ للمفضلة` : `❤️ ${it.name} saved to wishlist`, "success");
  };

  /* ── كوبون ── */
  const applyCoupon = () => {
    if (!couponInput.trim()) return;
    const result = validateCoupon(allCoupons, couponInput.trim(), subtotal);
    if (result.error) { setCouponError(result.error); setAppliedCoupon(null); setCouponDiscount(0); return; }
    setCouponError(""); setAppliedCoupon(result.coupon); setCouponDiscount(result.discount);
    toast(`🎉 ${isAr ? "تم تطبيق الكوبون! وفّرت" : "Coupon applied! You saved"} ${fmt(result.discount)}`, "success");
  };
  const removeCoupon = () => { setAppliedCoupon(null); setCouponDiscount(0); setCouponInput(""); setCouponError(""); };

  /* ── تحديد الموقع ── */
  const pickLocation = () => {
    if (!navigator.geolocation) return toast(isAr ? "المتصفح لا يدعم تحديد الموقع" : "Browser doesn't support geolocation", "error");
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${isAr ? "ar" : "en"}`);
          const data = await res.json();
          const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          const road = [data.address?.road, data.address?.suburb, data.address?.city_district].filter(Boolean).join("، ");
          setLocationData({ lat, lng, address: addr });
          if (road) setForm(f => ({ ...f, address: road }));
          // تحديد الإمارة تلقائيًا
          const stateRaw = (data.address?.state || "").toLowerCase();
          const matched = EMIRATES.find(em =>
            stateRaw.includes(em.label) || stateRaw.includes(em.labelEn.toLowerCase())
          );
          if (matched) setForm(f => ({ ...f, city: matched.value }));
        } catch {
          setLocationData({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
        }
        setLocLoading(false);
      },
      () => { toast(isAr ? "تعذّر الحصول على موقعك" : "Could not get your location", "error"); setLocLoading(false); }
    );
  };

  /* ── Upsell ── */
  const upsellProducts = useMemo(() => {
    const visible = allProducts.filter(p => !p.hidden);
    const cats = [...new Set((items || []).map(it => it.category).filter(Boolean))];
    const inCart = new Set((items || []).map(it => String(it.id)));
    return visible.filter(p => cats.includes(p.category) && !inCart.has(String(p.id))).slice(0, 4);
  }, [allProducts, items]);

  /* ── إرسال الطلب ── */
  const submit = async () => {
    if (!items?.length)                                          return toast(isAr ? "السلة فارغة" : "Cart is empty", "error");
    if (!form.name || !form.phone || !form.city || !form.address) return toast(isAr ? "يرجى تعبئة جميع البيانات" : "Please fill in all fields", "error");
    if (form.payMethod === "bank" && !form.transferRef)          return toast(isAr ? "أدخل رقم مرجع التحويل" : "Enter transfer reference", "error");
    setLoading(true);
    try {
      const orderId   = `ORD-${Date.now()}`;
      const cityObj   = EMIRATES.find(e => e.value === form.city);
      const cityLabel = isAr ? cityObj?.label : cityObj?.labelEn || form.city;
      const earned    = Math.floor(grandTotal * POINTS_PER_AED);

      await apiFetch("/api/orders", {
        method: "POST",
        body: {
          id: orderId,
          customer: {
            name: form.name, phone: form.phone, city: form.city, cityLabel,
            address: form.address, notes: form.notes,
            location: locationData ? { lat: locationData.lat, lng: locationData.lng, mapLink: `https://maps.google.com/?q=${locationData.lat},${locationData.lng}` } : null,
          },
          items: (items || []).map(it => ({ id: it.id, name: it.name, price: Number(it.price) || 0, qty: Number(it.qty) || 1, image: it.image || "", category: it.category || "", variantSummary: it.variantSummary || [] })),
          totals: { subtotal, couponCode: appliedCoupon?.code || null, couponDiscount, pointsDiscount, grandTotal, currency: "AED" },
          payment: { method: form.payMethod, transferRef: form.payMethod === "bank" ? form.transferRef : "", status: form.payMethod === "cash" ? "COD_PENDING" : "BANK_PENDING" },
          loyaltyPoints: { earned, redeemed: redeemPoints ? maxRedeemSets * POINTS_REDEEM_RATE : 0 },
        },
      });

      if (appliedCoupon) incrementCouponUses(appliedCoupon.code);

      if (user) {
        const redeemed  = redeemPoints ? maxRedeemSets * POINTS_REDEEM_RATE : 0;
        const newPoints = (userPoints - redeemed) + earned;
        localStorage.setItem("user", JSON.stringify({ ...user, points: newPoints }));
        apiFetch(`/api/users/${user.phone}/points`, { method: "PUT", body: { points: newPoints } }).catch(() => {});
      }

      clearCart();

      const adminPhone = (storeSettings.whatsapp || "971585446473").replace(/\D/g, "");
      const itemsList  = (items || []).map(it => {
        const vs = (it.variantSummary || []).map(v => `${v.group}: ${v.value}`).join(" - ");
        return `• ${it.name} × ${it.qty}${vs ? ` (${vs})` : ""}`;
      }).join("%0A");
      const locLine    = locationData ? `%0Aموقع GPS: https://maps.google.com/?q=${locationData.lat},${locationData.lng}` : "";
      const waMsg      = `🛍️ *طلب جديد!*%0Aرقم: ${orderId}%0Aالعميل: ${form.name}%0Aهاتف: ${form.phone}%0Aالمدينة: ${cityLabel}%0A%0Aالمنتجات:%0A${itemsList}%0A%0Aالإجمالي: ${fmt(grandTotal)}%0Aالدفع: ${form.payMethod === "cash" ? "كاش" : "تحويل بنكي"}${locLine}`;
      window.open(`https://wa.me/${adminPhone}?text=${waMsg}`, "_blank");

      toast(`✅ ${isAr ? `تم إرسال طلبك! ربحت ${earned} نقطة` : `Order sent! You earned ${earned} points`}`, "success");
      navigate("/my-orders");
    } catch (e) { console.error(e); toast(isAr ? "خطأ في الإرسال، حاول مرة أخرى" : "Submission error, try again", "error"); }
    finally { setLoading(false); }
  };

  const emirateLabel = em => isAr ? em.label : em.labelEn;

  /* ════ JSX ════ */
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: dir }}>
      <style>{`
        @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown{ from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes pulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes ripple   { 0%{width:0;background:rgba(99,102,241,.18)} 100%{width:100%;background:transparent} }

        .cart-item { transition: box-shadow .2s, transform .2s; }
        .cart-item:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.09)!important; }

        .save-later-btn { opacity:0; transition: opacity .2s; }
        .cart-item:hover .save-later-btn { opacity:1; }

        .img-preview {
          position: fixed; z-index: 9999; pointer-events: none;
          width: 220px; height: 220px; border-radius: 16px;
          overflow: hidden; border: 2px solid #E2E8F0;
          box-shadow: 0 20px 50px rgba(0,0,0,.2);
          animation: slideDown .15s ease;
          background: #F8FAFC;
        }

        .upsell-card { transition: transform .2s, box-shadow .2s; }
        .upsell-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(99,102,241,.15)!important; }

        @media(max-width:900px){ .cart-grid{grid-template-columns:1fr!important} }
        @media(max-width:520px){
          .cart-item{grid-template-columns:72px 1fr auto!important}
          .cart-form-grid{grid-template-columns:1fr!important}
          .upsell-grid{grid-template-columns:repeat(2,1fr)!important}
        }
      `}</style>

      {/* Hover image preview */}
      {hoverImg && (
        <div className="img-preview" style={{ top: hoverImg.y, left: hoverImg.x }}>
          <img src={hoverImg.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      <MiniNav title={`${t("cart_title")} (${(items || []).length})`} backTo="/home" showCart={false} />

      <main style={{ maxWidth: 1100, margin: "28px auto", padding: "0 20px", animation: "fadeUp .4s ease both" }}>

        {/* حالة المزامنة */}

        {(!items || items.length === 0) ? (
          /* ── سلة فارغة ── */
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 24, border: "2px dashed #E2E8F0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
            <h2 style={{ color: "#0F172A", fontWeight: 800, marginBottom: 8 }}>{t("cart_empty")}</h2>
            <p style={{ color: "#94A3B8", marginBottom: 28 }}>{isAr ? "أضف بعض المنتجات للمتابعة" : "Add some products to continue"}</p>
            <Link to="/home" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", borderRadius: 14, padding: "13px 28px", fontWeight: 800, boxShadow: "0 6px 18px rgba(99,102,241,.35)", textDecoration: "none" }}>
              {isAr ? "← ابدأ التسوق" : "Start Shopping →"}
            </Link>
          </div>
        ) : (
          <div className="cart-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24, alignItems: "start" }}>

            {/* ══ عمود المنتجات ══ */}
            <div style={{ display: "grid", gap: 14 }}>

              {/* شريط التقدم نحو الشحن المجاني */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F1F5F9", boxShadow: shadow.sm, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: isFreeShip ? "#10B981" : "#334155" }}>
                    {isFreeShip
                      ? (isAr ? "🎉 تهانيك! شحنك مجاني" : "🎉 Congrats! Free shipping unlocked")
                      : (isAr ? `🚚 أضف ${fmt(toFreeShip)} للشحن المجاني!` : `🚚 Add ${fmt(toFreeShip)} for free shipping!`)}
                  </span>
                  <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>{freeShipPct}%</span>
                </div>
                <div style={{ height: 8, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 999, transition: "width .5s cubic-bezier(.4,0,.2,1)",
                    width: `${freeShipPct}%`,
                    background: isFreeShip
                      ? "linear-gradient(90deg,#10B981,#059669)"
                      : "linear-gradient(90deg,#6366F1,#8B5CF6)",
                    animation: isFreeShip ? "pulse 2s infinite" : "none"
                  }} />
                </div>
                {!isFreeShip && (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[10, 25, 50].filter(v => subtotal + v <= FREE_SHIP_THRESHOLD + 10).map(v => (
                      <Link key={v} to="/home" style={{ fontSize: 11, background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "3px 10px", fontWeight: 700, textDecoration: "none" }}>
                        +{fmt(v)} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* رأس القائمة */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0F172A" }}>{isAr ? "منتجاتك" : "Your Products"}</h2>
                <button onClick={clearCart} style={{ background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 10, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                  🗑️ {isAr ? "تفريغ السلة" : "Clear Cart"}
                </button>
              </div>

              {/* المنتجات */}
              {items.map(it => (
                <div key={it.id} className="cart-item" style={{ background: "#fff", borderRadius: 18, border: "1px solid #F1F5F9", boxShadow: shadow.sm, padding: "16px", display: "grid", gridTemplateColumns: "88px 1fr auto", gap: 14, alignItems: "center", position: "relative" }}>

                  {/* صورة مع Hover Preview */}
                  <div
                    style={{ width: 88, height: 80, borderRadius: 12, overflow: "hidden", border: "1px solid #F1F5F9", flexShrink: 0, cursor: "zoom-in" }}
                    onMouseEnter={e => {
                      if (!it.image) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoverImg({ src: it.image, x: rect.right + 12, y: rect.top - 60 });
                    }}
                    onMouseLeave={() => setHoverImg(null)}
                  >
                    {it.image ? (
                      <img
                        src={(it.image || "").trim()}
                        alt={it.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "https://placehold.co/200x200?text=📦"; }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, background: "#F1F5F9" }}>📦</div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A", marginBottom: 4 }}>{it.name}</div>
                    {it.variantSummary?.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                        {it.variantSummary.map((v, i) => (
                          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#F1F5F9", color: "#475569", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
                            {v.hex && <span style={{ width: 10, height: 10, borderRadius: "50%", background: v.hex, display: "inline-block" }} />}
                            {v.group}: {v.value}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ color: "#6366F1", fontWeight: 800, fontSize: 14, marginBottom: 10 }}>{fmt(it.price)}</div>
                    {/* أزرار الكمية */}
                    <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #E2E8F0", borderRadius: 10, overflow: "hidden", width: "fit-content" }}>
                      <button onClick={() => dec(it.id)} style={{ width: 34, height: 34, background: "#F8FAFC", border: "none", cursor: "pointer", fontSize: 16, color: "#334155", fontWeight: 800 }} onMouseOver={e => e.currentTarget.style.background = "#EEF2FF"} onMouseOut={e => e.currentTarget.style.background = "#F8FAFC"}>−</button>
                      <span style={{ width: 38, textAlign: "center", fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{it.qty || 1}</span>
                      <button onClick={() => inc(it.id)} style={{ width: 34, height: 34, background: "#F8FAFC", border: "none", cursor: "pointer", fontSize: 16, color: "#334155", fontWeight: 800 }} onMouseOver={e => e.currentTarget.style.background = "#EEF2FF"} onMouseOut={e => e.currentTarget.style.background = "#F8FAFC"}>+</button>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                    <span style={{ fontWeight: 900, fontSize: 16, color: "#6366F1" }}>{fmt((Number(it.price) || 0) * (Number(it.qty) || 1))}</span>
                    <button onClick={() => remove(it.id)} style={{ background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                      × {t("delete")}
                    </button>
                    {/* Save for Later */}
                    <button
                      className="save-later-btn"
                      onClick={() => saveForLater(it)}
                      title={isAr ? "احفظ للمفضلة" : "Save for later"}
                      style={{
                        background: isWishlisted(it.id) ? "#FDF2F8" : "#F8FAFC",
                        color: isWishlisted(it.id) ? "#EC4899" : "#94A3B8",
                        border: `1px solid ${isWishlisted(it.id) ? "#FBCFE8" : "#E2E8F0"}`,
                        borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700,
                        cursor: "pointer", fontFamily: "'Tajawal',sans-serif", transition: "all .15s"
                      }}
                    >
                      {isWishlisted(it.id) ? "❤️" : "🤍"} {isAr ? "احفظ لاحقاً" : "Save later"}
                    </button>
                  </div>
                </div>
              ))}

              {/* ── Upsell ── */}
              {upsellProducts.length > 0 && (
                <div style={{ ...S.card, marginTop: 8 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 14 }}>
                    ✨ {isAr ? "يُضاف معه عادةً" : "Frequently bought together"}
                  </h3>
                  <div className="upsell-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                    {upsellProducts.map(p => {
                      const pct = p.oldPrice > p.price ? Math.round(100 - (p.price / p.oldPrice) * 100) : null;
                      return (
                        <div key={p.id} className="upsell-card" style={{ background: "#F8FAFC", borderRadius: 14, border: "1px solid #F1F5F9", overflow: "hidden", boxShadow: shadow.sm }}>
                          <Link to={`/product/${p.id}`} style={{ textDecoration: "none", display: "block" }}>
                            <div style={{ height: 80, background: "#F1F5F9", position: "relative", overflow: "hidden" }}>
                              {p.image
                                ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "https://placehold.co/200x200?text=📦"; }} />
                                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, opacity: .3 }}>📦</div>}
                              {pct && <span style={{ position: "absolute", top: 4, right: 4, background: "#EF4444", color: "#fff", borderRadius: 999, padding: "2px 6px", fontSize: 10, fontWeight: 800 }}>-{pct}%</span>}
                            </div>
                            <div style={{ padding: "8px 10px" }}>
                              <div style={{ fontWeight: 700, fontSize: 12, color: "#0F172A", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                              <div style={{ fontWeight: 900, fontSize: 13, color: "#6366F1" }}>{fmt(p.price)}</div>
                            </div>
                          </Link>
                          <button
                            onClick={() => {
                              const cart = safeParse("cart", []);
                              const idx  = cart.findIndex(x => String(x.id) === String(p.id));
                              if (idx >= 0) cart[idx].qty = (cart[idx].qty || 1) + 1;
                              // ✅ حقول خفيفة فقط (بدون كل الصور)
                              else cart.push({ id: p.id, name: p.name, price: Number(p.price) || 0, image: p.image || p.images?.[0] || "", category: p.category || "", qty: 1 });
                              setItems(cart);
                              toast(`✅ ${p.name} ${isAr ? "أُضيف للسلة" : "added to cart"}`, "success");
                            }}
                            style={{ width: "100%", padding: "7px 0", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                            + {isAr ? "أضف" : "Add"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ══ عمود الجانب الأيمن ══ */}
            <div style={{ display: "grid", gap: 18 }}>

              {/* ملخص الطلب */}
              <div style={S.card}>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 16 }}>{t("cart_summary")}</h3>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "#64748B", fontSize: 14 }}>
                  <span>{t("cart_subtotal")}</span><span>{fmt(subtotal)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "#10B981", fontSize: 14, fontWeight: 700 }}>
                    <span>🎟️ {isAr ? `كوبون (${appliedCoupon?.code})` : `Coupon (${appliedCoupon?.code})`}</span>
                    <span>-{fmt(couponDiscount)}</span>
                  </div>
                )}
                {pointsDiscount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "#A855F7", fontSize: 14, fontWeight: 700 }}>
                    <span>⭐ {isAr ? "نقاط الولاء" : "Loyalty Points"}</span>
                    <span>-{fmt(pointsDiscount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: "#64748B", fontSize: 14 }}>
                  <span>{t("cart_delivery")}</span>
                  <span style={{ color: "#10B981", fontWeight: 700 }}>
                    {isFreeShip ? `${isAr ? "مجاني 🎉" : "Free 🎉"}` : fmt(15)}
                  </span>
                </div>
                <div style={{ height: 1, background: "#F1F5F9", margin: "12px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 20, color: "#6366F1" }}>
                  <span>{t("cart_total")}</span>
                  <span>{fmt(isFreeShip ? grandTotal : grandTotal + 15)}</span>
                </div>
                {(couponDiscount + pointsDiscount) > 0 && (
                  <div style={{ marginTop: 8, background: "#ECFDF5", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#059669", fontWeight: 700, textAlign: "center" }}>
                    🎉 {isAr ? `وفّرت ${fmt(couponDiscount + pointsDiscount)}!` : `You saved ${fmt(couponDiscount + pointsDiscount)}!`}
                  </div>
                )}
              </div>

              {/* كوبون */}
              <div style={S.card}>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 14 }}>🎟️ {isAr ? "كوبون الخصم" : "Discount Coupon"}</h3>
                {appliedCoupon ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#ECFDF5", border: "1.5px solid #6EE7B7", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: "#059669", fontSize: 14 }}>✅ {appliedCoupon.code}</div>
                      <div style={{ fontSize: 12, color: "#34D399" }}>{isAr ? `خصم ${fmt(couponDiscount)}` : `${fmt(couponDiscount)} discount`}</div>
                    </div>
                    <button onClick={removeCoupon} style={{ background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                      ✕ {isAr ? "إزالة" : "Remove"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())}
                        placeholder={isAr ? "أدخل رمز الكوبون" : "Enter coupon code"}
                        style={{ ...inputBase, flex: 1, letterSpacing: 1, fontFamily: "monospace" }}
                        onFocus={focusIn} onBlur={focusOut} onKeyDown={e => e.key === "Enter" && applyCoupon()} />
                      <button onClick={applyCoupon} style={{ padding: "0 16px", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                        {isAr ? "تطبيق" : "Apply"}
                      </button>
                    </div>
                    {couponError && <div style={{ marginTop: 8, color: "#EF4444", fontSize: 13, fontWeight: 600 }}>⚠️ {couponError}</div>}
                  </div>
                )}
              </div>

              {/* نقاط الولاء */}
              {userPoints >= POINTS_REDEEM_RATE && (
                <div style={S.card}>
                  <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 14 }}>⭐ {isAr ? "نقاط الولاء" : "Loyalty Points"}</h3>
                  <div style={{ background: "#FAF5FF", border: "1.5px solid #E9D5FF", borderRadius: 12, padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, color: "#7C3AED", fontSize: 14 }}>
                        {isAr ? `رصيدك: ${userPoints} نقطة` : `Balance: ${userPoints} pts`}
                      </span>
                      <span style={{ fontSize: 12, color: "#A78BFA" }}>
                        {isAr ? `= ${fmt(maxRedeemSets * POINTS_REDEEM_VALUE)} خصم` : `= ${fmt(maxRedeemSets * POINTS_REDEEM_VALUE)} off`}
                      </span>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input type="checkbox" checked={redeemPoints} onChange={e => setRedeemPoints(e.target.checked)} style={{ accentColor: "#7C3AED", width: 18, height: 18 }} />
                      <span style={{ fontSize: 14, color: "#334155", fontWeight: 700 }}>
                        {isAr ? `استخدم ${maxRedeemSets * POINTS_REDEEM_RATE} نقطة (وفّر ${fmt(maxRedeemSets * POINTS_REDEEM_VALUE)})` : `Use ${maxRedeemSets * POINTS_REDEEM_RATE} pts (save ${fmt(maxRedeemSets * POINTS_REDEEM_VALUE)})`}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* بيانات التوصيل */}
              <div style={S.card}>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 16 }}>📍 {t("cart_delivery_info")}</h3>
                <div style={{ display: "grid", gap: 12 }}>
                  <div><label style={S.lbl}>{t("name_label")}</label><input placeholder={t("name_ph")} value={form.name} onChange={set("name")} style={inputBase} onFocus={focusIn} onBlur={focusOut} /></div>
                  <div><label style={S.lbl}>{t("phone_label")}</label><input type="tel" placeholder={t("phone_ph")} value={form.phone} onChange={set("phone")} style={{ ...inputBase, direction: "ltr", textAlign: dir === "rtl" ? "right" : "left" }} onFocus={focusIn} onBlur={focusOut} /></div>
                  <div>
                    <label style={S.lbl}>{t("city_label")}</label>
                    <select value={form.city} onChange={set("city")} style={{ ...inputBase, cursor: "pointer" }} onFocus={focusIn} onBlur={focusOut}>
                      <option value="">{isAr ? "اختر الإمارة" : "Select Emirate"}</option>
                      {EMIRATES.map(em => <option key={em.value} value={em.value}>{emirateLabel(em)}</option>)}
                    </select>
                  </div>

                  {/* حقل العنوان + زر الموقع */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={S.lbl}>{t("address_label")}</label>
                      <button
                        type="button"
                        onClick={pickLocation}
                        disabled={locLoading}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          background: locationData ? "#ECFDF5" : "#EEF2FF",
                          color: locationData ? "#059669" : "#6366F1",
                          border: `1.5px solid ${locationData ? "#6EE7B7" : "#C7D2FE"}`,
                          borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 800,
                          cursor: locLoading ? "wait" : "pointer", fontFamily: "'Tajawal',sans-serif",
                          transition: "all .15s"
                        }}
                      >
                        {locLoading ? "⏳" : locationData ? "✅" : "📍"}
                        {locLoading
                          ? (isAr ? "جاري التحديد..." : "Locating...")
                          : locationData
                            ? (isAr ? "تم تحديد موقعك" : "Location set")
                            : (isAr ? "تحديد من الخريطة" : "Pick from map")}
                      </button>
                    </div>
                    <textarea
                      placeholder={t("address_ph")} value={form.address} onChange={set("address")}
                      rows={2} style={{ ...inputBase, resize: "vertical" }} onFocus={focusIn} onBlur={focusOut}
                    />
                    {/* بطاقة الموقع */}
                    {locationData && (
                      <div style={{ marginTop: 8, background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 12, padding: "10px 14px", animation: "slideDown .3s ease" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 800, color: "#059669", fontSize: 13, marginBottom: 3 }}>
                              📍 {isAr ? "تم تحديد الموقع بنجاح" : "Location detected"}
                            </div>
                            <div style={{ fontSize: 11, color: "#065F46", lineHeight: 1.5 }}>
                              {locationData.address.length > 80 ? locationData.address.slice(0, 80) + "..." : locationData.address}
                            </div>
                          </div>
                          <a
                            href={`https://maps.google.com/?q=${locationData.lat},${locationData.lng}`}
                            target="_blank" rel="noreferrer"
                            style={{ flexShrink: 0, background: "#059669", color: "#fff", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>
                            {isAr ? "افتح الخريطة" : "View map"}
                          </a>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 11, color: "#94A3B8", direction: "ltr" }}>
                          GPS: {locationData.lat.toFixed(5)}, {locationData.lng.toFixed(5)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={S.lbl}>{isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}</label>
                    <textarea placeholder={isAr ? "أي تعليمات للتوصيل..." : "Delivery instructions..."} value={form.notes} onChange={set("notes")} rows={2} style={{ ...inputBase, resize: "vertical" }} onFocus={focusIn} onBlur={focusOut} />
                  </div>
                </div>
              </div>

              {/* طريقة الدفع */}
              <div style={S.card}>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 16 }}>💳 {t("cart_payment")}</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {[
                    { val: "cash", label: t("cart_cash"), desc: isAr ? "ادفع عند استلام طلبك" : "Pay on delivery" },
                    { val: "bank", label: t("cart_bank"), desc: isAr ? "حوّل المبلغ للحساب المذكور" : "Transfer to the account below" },
                  ].map(opt => (
                    <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, border: `2px solid ${form.payMethod === opt.val ? "#6366F1" : "#E2E8F0"}`, background: form.payMethod === opt.val ? "#EEF2FF" : "#fff", cursor: "pointer", transition: "all .15s" }}>
                      <input type="radio" name="pay" checked={form.payMethod === opt.val} onChange={() => setForm(f => ({ ...f, payMethod: opt.val }))} style={{ accentColor: "#6366F1" }} />
                      <div>
                        <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                  {form.payMethod === "bank" && (
                    <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "14px", fontSize: 13 }}>
                      <div style={{ fontWeight: 800, marginBottom: 8, color: "#B45309" }}>{isAr ? "تفاصيل التحويل" : "Bank Details"}</div>
                      <div style={{ color: "#334155", lineHeight: 2 }}>
                        <div>Bank: Emirates NBD</div>
                        <div>Name: KASHKHA TRADING</div>
                        <div>IBAN: AE00 0000 0000 0000 0000 000</div>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <label style={S.lbl}>{isAr ? "رقم مرجع التحويل" : "Transfer Reference"}</label>
                        <input placeholder={isAr ? "مرجع التحويل" : "Reference number"} value={form.transferRef} onChange={set("transferRef")} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* نقاط ستكسبها */}
              <div style={{ background: "#FAF5FF", border: "1.5px solid #E9D5FF", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>⭐</span>
                <span style={{ fontSize: 13, color: "#7C3AED", fontWeight: 700 }}>
                  {isAr ? `ستربح ${Math.floor(grandTotal)} نقطة من هذا الطلب!` : `You'll earn ${Math.floor(grandTotal)} points from this order!`}
                </span>
              </div>

              {/* زر التأكيد */}
              <button onClick={submit} disabled={loading}
                style={{ width: "100%", padding: "16px", background: loading ? "#94A3B8" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", borderRadius: 14, fontWeight: 900, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 8px 24px rgba(99,102,241,.4)", fontFamily: "'Tajawal',sans-serif", transition: "all .2s" }}>
                {loading ? `⏳ ${isAr ? "جاري الإرسال..." : "Sending..."}` : `✅ ${t("cart_confirm")} — ${fmt(isFreeShip ? grandTotal : grandTotal + 15)}`}
              </button>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
