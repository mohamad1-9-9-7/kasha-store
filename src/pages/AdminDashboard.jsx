import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { shadow, r, inputBase, btnPrimary, focusIn, focusOut, safeParse, slugify, fmt } from "../Theme";
import AdminNotificationBell from "../components/AdminNotificationBell";
import { useCategories, addCategory, updateCategory, deleteCategory } from "../hooks/useCategories";
import { useProducts, updateProduct, replaceProduct, deleteProduct } from "../hooks/useProducts";
import { useSettings, saveSettings } from "../hooks/useSettings";
import { apiFetch } from "../api";

/* ── مساعدات ── */
async function fileToBase64(file, max = 500) {
  const dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
  if (!file.type.startsWith("image/")) return dataUrl;
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  if (Math.max(img.width, img.height) <= max) return dataUrl;
  const ratio = img.width / img.height;
  const [w, h] = img.width >= img.height ? [max, Math.round(max / ratio)] : [Math.round(max * ratio), max];
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  return canvas.toDataURL(file.type, 0.6);
}
/* ── أنماط ثابتة ── */
const shimmer = { background: "linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899,#6366F1)", backgroundSize: "300% auto", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "shimmer 4s linear infinite" };
const lbl   = { display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "#334155" };
const CARD  = { background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: shadow.md, padding: "24px" };
const STATUSES = { NEW: { label: "جديد", col: "#6366F1", bg: "#EEF2FF" }, PROCESSING: { label: "قيد المعالجة", col: "#A855F7", bg: "#FDF4FF" }, SHIPPED: { label: "تم الشحن", col: "#F59E0B", bg: "#FFFBEB" }, DELIVERED: { label: "تم التسليم", col: "#10B981", bg: "#ECFDF5" }, CANCELED: { label: "ملغي", col: "#EF4444", bg: "#FEF2F2" } };

/* ═══════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab]   = useState("home");

  /* بيانات */
  const { categories } = useCategories();
  const { products }   = useProducts();
  const [orders,     setOrders]     = useState([]);

  /* فورم الأقسام */
  const [catForm,  setCatForm]  = useState({ name: "", image: "" });
  const [catEdit,  setCatEdit]  = useState(null);

  /* فورم المنتجات */
  const [prodSearch, setProdSearch] = useState("");
  const [prodEdit,   setProdEdit]   = useState(null);   // null = مغلق، object = منتج للتعديل
  const [prodForm,   setProdForm]   = useState({});

  /* الإعدادات */
  const { settings: firestoreSettings } = useSettings();
  const [settings, setSettings] = useState(firestoreSettings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // مزامنة الإعدادات من Firebase
  useEffect(() => { setSettings(s => ({ ...firestoreSettings, ...s })); }, [firestoreSettings]);

  useEffect(() => {
    if (localStorage.getItem("isAdmin") !== "true") { navigate("/user-login"); return; }
    apiFetch("/api/orders").then(setOrders).catch(() => {});
  }, []);

  /* ── إحصاءات ── */
  const stats = useMemo(() => {
    const revenue = orders.filter(o => o?.status === "DELIVERED").reduce((s, o) => s + (o.totals?.grandTotal || o.total || 0), 0);
    return {
      orders:     orders.length,
      newOrders:  orders.filter(o => o?.status === "NEW").length,
      products:   products.length,
      categories: categories.length,
      lowStock:   products.filter(p => Number.isFinite(p.stock) && p.stock <= (p.lowStockThreshold || 5) && p.stock > 0).length,
      revenue,
    };
  }, [orders, products, categories]);

  /* ── إيرادات آخر 7 أيام ── */
  const weeklyRevenue = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { label: d.toLocaleDateString("ar-AE", { weekday: "short" }), date: d.toISOString().slice(0, 10), total: 0 };
    });
    orders.filter(o => o?.status === "DELIVERED").forEach(o => {
      const oDate = (o.createdAt || "").slice(0, 10);
      const day = days.find(d => d.date === oDate);
      if (day) day.total += (o.totals?.grandTotal || o.total || 0);
    });
    return days;
  }, [orders]);

  /* ── أكثر المنتجات مبيعاً ── */
  const topProducts = useMemo(() => {
    const counts = {};
    orders.forEach(o => (o.items || []).forEach(it => {
      counts[it.name] = (counts[it.name] || 0) + (it.qty || 1);
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));
  }, [orders]);

  /* ── أقسام: حفظ ── */
  const saveCat = async () => {
    if (!catForm.name.trim()) return alert("أدخل اسم القسم");
    if (catEdit !== null) {
      await updateCategory(catEdit, { name: catForm.name.trim(), image: catForm.image });
    } else {
      await addCategory({ name: catForm.name.trim(), image: catForm.image });
    }
    setCatForm({ name: "", image: "" }); setCatEdit(null);
  };

  /* ── منتجات: حفظ التعديل ── */
  const openEditProd = (p) => { setProdEdit(p.id); setProdForm({ ...p, badges: (p.badges || []).join(", ") }); };
  const saveEditProd = async () => {
    const current = products.find(p => p.id === prodEdit);
    if (!current) return;
    const updated = {
      ...current,
      name:        prodForm.name,
      price:       parseFloat(prodForm.price) || current.price,
      oldPrice:    prodForm.oldPrice ? parseFloat(prodForm.oldPrice) : undefined,
      stock:       prodForm.stock !== "" ? parseInt(prodForm.stock) : current.stock,
      description: prodForm.description,
      category:    prodForm.category,
      badges:      String(prodForm.badges || "").split(",").map(b => b.trim()).filter(Boolean),
      image:       prodForm.image || current.image,
    };
    await replaceProduct(updated);
    setProdEdit(null);
  };
  const deleteProd = async (id) => { if (!window.confirm("حذف هذا المنتج؟")) return; await deleteProduct(id); };
  const toggleHideProd = async (id) => {
    const p = products.find(x => x.id === id);
    if (p) await updateProduct(id, { hidden: !p.hidden });
  };

  /* ── إعدادات: حفظ ── */
  const handleSaveSettings = async () => { await saveSettings(settings); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2500); };

  /* ── فلترة المنتجات ── */
  const filteredProds = useMemo(() => {
    if (!prodSearch.trim()) return products;
    const q = prodSearch.toLowerCase();
    return products.filter(p => (p.name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q));
  }, [products, prodSearch]);

  /* ── آخر الطلبات ── */
  const recentOrders = useMemo(() => [...orders].slice(-5).reverse(), [orders]);

  /* ── تابز ── */
  const TABS = [
    { key: "home",     label: "🏠 الرئيسية"  },
    { key: "cats",     label: "📂 الأقسام"    },
    { key: "products", label: "🏷️ المنتجات"  },
    { key: "settings", label: "⚙️ الإعدادات" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: "rtl" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        .admin-tab { transition: all .18s ease; cursor: pointer; }
        .admin-tab:hover { background: rgba(99,102,241,.12)!important; }
        .prod-row { transition: background .15s; }
        .prod-row:hover { background: #F8FAFC!important; }
        .icon-btn { transition: transform .15s, opacity .15s; cursor: pointer; border: none; }
        .icon-btn:hover { transform: scale(1.1); opacity: .85; }
        .modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,.55); backdrop-filter:blur(4px); z-index:800; display:flex; align-items:center; justify-content:center; padding:20px; }
        .modal-box { background:#fff; border-radius:24px; padding:28px; width:100%; max-width:600px; max-height:90vh; overflow-y:auto; box-shadow:0 32px 80px rgba(0,0,0,.2); animation:fadeUp .3s ease both; }
        @media(max-width:900px){
          .admin-stats { grid-template-columns: repeat(3,1fr) !important; }
          .admin-2col  { grid-template-columns: 1fr !important; }
        }
        @media(max-width:768px){
          .admin-nav-links { gap: 4px !important; }
          .admin-nav-links a { padding: 7px 8px !important; font-size: 12px !important; }
          .admin-nav-label  { display: none !important; }
          .admin-tabs { padding: 0 12px !important; overflow-x: auto !important; }
          .admin-tab  { padding: 12px 14px !important; font-size: 13px !important; white-space: nowrap !important; }
          .admin-stats { grid-template-columns: repeat(2,1fr) !important; }
          .prod-table-wrap { overflow-x: auto !important; }
          .prod-hide-mobile { display: none !important; }
        }
        @media(max-width:480px){
          .admin-stats { grid-template-columns: repeat(2,1fr) !important; }
          .admin-main  { padding: 16px 12px !important; }
        }
      `}</style>

      {/* ══ ناف ══ */}
      <nav style={{ background: "#0F172A", borderBottom: "1px solid rgba(255,255,255,.08)", padding: "0 28px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚙️</div>
          <span style={{ fontSize: 18, fontWeight: 900 }}><span style={shimmer}>كشخة</span><span style={{ color: "#fff" }}> — لوحة التحكم</span></span>
        </div>
        <div className="admin-nav-links" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <AdminNotificationBell />
          <Link to="/admin-orders" style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, position: "relative" }}>
            📦 الطلبات
            {stats.newOrders > 0 && <span style={{ position: "absolute", top: -6, left: -6, background: "#EF4444", color: "#fff", borderRadius: 999, width: 18, height: 18, fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{stats.newOrders}</span>}
          </Link>
          <Link to="/coupons"      style={{ background: "#FDF4FF", color: "#A855F7", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>🎟️ الكوبونات</Link>
          <Link to="/add-product"  style={{ background: "#ECFDF5", color: "#10B981", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>➕ منتج جديد</Link>
          <Link to="/customers"    style={{ background: "#FFFBEB", color: "#F59E0B", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>👥 العملاء</Link>
          <Link to="/home" style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.7)", border: "1.5px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>← المتجر</Link>
        </div>
      </nav>

      {/* ══ تابز ══ */}
      <div className="admin-tabs" style={{ background: "#fff", borderBottom: "1px solid #F1F5F9", padding: "0 28px", display: "flex", gap: 4 }}>
        {TABS.map(t => (
          <button key={t.key} className="admin-tab" onClick={() => setTab(t.key)}
            style={{ padding: "14px 20px", fontWeight: tab === t.key ? 800 : 600, fontSize: 14, color: tab === t.key ? "#6366F1" : "#64748B", background: "transparent", border: "none", borderBottom: tab === t.key ? "3px solid #6366F1" : "3px solid transparent", fontFamily: "'Tajawal',sans-serif", marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      <main className="admin-main" style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>

        {/* ════════════ الرئيسية ════════════ */}
        {tab === "home" && (
          <div style={{ display: "grid", gap: 24, animation: "fadeUp .4s ease both" }}>

            {/* إحصاءات */}
            <div className="admin-stats" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 14 }}>
              {[
                { icon: "📦", label: "الطلبات",       val: stats.orders,     col: "#6366F1" },
                { icon: "🔴", label: "جديدة",          val: stats.newOrders,  col: "#EC4899" },
                { icon: "🏷️", label: "المنتجات",      val: stats.products,   col: "#10B981" },
                { icon: "📂", label: "الأقسام",         val: stats.categories, col: "#F59E0B" },
                { icon: "⚠️", label: "مخزون منخفض",   val: stats.lowStock,   col: "#EF4444" },
                { icon: "💰", label: "الإيرادات",      val: `${stats.revenue.toFixed(0)}د`, col: "#0EA5E9" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 18, border: "1px solid #F1F5F9", boxShadow: shadow.sm, padding: "18px 16px", borderTop: `3px solid ${s.col}`, animation: `fadeUp .4s ${i * .05}s both`, textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontWeight: 900, fontSize: 26, color: s.col, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── رسم الإيرادات الأسبوعية ── */}
            {(() => {
              const maxVal = Math.max(...weeklyRevenue.map(d => d.total), 1);
              return (
                <div style={{ ...CARD }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", margin: 0 }}>📈 إيرادات آخر 7 أيام</h3>
                    <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "4px 12px", fontSize: 13, fontWeight: 700 }}>{fmt(weeklyRevenue.reduce((s,d)=>s+d.total,0))}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
                    {weeklyRevenue.map((d, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", opacity: d.total > 0 ? 1 : 0 }}>{d.total > 0 ? fmt(d.total).replace(" درهم","") : ""}</span>
                        <div style={{ width: "100%", background: d.total > 0 ? "linear-gradient(180deg,#6366F1,#8B5CF6)" : "#F1F5F9", borderRadius: "6px 6px 0 0", height: Math.max((d.total / maxVal) * 90, d.total > 0 ? 8 : 4), transition: "height 1s ease", minHeight: 4 }} />
                        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, whiteSpace: "nowrap" }}>{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── أكثر المنتجات مبيعاً + مخطط الطلبات ── */}
            <div className="admin-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* أكثر المنتجات مبيعاً */}
            <div style={CARD}>
              <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 18 }}>🏆 أكثر المنتجات مبيعاً</h3>
              {topProducts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px", color: "#94A3B8", background: "#F8FAFC", borderRadius: 14, border: "2px dashed #E2E8F0" }}>لا توجد مبيعات بعد</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {topProducts.map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: i === 0 ? "#FFFBEB" : "#F8FAFC", border: `1px solid ${i === 0 ? "#FDE68A" : "#F1F5F9"}` }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: ["#F59E0B","#94A3B8","#CD7F32","#EEF2FF","#EEF2FF"][i], display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: i < 3 ? "#fff" : "#6366F1", flexShrink: 0 }}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </div>
                      <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{p.qty} قطعة</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* مخطط الطلبات حسب الحالة */}
            {orders.length > 0 && (() => {
              const statusCounts = Object.entries(STATUSES).map(([key, s]) => ({ ...s, key, count: orders.filter(o => o.status === key).length }));
              const max = Math.max(...statusCounts.map(s => s.count), 1);
              return (
                <div style={{ ...CARD, padding: "24px" }}>
                  <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 20 }}>📊 توزيع الطلبات حسب الحالة</h3>
                  <div style={{ display: "grid", gap: 10 }}>
                    {statusCounts.map((s) => (
                      <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 80, fontSize: 12, fontWeight: 700, color: "#64748B", flexShrink: 0, textAlign: "right" }}>{s.label}</div>
                        <div style={{ flex: 1, height: 24, background: "#F1F5F9", borderRadius: 999, overflow: "hidden", position: "relative" }}>
                          <div style={{ height: "100%", width: `${(s.count / max) * 100}%`, background: s.col, borderRadius: 999, transition: "width 1s ease", minWidth: s.count > 0 ? 28 : 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingLeft: 8 }}>
                            {s.count > 0 && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>{s.count}</span>}
                          </div>
                        </div>
                        <div style={{ width: 28, fontSize: 13, fontWeight: 900, color: s.col, textAlign: "center", flexShrink: 0 }}>{s.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            </div>{/* إغلاق admin-2col للمبيعات */}

            {/* آخر الطلبات + منتجات قليلة المخزون */}
            <div className="admin-2col" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>

              {/* آخر الطلبات */}
              <div style={CARD}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A" }}>🕒 آخر الطلبات</h3>
                  <Link to="/admin-orders" style={{ color: "#6366F1", fontSize: 13, fontWeight: 700 }}>عرض الكل ←</Link>
                </div>
                {recentOrders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "28px", color: "#94A3B8", background: "#F8FAFC", borderRadius: 14, border: "2px dashed #E2E8F0" }}>لا توجد طلبات بعد</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {recentOrders.map((o, i) => {
                      const st = STATUSES[o.status] || STATUSES.NEW;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #F1F5F9" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.col, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{o.customer?.name || "—"}</div>
                            <div style={{ fontSize: 12, color: "#94A3B8" }}>{o.id}</div>
                          </div>
                          <span style={{ background: st.bg, color: st.col, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{st.label}</span>
                          <span style={{ fontWeight: 800, color: "#6366F1", fontSize: 14, whiteSpace: "nowrap" }}>{fmt(o.totals?.grandTotal || o.total || 0)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* منتجات قليلة المخزون */}
              <div style={CARD}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A" }}>⚠️ مخزون منخفض</h3>
                  <span style={{ background: "#FEF2F2", color: "#EF4444", borderRadius: 999, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{stats.lowStock} منتج</span>
                </div>
                {stats.lowStock === 0 ? (
                  <div style={{ textAlign: "center", padding: "28px", color: "#10B981", background: "#ECFDF5", borderRadius: 14 }}>✅ جميع المنتجات متوفرة</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {products.filter(p => Number.isFinite(p.stock) && p.stock <= (p.lowStockThreshold || 5) && p.stock > 0).map((p, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#FEF2F2", border: "1px solid #FECACA" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#fff" }}>
                          <img src={p.image || ""} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: "#EF4444", fontWeight: 700 }}>بقي {p.stock} فقط</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* إجراءات سريعة */}
            <div style={CARD}>
              <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 16 }}>⚡ إجراءات سريعة</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
                {[
                  { icon: "➕", label: "إضافة منتج",   to: "/add-product",    col: "#10B981", bg: "#ECFDF5" },
                  { icon: "📦", label: "إدارة الطلبات", to: "/admin-orders",   col: "#6366F1", bg: "#EEF2FF" },
                  { icon: "📂", label: "إدارة الأقسام", tab: "cats",           col: "#F59E0B", bg: "#FFFBEB" },
                  { icon: "👥", label: "العملاء",         to: "/customers",     col: "#F59E0B", bg: "#FFFBEB" },
                  { icon: "⚙️", label: "إعدادات المتجر", tab: "settings",      col: "#EC4899", bg: "#FDF2F8" },
                ].map((a, i) => (
                  a.to ? (
                    <Link key={i} to={a.to} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "20px 12px", borderRadius: 16, background: a.bg, border: `1.5px solid ${a.col}22`, transition: "transform .15s, box-shadow .15s" }}
                      onMouseOver={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 20px ${a.col}22`; }}
                      onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                      <span style={{ fontSize: 28 }}>{a.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: a.col }}>{a.label}</span>
                    </Link>
                  ) : (
                    <button key={i} onClick={() => setTab(a.tab)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "20px 12px", borderRadius: 16, background: a.bg, border: `1.5px solid ${a.col}22`, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", transition: "transform .15s, box-shadow .15s" }}
                      onMouseOver={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 20px ${a.col}22`; }}
                      onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                      <span style={{ fontSize: 28 }}>{a.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: a.col }}>{a.label}</span>
                    </button>
                  )
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════ الأقسام ════════════ */}
        {tab === "cats" && (
          <div style={{ display: "grid", gap: 22, animation: "fadeUp .4s ease both" }}>

            {/* فورم الإضافة/التعديل */}
            <div style={CARD}>
              <h2 style={{ fontWeight: 800, fontSize: 17, color: "#0F172A", marginBottom: 20 }}>
                {catEdit !== null ? "✏️ تعديل القسم" : "➕ إضافة قسم جديد"}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={lbl}>اسم القسم</label>
                  <input placeholder="مثال: عطور" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>صورة القسم</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input placeholder="https://..." value={catForm.image} onChange={e => setCatForm(f => ({ ...f, image: e.target.value }))} style={{ ...inputBase, flex: 1 }} onFocus={focusIn} onBlur={focusOut} />
                    <label style={{ background: "#EEF2FF", color: "#6366F1", border: "1.5px solid #6366F1", borderRadius: r.md, padding: "10px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}>
                      📷 رفع
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => { const f = e.target.files?.[0]; if (f) { const b = await fileToBase64(f); setCatForm(fr => ({ ...fr, image: b })); e.target.value = ""; } }} />
                    </label>
                  </div>
                </div>
              </div>
              {catForm.image && <img src={catForm.image} alt="معاينة" style={{ width: 100, height: 80, objectFit: "cover", borderRadius: r.md, marginBottom: 16, border: "1px solid #E2E8F0" }} onError={e => e.currentTarget.style.display = "none"} />}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={saveCat} style={{ ...btnPrimary, padding: "11px 24px" }}>{catEdit !== null ? "تحديث القسم" : "حفظ القسم"}</button>
                {catEdit !== null && <button onClick={() => { setCatEdit(null); setCatForm({ name: "", image: "" }); }} style={{ background: "#F8FAFC", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: r.md, padding: "11px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>إلغاء</button>}
              </div>
            </div>

            {/* قائمة الأقسام */}
            <div style={CARD}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={{ fontWeight: 800, fontSize: 17, color: "#0F172A" }}>📂 قائمة الأقسام</h2>
                <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "4px 14px", fontSize: 13, fontWeight: 700 }}>{categories.length} قسم</span>
              </div>
              {categories.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8", background: "#F8FAFC", borderRadius: 16, border: "2px dashed #E2E8F0" }}>لا توجد أقسام بعد. أضف أول قسم!</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
                  {categories.map((cat) => (
                    <div key={cat.id} style={{ border: "1px solid #F1F5F9", borderRadius: 16, padding: "14px 16px", display: "grid", gridTemplateColumns: "56px 1fr", gap: 12, alignItems: "center", background: "#F8FAFC" }}>
                      <div style={{ width: 56, height: 56, borderRadius: 12, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {cat.image ? <img src={cat.image} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} /> : <span style={{ fontSize: 24 }}>📦</span>}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>{cat.name}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="icon-btn" onClick={() => { setCatEdit(cat.id); setCatForm({ name: cat.name, image: cat.image || "" }); }} style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'Tajawal',sans-serif" }}>✏️ تعديل</button>
                          <button className="icon-btn" onClick={() => { if (window.confirm(`حذف "${cat.name}"؟`)) deleteCategory(cat.id); }} style={{ background: "#FEF2F2", color: "#EF4444", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'Tajawal',sans-serif" }}>🗑️ حذف</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════ المنتجات ════════════ */}
        {tab === "products" && (
          <div style={{ display: "grid", gap: 20, animation: "fadeUp .4s ease both" }}>

            {/* شريط البحث + إحصاء */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
                <input placeholder="🔍 ابحث عن منتج أو قسم..." value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                  style={{ ...inputBase, paddingRight: 44 }} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "8px 18px", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>
                {filteredProds.length} / {products.length} منتج
              </span>
              <Link to="/add-product" style={{ ...btnPrimary, padding: "10px 20px", whiteSpace: "nowrap" }}>➕ إضافة منتج</Link>
            </div>

            {/* جدول المنتجات */}
            <div className="prod-table-wrap" style={{ background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: shadow.md, overflow: "auto" }}>
              {filteredProds.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                  {prodSearch ? "لا توجد نتائج" : "لا توجد منتجات بعد"}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
                      {["المنتج", "القسم", "السعر", "المخزون", "الحالة", "إجراءات"].map(h => (
                        <th key={h} style={{ padding: "14px 16px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#64748B" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProds.map((p, i) => (
                      <tr key={p.id} className="prod-row" style={{ borderBottom: "1px solid #F1F5F9", background: p.hidden ? "#FAFAFA" : "#fff" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", background: "#F1F5F9", flexShrink: 0 }}>
                              <img src={p.image || ""} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: p.hidden ? "#94A3B8" : "#0F172A" }}>{p.name}</div>
                              {p.badges?.length > 0 && <div style={{ fontSize: 11, color: "#94A3B8" }}>{p.badges.slice(0, 2).join(" • ")}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{p.category}</span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 800, color: "#6366F1", fontSize: 14 }}>{fmt(p.price)}</div>
                          {p.oldPrice > p.price && <div style={{ fontSize: 12, color: "#94A3B8", textDecoration: "line-through" }}>{fmt(p.oldPrice)}</div>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {p.stock === 0 ? (
                            <span style={{ background: "#FEF2F2", color: "#EF4444", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>نفد</span>
                          ) : p.stock <= (p.lowStockThreshold || 5) ? (
                            <span style={{ background: "#FFFBEB", color: "#F59E0B", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>⚠️ {p.stock}</span>
                          ) : (
                            <span style={{ background: "#ECFDF5", color: "#10B981", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{Number.isFinite(p.stock) ? p.stock : "∞"}</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <button className="icon-btn" onClick={() => toggleHideProd(p.id)}
                            style={{ background: p.hidden ? "#FEF2F2" : "#ECFDF5", color: p.hidden ? "#EF4444" : "#10B981", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, fontFamily: "'Tajawal',sans-serif" }}>
                            {p.hidden ? "🙈 مخفي" : "👁️ ظاهر"}
                          </button>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="icon-btn" onClick={() => openEditProd(p)} style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, fontFamily: "'Tajawal',sans-serif" }}>✏️</button>
                            <button className="icon-btn" onClick={() => deleteProd(p.id)} style={{ background: "#FEF2F2", color: "#EF4444", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, fontFamily: "'Tajawal',sans-serif" }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ════════════ الإعدادات ════════════ */}
        {tab === "settings" && (
          <div style={{ display: "grid", gap: 22, maxWidth: 720, animation: "fadeUp .4s ease both" }}>

            {/* معلومات المتجر */}
            <div style={CARD}>
              <h3 style={{ fontWeight: 800, fontSize: 17, color: "#0F172A", marginBottom: 20 }}>🏪 معلومات المتجر</h3>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={lbl}>اسم المتجر</label>
                  <input value={settings.storeName} onChange={e => setSettings(s => ({ ...s, storeName: e.target.value }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>رقم واتساب (بدون +)</label>
                  <input placeholder="971585446473" value={settings.whatsapp} onChange={e => setSettings(s => ({ ...s, whatsapp: e.target.value }))} style={{ ...inputBase, direction: "ltr" }} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>نص شريط الإعلانات العلوي</label>
                  <input value={settings.announcement} onChange={e => setSettings(s => ({ ...s, announcement: e.target.value }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                  <div style={{ marginTop: 8, background: "linear-gradient(90deg,#0C4A6E,#1E40AF)", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#fff", fontWeight: 600 }}>
                    معاينة: {settings.announcement}
                  </div>
                </div>
              </div>
            </div>

            {/* روابط السوشيال */}
            <div style={CARD}>
              <h3 style={{ fontWeight: 800, fontSize: 17, color: "#0F172A", marginBottom: 20 }}>📲 روابط التواصل الاجتماعي</h3>
              <div style={{ display: "grid", gap: 14 }}>
                {[
                  { key: "instagram", label: "إنستغرام",  icon: "📸", color: "#E1306C" },
                  { key: "tiktok",    label: "تيك توك",    icon: "🎵", color: "#010101" },
                  { key: "facebook",  label: "فيسبوك",     icon: "👤", color: "#1877F2" },
                  { key: "twitter",   label: "تويتر / X",  icon: "✖️", color: "#14171A" },
                ].map(s => (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...lbl, marginBottom: 4 }}>{s.label}</label>
                      <input value={settings[s.key]} onChange={e => setSettings(st => ({ ...st, [s.key]: e.target.value }))} style={{ ...inputBase, direction: "ltr", fontSize: 13 }} onFocus={focusIn} onBlur={focusOut} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* زر الحفظ */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button onClick={handleSaveSettings} style={{ ...btnPrimary, padding: "13px 32px", fontSize: 15 }}>
                💾 حفظ الإعدادات
              </button>
              {settingsSaved && (
                <span style={{ background: "#ECFDF5", color: "#10B981", borderRadius: 999, padding: "8px 18px", fontWeight: 700, fontSize: 14, animation: "fadeUp .3s ease both" }}>
                  ✅ تم الحفظ!
                </span>
              )}
            </div>

            {/* خطر */}
            <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #FECACA", padding: "24px" }}>
              <h3 style={{ fontWeight: 800, fontSize: 15, color: "#EF4444", marginBottom: 16 }}>🚨 منطقة الخطر</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#FEF2F2", borderRadius: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>حذف جميع المنتجات</div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>لا يمكن التراجع عن هذا الإجراء</div>
                  </div>
                  <button onClick={async () => { if (window.confirm("⚠️ حذف جميع المنتجات؟ لا يمكن التراجع!")) { try { await Promise.all(products.map(p => deleteProduct(p.id))); alert("✅ تم حذف جميع المنتجات"); } catch { alert("❌ فشل الحذف"); } } }} style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                    حذف الكل
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#FEF2F2", borderRadius: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>حذف جميع الأقسام</div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>سيؤثر على ظهور المنتجات</div>
                  </div>
                  <button onClick={async () => { if (window.confirm("⚠️ حذف جميع الأقسام؟")) { try { await Promise.all(categories.map(c => deleteCategory(c.id))); alert("✅ تم حذف جميع الأقسام"); } catch { alert("❌ فشل الحذف"); } } }} style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                    حذف الكل
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ════════ مودال تعديل المنتج ════════ */}
      {prodEdit !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setProdEdit(null)}>
          <div className="modal-box">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h3 style={{ fontWeight: 900, fontSize: 18, color: "#0F172A" }}>✏️ تعديل المنتج</h3>
              <button onClick={() => setProdEdit(null)} style={{ background: "#F1F5F9", border: "none", borderRadius: 10, width: 36, height: 36, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={lbl}>اسم المنتج</label>
                <input value={prodForm.name || ""} onChange={e => setProdForm(f => ({ ...f, name: e.target.value }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>السعر (درهم)</label>
                  <input type="number" min="0" step="0.01" value={prodForm.price || ""} onChange={e => setProdForm(f => ({ ...f, price: e.target.value }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>السعر القديم</label>
                  <input type="number" min="0" step="0.01" value={prodForm.oldPrice || ""} onChange={e => setProdForm(f => ({ ...f, oldPrice: e.target.value }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>القسم</label>
                  <select value={prodForm.category || ""} onChange={e => setProdForm(f => ({ ...f, category: e.target.value }))} style={{ ...inputBase, cursor: "pointer" }} onFocus={focusIn} onBlur={focusOut}>
                    {categories.map(c => <option key={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>المخزون</label>
                  <input type="number" min="0" value={prodForm.stock ?? ""} onChange={e => setProdForm(f => ({ ...f, stock: e.target.value }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
              </div>
              <div>
                <label style={lbl}>الوصف</label>
                <textarea rows={3} value={prodForm.description || ""} onChange={e => setProdForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputBase, resize: "vertical" }} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={lbl}>الشارات (مفصولة بفاصلة)</label>
                <input value={prodForm.badges || ""} onChange={e => setProdForm(f => ({ ...f, badges: e.target.value }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={lbl}>رابط الصورة</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={prodForm.image || ""} onChange={e => setProdForm(f => ({ ...f, image: e.target.value }))} style={{ ...inputBase, flex: 1, direction: "ltr", fontSize: 13 }} onFocus={focusIn} onBlur={focusOut} />
                  <label style={{ background: "#EEF2FF", color: "#6366F1", border: "1.5px solid #6366F1", borderRadius: r.md, padding: "10px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}>
                    📷 رفع
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => { const f = e.target.files?.[0]; if (f) { const b = await fileToBase64(f, 1280); setProdForm(fr => ({ ...fr, image: b })); e.target.value = ""; } }} />
                  </label>
                </div>
                {prodForm.image && <img src={prodForm.image} alt="معاينة" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 12, marginTop: 10, border: "1px solid #E2E8F0" }} onError={e => e.currentTarget.style.display = "none"} />}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={saveEditProd} style={{ ...btnPrimary, flex: 1, padding: "13px" }}>💾 حفظ التعديلات</button>
              <button onClick={() => setProdEdit(null)} style={{ background: "#F8FAFC", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: r.md, padding: "13px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
