import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { shadow, r, inputBase, btnPrimary, focusIn, focusOut, safeParse, slugify, fmt } from "../Theme";
import AdminNotificationBell from "../components/AdminNotificationBell";
import { useCategories, addCategory, updateCategory, deleteCategory } from "../hooks/useCategories";
import { useProducts, updateProduct, replaceProduct, deleteProduct } from "../hooks/useProducts";
import { useSettings, saveSettings } from "../hooks/useSettings";
import { fetchAllRatings, moderateRating, adminDeleteRating } from "../hooks/useRatings";
import { apiFetch } from "../api";
import { uploadToCloudinary, isConfigured } from "../utils/cloudinary";
import HelpTip from "../components/HelpTip";
import DangerConfirm from "../components/DangerConfirm";
import SetupWizard, { isWizardDone, markWizardDone } from "../components/SetupWizard";

/* ── رفع صورة إلى Cloudinary ── */
async function handleImageUpload(file, setUploading) {
  if (!isConfigured()) {
    alert("⚠️ Cloudinary غير مُعدّ — تحقّق من متغيرات VITE_CLOUDINARY_*");
    return null;
  }
  try {
    setUploading(true);
    const url = await uploadToCloudinary(file);
    return url;
  } catch {
    alert("❌ فشل رفع الصورة");
    return null;
  } finally {
    setUploading(false);
  }
}
/* ── أنماط ثابتة ── */
const shimmer = { background: "linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899,#6366F1)", backgroundSize: "300% auto", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "shimmer 4s linear infinite" };
const lbl   = { display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "#334155" };
const CARD  = { background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: shadow.md, padding: "24px" };
const STATUSES = { NEW: { label: "جديد", col: "#6366F1", bg: "#EEF2FF" }, PROCESSING: { label: "قيد المعالجة", col: "#A855F7", bg: "#FDF4FF" }, SHIPPED: { label: "تم الشحن", col: "#F59E0B", bg: "#FFFBEB" }, DELIVERED: { label: "تم التسليم", col: "#10B981", bg: "#ECFDF5" }, CANCELED: { label: "ملغي", col: "#EF4444", bg: "#FEF2F2" } };

/* ── بطاقة قابلة للطي للإعدادات المتقدمة ── */
function AdvCard({ title, icon, subtitle, open, onToggle, danger, children }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 20,
      border: danger ? "1.5px solid #FECACA" : "1px solid #F1F5F9",
      boxShadow: shadow.md, overflow: "hidden",
    }}>
      <button onClick={onToggle} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
        background: "transparent", border: "none", padding: "20px 24px", cursor: "pointer",
        fontFamily: "'Tajawal',sans-serif", textAlign: "inherit",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <div>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 16, color: danger ? "#EF4444" : "#0F172A" }}>{title}</h3>
            {subtitle && <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>{subtitle}</div>}
          </div>
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontSize: 12, color: "#64748B", fontWeight: 700,
        }}>
          {!open && <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "3px 10px", fontSize: 11 }}>اضغط للفتح</span>}
          <span style={{ fontSize: 16, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
        </span>
      </button>
      {open && <div style={{ padding: "0 24px 24px" }}>{children}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab]   = useState("home");

  /* بيانات */
  const { categories, refresh: refreshCategories } = useCategories();
  const { products, refresh: refreshProducts }     = useProducts();
  const [orders,     setOrders]     = useState([]);

  /* فورم الأقسام */
  const [catForm,  setCatForm]  = useState({ name: "", image: "" });
  const [catEdit,  setCatEdit]  = useState(null);

  /* فورم المنتجات */
  const [prodSearch, setProdSearch] = useState("");
  const [prodEdit,   setProdEdit]   = useState(null);   // null = مغلق، object = منتج للتعديل
  const [prodForm,   setProdForm]   = useState({});

  /* حالة رفع الصور */
  const [catUploading,  setCatUploading]  = useState(false);
  const [prodUploading, setProdUploading] = useState(false);

  /* حالات طيّ الأقسام */
  const [showLowStock, setShowLowStock] = useState(false);
  const [openAdv, setOpenAdv] = useState({ loyalty: false, zones: false, vat: false, pixels: false, notify: false, danger: false });
  const toggleAdv = (k) => setOpenAdv(s => ({ ...s, [k]: !s[k] }));

  /* مودال تأكيد الحذف الخطر */
  const [dangerModal, setDangerModal] = useState(null); // null | { title, message, onConfirm, busy }

  /* معالج الإعداد الأولي */
  const [showWizard, setShowWizard] = useState(false);

  /* بحث داخل الإعدادات */
  const [settingsQuery, setSettingsQuery] = useState("");
  const SETTINGS_NAV = [
    { id: "sec-store", icon: "🏪", label: "معلومات المتجر", keywords: "اسم متجر واتساب إعلان بريد عنوان" },
    { id: "sec-loyalty", icon: "⭐", label: "نظام النقط", keywords: "loyalty نقط خصم استبدال ولاء" },
    { id: "sec-shipping", icon: "🚚", label: "الشحن والطلبات", keywords: "شحن مجاني رسوم حد أدنى طلب" },
    { id: "sec-zones", icon: "📍", label: "مناطق الشحن", keywords: "مناطق إمارات دبي أبوظبي وزن" },
    { id: "sec-vat", icon: "🧾", label: "ضريبة VAT", keywords: "ضريبة tax vat قيمة مضافة 5" },
    { id: "sec-social", icon: "📲", label: "روابط السوشيال", keywords: "إنستغرام تيك توك فيسبوك تويتر سوشيال" },
    { id: "sec-pixels", icon: "📊", label: "بكسلات التتبع", keywords: "facebook pixel google analytics tiktok بكسل تتبع" },
    { id: "sec-notify", icon: "📬", label: "إشعارات الطلبات", keywords: "webhook whatsapp telegram notify إشعار طلب" },
    { id: "sec-backup", icon: "💾", label: "النسخ الاحتياطي", keywords: "backup نسخ احتياطي تصدير استرجاع" },
    { id: "sec-danger", icon: "🚨", label: "منطقة الخطر", keywords: "حذف كل خطر danger" },
  ];
  const visibleSettingsSections = useMemo(() => {
    if (!settingsQuery.trim()) return new Set(SETTINGS_NAV.map(s => s.id));
    const q = settingsQuery.toLowerCase();
    return new Set(SETTINGS_NAV.filter(s => s.label.toLowerCase().includes(q) || s.keywords.toLowerCase().includes(q)).map(s => s.id));
  }, [settingsQuery]);
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* الإعدادات */
  const { settings: firestoreSettings } = useSettings();
  const [settings, setSettings] = useState(firestoreSettings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // مزامنة الإعدادات من السيرفر — السيرفر هو المصدر الوحيد
  useEffect(() => { setSettings(firestoreSettings); }, [firestoreSettings]);

  // عرض معالج الإعداد أول مرة
  useEffect(() => {
    if (!isWizardDone() && firestoreSettings && !firestoreSettings.storeName) {
      setShowWizard(true);
    }
  }, [firestoreSettings]);

  useEffect(() => {
    if (localStorage.getItem("isAdmin") !== "true") { navigate("/user-login"); return; }
    apiFetch("/api/orders").then(setOrders).catch(() => {});
  }, []);

  /* ── إحصاءات ── */
  const stats = useMemo(() => {
    const deliveredOrders = orders.filter(o => o?.status === "DELIVERED");
    const revenue = deliveredOrders.reduce((s, o) => s + (o.totals?.grandTotal || o.total || 0), 0);
    const aov = deliveredOrders.length ? revenue / deliveredOrders.length : 0;
    return {
      orders:     orders.length,
      newOrders:  orders.filter(o => o?.status === "NEW").length,
      processing: orders.filter(o => o?.status === "PROCESSING").length,
      products:   products.length,
      categories: categories.length,
      lowStock:   products.filter(p => Number.isFinite(p.stock) && p.stock <= (p.lowStockThreshold || 5) && p.stock > 0).length,
      outOfStock: products.filter(p => Number.isFinite(p.stock) && p.stock <= 0).length,
      noImage:    products.filter(p => !p.image || !String(p.image).trim()).length,
      noCategory: products.filter(p => !p.category).length,
      revenue,
      aov,
      deliveredCount: deliveredOrders.length,
    };
  }, [orders, products, categories]);

  /* ── مهام اليوم (المشاكل اللي تحتاج معالجة) ── */
  const todayTasks = useMemo(() => {
    const tasks = [];
    if (stats.newOrders > 0) tasks.push({ icon: "🔴", label: "طلبات جديدة تحتاج معالجة", count: stats.newOrders, color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", to: "/admin-orders" });
    if (stats.processing > 0) tasks.push({ icon: "⏳", label: "طلبات قيد المعالجة", count: stats.processing, color: "#A855F7", bg: "#FDF4FF", border: "#E9D5FF", to: "/admin-orders" });
    if (stats.outOfStock > 0) tasks.push({ icon: "📦", label: "منتجات نفد مخزونها", count: stats.outOfStock, color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", tab: "products" });
    if (stats.lowStock > 0) tasks.push({ icon: "⚠️", label: "مخزون منخفض", count: stats.lowStock, color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", tab: "products" });
    if (stats.noImage > 0) tasks.push({ icon: "🖼️", label: "منتجات بدون صورة", count: stats.noImage, color: "#EC4899", bg: "#FDF2F8", border: "#FBCFE8", tab: "products" });
    if (stats.noCategory > 0) tasks.push({ icon: "📂", label: "منتجات بدون قسم", count: stats.noCategory, color: "#0EA5E9", bg: "#F0F9FF", border: "#BAE6FD", tab: "products" });
    return tasks;
  }, [stats]);

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

  /* ── تحليلات إضافية ── */
  const insights = useMemo(() => {
    // أفضل يوم (حسب الإيرادات)
    const bestDay = weeklyRevenue.reduce((best, d) => (d.total > (best?.total || 0) ? d : best), null);
    // متوسط الطلبات اليومية آخر 7 أيام
    const dailyRev = weeklyRevenue.reduce((s, d) => s + d.total, 0);
    const avgDaily = dailyRev / 7;
    // الإيراد أمس vs الإيراد اليوم
    const today = weeklyRevenue[6]?.total || 0;
    const yesterday = weeklyRevenue[5]?.total || 0;
    const growth = yesterday ? ((today - yesterday) / yesterday) * 100 : (today ? 100 : 0);
    // عدد العملاء الفريدين
    const uniqueCustomers = new Set(orders.map(o => o.phone || o.customer?.phone || "").filter(Boolean)).size;
    // معدّل التحويل (عدد الطلبات / عدد المنتجات × 100) تقدير تقريبي
    return { bestDay, avgDaily, today, yesterday, growth, uniqueCustomers };
  }, [weeklyRevenue, orders]);

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
    try {
      if (catEdit !== null) {
        await updateCategory(catEdit, { name: catForm.name.trim(), image: catForm.image });
      } else {
        await addCategory({ name: catForm.name.trim(), image: catForm.image });
      }
      setCatForm({ name: "", image: "" }); setCatEdit(null);
      await refreshCategories();
    } catch (e) {
      alert("❌ فشل الحفظ: " + (e.message || ""));
    }
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
      weight:      prodForm.weight !== "" && prodForm.weight !== undefined ? Number(prodForm.weight) : current.weight,
      description: prodForm.description,
      category:    prodForm.category,
      brand:       (prodForm.brand || "").trim(),
      badges:      String(prodForm.badges || "").split(",").map(b => b.trim()).filter(Boolean),
      image:       prodForm.image || current.image,
      metaTitle:   (prodForm.metaTitle || "").trim(),
      metaDescription: (prodForm.metaDescription || "").trim(),
    };
    try {
      await replaceProduct(updated);
      setProdEdit(null);
      await refreshProducts();
    } catch (e) {
      alert("❌ فشل الحفظ: " + (e.message || ""));
    }
  };
  const deleteProd = async (id) => {
    if (!window.confirm("حذف هذا المنتج؟")) return;
    try {
      await deleteProduct(id);
      await refreshProducts();
    } catch (e) {
      alert("❌ فشل الحذف: " + (e.message || ""));
    }
  };
  const toggleHideProd = async (id) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    try {
      await updateProduct(id, { hidden: !p.hidden });
      await refreshProducts();
    } catch (e) {
      alert("❌ فشل التحديث");
    }
  };

  /* ── إعدادات: حفظ ── */
  const handleSaveSettings = async () => { await saveSettings(settings); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2500); };

  /* ── Auto-save للإعدادات (debounced) ── */
  const [autoSaveState, setAutoSaveState] = useState("idle"); // idle | dirty | saving | saved | error
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  useEffect(() => {
    // نتجاهل أول تحميل قادم من السيرفر
    if (!firstLoadDone) { if (firestoreSettings) setFirstLoadDone(true); return; }
    if (tab !== "settings") return;
    setAutoSaveState("dirty");
    const id = setTimeout(async () => {
      setAutoSaveState("saving");
      try { await saveSettings(settings); setAutoSaveState("saved"); setTimeout(() => setAutoSaveState("idle"), 2000); }
      catch { setAutoSaveState("error"); }
    }, 1200);
    return () => clearTimeout(id);
  }, [settings, tab]);

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
    { key: "ratings",  label: "⭐ التقييمات" },
    { key: "abandoned", label: "🛒 السلات المهجورة" },
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
        @media(max-width:900px){
          .admin-nav-links .nav-secondary { display: none !important; }
        }
        @media(max-width:768px){
          .admin-nav-links { gap: 4px !important; overflow-x: auto !important; flex-wrap: nowrap !important; max-width: 60% !important; }
          .admin-nav-links a { padding: 7px 8px !important; font-size: 12px !important; white-space: nowrap !important; }
          .admin-nav-label  { display: none !important; }
          .admin-tabs { padding: 0 12px !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .admin-tab  { padding: 12px 14px !important; font-size: 13px !important; white-space: nowrap !important; flex-shrink: 0 !important; }
          .admin-stats { grid-template-columns: repeat(2,1fr) !important; }
          .prod-table-wrap { overflow-x: auto !important; }
          .prod-hide-mobile { display: none !important; }
          .settings-body { grid-template-columns: 1fr !important; }
          .settings-sidebar { position: static !important; overflow-x: auto !important; }
          .admin-2col { grid-template-columns: 1fr !important; }
          .admin-main { padding: 18px 14px !important; }
          .adm-nav-logo-text { font-size: 14px !important; }
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
          <Link to="/bulk-import"  style={{ background: "#F0F9FF", color: "#0EA5E9", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>📥 استيراد CSV</Link>
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

            {/* ══ مهام اليوم ══ */}
            {todayTasks.length > 0 ? (
              <div style={{ ...CARD, background: "linear-gradient(135deg,#FEF3C7 0%,#FFF 30%)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: 16, color: "#0F172A" }}>
                    🎯 مهام اليوم
                    <span style={{ marginInlineStart: 8, background: "#F59E0B", color: "#fff", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 800 }}>{todayTasks.length}</span>
                  </h3>
                  <span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>أمور تحتاج انتباهك</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                  {todayTasks.map((task, i) => {
                    const Inner = (
                      <>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{task.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: "#0F172A", lineHeight: 1.4 }}>{task.label}</div>
                          <div style={{ fontSize: 11, color: task.color, fontWeight: 700, marginTop: 2 }}>{task.count} {task.count === 1 ? "عنصر" : "عناصر"}</div>
                        </div>
                        <div style={{ background: task.color, color: "#fff", borderRadius: 999, padding: "3px 11px", fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{task.count}</div>
                      </>
                    );
                    const style = { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: task.bg, border: `1.5px solid ${task.border}`, cursor: "pointer", transition: "transform .15s, box-shadow .15s", textDecoration: "none", fontFamily: "'Tajawal',sans-serif" };
                    const hover = e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 20px ${task.color}22`; };
                    const unhover = e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; };
                    return task.to ? (
                      <Link key={i} to={task.to} style={style} onMouseEnter={hover} onMouseLeave={unhover}>{Inner}</Link>
                    ) : (
                      <button key={i} onClick={() => setTab(task.tab)} style={{ ...style, border: `1.5px solid ${task.border}`, width: "100%", textAlign: "inherit" }} onMouseEnter={hover} onMouseLeave={unhover}>{Inner}</button>
                    );
                  })}
                </div>
              </div>
            ) : stats.products > 0 ? (
              <div style={{ ...CARD, background: "linear-gradient(135deg,#D1FAE5 0%,#FFF 60%)", textAlign: "center", padding: "24px" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                <div style={{ fontWeight: 900, fontSize: 16, color: "#065F46" }}>كل شي تمام!</div>
                <div style={{ fontSize: 13, color: "#047857", marginTop: 4 }}>ما في مهام مستعجلة الآن</div>
              </div>
            ) : null}

            {/* ── بطاقات تحليلات سريعة ── */}
            <div className="admin-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              {[
                {
                  icon: "💵", label: "متوسط قيمة الطلب (AOV)",
                  val: stats.aov > 0 ? `${stats.aov.toFixed(0)}د` : "—",
                  hint: stats.deliveredCount ? `من ${stats.deliveredCount} طلب مسلّم` : "ما في طلبات مسلّمة",
                  col: "#6366F1",
                },
                {
                  icon: "📅", label: "أفضل يوم (هذا الأسبوع)",
                  val: insights.bestDay?.total > 0 ? insights.bestDay.label : "—",
                  hint: insights.bestDay?.total > 0 ? fmt(insights.bestDay.total) : "ما في مبيعات",
                  col: "#10B981",
                },
                {
                  icon: insights.growth >= 0 ? "📈" : "📉", label: "مقارنة بأمس",
                  val: `${insights.growth >= 0 ? "+" : ""}${insights.growth.toFixed(0)}%`,
                  hint: `اليوم ${insights.today.toFixed(0)}د vs أمس ${insights.yesterday.toFixed(0)}د`,
                  col: insights.growth >= 0 ? "#10B981" : "#EF4444",
                },
                {
                  icon: "👥", label: "عملاء فريدين",
                  val: insights.uniqueCustomers || 0,
                  hint: `من ${stats.orders} طلب`,
                  col: "#F59E0B",
                },
              ].map((s, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid #F1F5F9", boxShadow: shadow.sm, padding: "16px", borderInlineStart: `3px solid ${s.col}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{s.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>{s.label}</span>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 22, color: s.col, lineHeight: 1.2 }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{s.hint}</div>
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
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>معدّل يومي: {fmt(insights.avgDaily)}</span>
                      <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "4px 12px", fontSize: 13, fontWeight: 700 }}>{fmt(weeklyRevenue.reduce((s,d)=>s+d.total,0))}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
                    {weeklyRevenue.map((d, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", opacity: d.total > 0 ? 1 : 0 }}>{d.total > 0 ? fmt(d.total).replace(" درهم","") : ""}</span>
                        <div style={{ width: "100%", background: d === insights.bestDay && d.total > 0 ? "linear-gradient(180deg,#10B981,#059669)" : d.total > 0 ? "linear-gradient(180deg,#6366F1,#8B5CF6)" : "#F1F5F9", borderRadius: "6px 6px 0 0", height: Math.max((d.total / maxVal) * 90, d.total > 0 ? 8 : 4), transition: "height 1s ease", minHeight: 4 }} />
                        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, whiteSpace: "nowrap" }}>{d.label}{d === insights.bestDay && d.total > 0 ? " 🏆" : ""}</span>
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
                <button onClick={() => setShowLowStock(v => !v)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "transparent", border: "none", padding: 0, cursor: stats.lowStock > 0 ? "pointer" : "default", marginBottom: showLowStock ? 20 : 0, fontFamily: "'Tajawal',sans-serif" }}
                  disabled={stats.lowStock === 0}>
                  <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", margin: 0 }}>⚠️ مخزون منخفض</h3>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: "#FEF2F2", color: "#EF4444", borderRadius: 999, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{stats.lowStock} منتج</span>
                    {stats.lowStock > 0 && (
                      <span style={{ fontSize: 14, color: "#94A3B8", transform: showLowStock ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
                    )}
                  </span>
                </button>
                {stats.lowStock === 0 ? (
                  <div style={{ textAlign: "center", padding: "28px", color: "#10B981", background: "#ECFDF5", borderRadius: 14, marginTop: 20 }}>✅ جميع المنتجات متوفرة</div>
                ) : showLowStock ? (
                  <div style={{ display: "grid", gap: 8, maxHeight: 360, overflowY: "auto", paddingInlineEnd: 4 }}>
                    {products.filter(p => Number.isFinite(p.stock) && p.stock <= (p.lowStockThreshold || 5) && p.stock > 0)
                      .sort((a, b) => a.stock - b.stock)
                      .map((p, i) => (
                        <Link key={i} to={`/product/${p.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#FEF2F2", border: "1px solid #FECACA", textDecoration: "none" }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#fff" }}>
                            <img src={p.image || ""} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: "#EF4444", fontWeight: 700 }}>بقي {p.stock} فقط</div>
                          </div>
                          <span style={{ color: "#94A3B8", fontSize: 14 }}>←</span>
                        </Link>
                      ))}
                  </div>
                ) : null}
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
                    <label style={{ background: "#EEF2FF", color: "#6366F1", border: "1.5px solid #6366F1", borderRadius: r.md, padding: "10px 14px", fontWeight: 700, cursor: catUploading ? "wait" : "pointer", fontSize: 13, whiteSpace: "nowrap", opacity: catUploading ? 0.6 : 1 }}>
                      {catUploading ? "⏳ جاري الرفع..." : "📷 رفع"}
                      <input type="file" accept="image/*" disabled={catUploading} style={{ display: "none" }} onChange={async e => { const f = e.target.files?.[0]; if (f) { const url = await handleImageUpload(f, setCatUploading); if (url) setCatForm(fr => ({ ...fr, image: url })); e.target.value = ""; } }} />
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

        {/* ════════════ التقييمات ════════════ */}
        {tab === "ratings" && (
          <RatingsModeration products={products} />
        )}

        {/* ════════════ السلات المهجورة ════════════ */}
        {tab === "abandoned" && (
          <AbandonedCarts settings={settings} />
        )}

        {/* ════════════ الإعدادات ════════════ */}
        {tab === "settings" && (
          <div className="settings-body" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20, alignItems: "start", animation: "fadeUp .4s ease both" }}>

            {/* شريط تنقّل جانبي للإعدادات */}
            <aside className="settings-sidebar" style={{ position: "sticky", top: 20, background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: shadow.sm, padding: "14px 12px" }}>
              <button onClick={() => setShowWizard(true)}
                style={{
                  width: "100%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff",
                  border: "none", borderRadius: 10, padding: "9px", fontWeight: 800, fontSize: 12,
                  cursor: "pointer", fontFamily: "'Tajawal',sans-serif", marginBottom: 10,
                  boxShadow: "0 4px 14px rgba(99,102,241,.3)",
                }}>
                ✨ معالج الإعداد السريع
              </button>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <input
                  placeholder="🔍 بحث في الإعدادات..."
                  value={settingsQuery}
                  onChange={e => setSettingsQuery(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 12, outline: "none", background: "#F8FAFC", boxSizing: "border-box", fontFamily: "'Tajawal',sans-serif" }}
                />
              </div>
              <div style={{ display: "grid", gap: 2 }}>
                {SETTINGS_NAV.filter(s => visibleSettingsSections.has(s.id)).map(s => (
                  <button key={s.id} onClick={() => scrollToSection(s.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      background: "transparent", border: "none", borderRadius: 8, cursor: "pointer",
                      fontFamily: "'Tajawal',sans-serif", fontSize: 13, fontWeight: 700, color: "#334155", textAlign: "inherit",
                      transition: "background .15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ fontSize: 15 }}>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
                {visibleSettingsSections.size === 0 && (
                  <div style={{ fontSize: 12, color: "#94A3B8", padding: "8px 10px" }}>لا نتائج</div>
                )}
              </div>
            </aside>

            <div style={{ display: "grid", gap: 22, minWidth: 0 }}>

            {/* معلومات المتجر */}
            <div id="sec-store" style={{ ...CARD, display: visibleSettingsSections.has("sec-store") ? "block" : "none" }}>
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
                <div>
                  <label style={lbl}>البريد الإلكتروني</label>
                  <input type="email" placeholder="info@example.com" value={settings.storeEmail || ""} onChange={e => setSettings(s => ({ ...s, storeEmail: e.target.value }))} style={{ ...inputBase, direction: "ltr" }} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>عنوان المتجر</label>
                  <input placeholder="مثال: دبي، الإمارات" value={settings.storeAddress || ""} onChange={e => setSettings(s => ({ ...s, storeAddress: e.target.value }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
              </div>
            </div>

            {/* نظام النقط */}
            <div id="sec-loyalty" style={{ display: visibleSettingsSections.has("sec-loyalty") ? "block" : "none" }}>
            <AdvCard title="نظام النقط (Loyalty)" icon="⭐" subtitle="ربح واستبدال نقط للعملاء"
              open={openAdv.loyalty} onToggle={() => toggleAdv("loyalty")}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 16, padding: "10px 14px", background: settings.pointsEnabled ? "#ECFDF5" : "#F8FAFC", borderRadius: 10, border: `1.5px solid ${settings.pointsEnabled ? "#10B981" : "#E2E8F0"}` }}>
                <input type="checkbox" checked={!!settings.pointsEnabled} onChange={e => setSettings(s => ({ ...s, pointsEnabled: e.target.checked }))} style={{ width: 18, height: 18, cursor: "pointer" }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: settings.pointsEnabled ? "#10B981" : "#64748B" }}>
                  {settings.pointsEnabled ? "✅ نظام النقط مفعّل" : "⏸️ نظام النقط متوقف"}
                </span>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, opacity: settings.pointsEnabled ? 1 : 0.4, pointerEvents: settings.pointsEnabled ? "auto" : "none" }} className="admin-2col">
                <div>
                  <label style={lbl}>نقط لكل درهم <HelpTip text="كم نقطة بيربح العميل مقابل كل 1 درهم يدفعه. مثلاً لو حطيت 1، يعني كل درهم = نقطة. لو حطيت 0.5، يعني كل درهمين = نقطة." /></label>
                  <input type="number" min="0" step="0.1" value={settings.pointsPerAED ?? 1} onChange={e => setSettings(s => ({ ...s, pointsPerAED: Number(e.target.value) || 0 }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>كل 1 درهم = {settings.pointsPerAED || 0} نقطة</div>
                </div>
                <div>
                  <label style={lbl}>عدد النقط للاستبدال <HelpTip text="الحد الأدنى من النقط اللي لازم يجمّعها العميل ليقدر يستبدلها. مثال: 100 نقطة = خصم." /></label>
                  <input type="number" min="1" value={settings.pointsRedeemRate ?? 100} onChange={e => setSettings(s => ({ ...s, pointsRedeemRate: Number(e.target.value) || 1 }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>كل {settings.pointsRedeemRate || 0} نقطة = خصم</div>
                </div>
                <div>
                  <label style={lbl}>قيمة الخصم (درهم) <HelpTip text="قيمة الخصم اللي بياخده العميل لما يستبدل عدد النقط المحدّد. مثال: 100 نقطة = 10 درهم خصم." /></label>
                  <input type="number" min="0" step="0.5" value={settings.pointsRedeemValue ?? 10} onChange={e => setSettings(s => ({ ...s, pointsRedeemValue: Number(e.target.value) || 0 }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>قيمة خصم المجموعة</div>
                </div>
              </div>

              {settings.pointsEnabled && (
                <div style={{ marginTop: 14, padding: "12px 16px", background: "#FFFBEB", borderRadius: 10, border: "1.5px solid #FDE68A", fontSize: 13, color: "#92400E", lineHeight: 1.7 }}>
                  💡 <b>مثال:</b> طلب بـ 150 درهم يربح {Math.floor(150 * (settings.pointsPerAED || 0))} نقطة.
                  <br />
                  {settings.pointsRedeemRate > 0 && `كل ${settings.pointsRedeemRate} نقطة = ${settings.pointsRedeemValue || 0} درهم خصم.`}
                </div>
              )}
            </AdvCard>
            </div>

            {/* الشحن والطلبات */}
            <div id="sec-shipping" style={{ ...CARD, display: visibleSettingsSections.has("sec-shipping") ? "block" : "none" }}>
              <h3 style={{ fontWeight: 800, fontSize: 17, color: "#0F172A", marginBottom: 16 }}>🚚 الشحن والطلبات</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }} className="admin-2col">
                <div>
                  <label style={lbl}>حد الشحن المجاني (درهم) <HelpTip text="الطلبات اللي مجموعها أعلى من هذا المبلغ بتكون شحنها مجاني. مثال: 200 يعني أي طلب فوق 200 درهم ما في عليه شحن." /></label>
                  <input type="number" min="0" value={settings.freeShipThreshold ?? 200} onChange={e => setSettings(s => ({ ...s, freeShipThreshold: Number(e.target.value) || 0 }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>طلبات فوق هذا المبلغ = شحن مجاني</div>
                </div>
                <div>
                  <label style={lbl}>رسوم التوصيل (درهم) <HelpTip text="المبلغ اللي بيتحسب على الطلب لما ما يوصل لحد الشحن المجاني." /></label>
                  <input type="number" min="0" value={settings.shippingFee ?? 15} onChange={e => setSettings(s => ({ ...s, shippingFee: Number(e.target.value) || 0 }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>للطلبات تحت حد الشحن المجاني</div>
                </div>
                <div>
                  <label style={lbl}>الحد الأدنى للطلب (درهم) <HelpTip text="أقل مبلغ مسموح للطلب. تحت هذا المبلغ ما بيقدر العميل يكمّل. حط 0 لو ما بدك حد أدنى." /></label>
                  <input type="number" min="0" value={settings.minOrderAmount ?? 0} onChange={e => setSettings(s => ({ ...s, minOrderAmount: Number(e.target.value) || 0 }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>اتركه 0 لتعطيل الحد الأدنى</div>
                </div>
              </div>
            </div>

            {/* مناطق الشحن */}
            <div id="sec-zones" style={{ display: visibleSettingsSections.has("sec-zones") ? "block" : "none" }}>
            <AdvCard title="مناطق الشحن" icon="📍" subtitle="رسوم مخصّصة لكل إمارة حسب الوزن"
              open={openAdv.zones} onToggle={() => toggleAdv("zones")}>
              <ShippingZonesEditor settings={settings} setSettings={setSettings} embedded />
            </AdvCard>
            </div>

            {/* ضريبة VAT */}
            <div id="sec-vat" style={{ display: visibleSettingsSections.has("sec-vat") ? "block" : "none" }}>
            <AdvCard title="ضريبة القيمة المضافة (VAT)" icon="🧾" subtitle="تفعيل ضريبة 5% حسب قوانين الإمارات"
              open={openAdv.vat} onToggle={() => toggleAdv("vat")}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 16, padding: "10px 14px", background: settings.vatEnabled ? "#ECFDF5" : "#F8FAFC", borderRadius: 10, border: `1.5px solid ${settings.vatEnabled ? "#10B981" : "#E2E8F0"}` }}>
                <input type="checkbox" checked={!!settings.vatEnabled} onChange={e => setSettings(s => ({ ...s, vatEnabled: e.target.checked }))} style={{ width: 18, height: 18, cursor: "pointer" }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: settings.vatEnabled ? "#10B981" : "#64748B" }}>
                  {settings.vatEnabled ? "✅ الضريبة مفعّلة" : "⏸️ الضريبة معطّلة"}
                </span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, opacity: settings.vatEnabled ? 1 : 0.4, pointerEvents: settings.vatEnabled ? "auto" : "none" }} className="admin-2col">
                <div>
                  <label style={lbl}>نسبة الضريبة (%) <HelpTip text="نسبة الضريبة اللي بتطبّق على المنتجات. بالإمارات النسبة الرسمية هي 5%." /></label>
                  <input type="number" min="0" max="100" step="0.1" value={settings.vatPercent ?? 5} onChange={e => setSettings(s => ({ ...s, vatPercent: Number(e.target.value) || 0 }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>الإمارات: 5%</div>
                </div>
                <div>
                  <label style={lbl}>طريقة احتساب الضريبة <HelpTip text="'شامل الضريبة' = السعر اللي كتبته للمنتج يحتوي الضريبة داخله (شائع بالإمارات). 'تُضاف على السعر' = الضريبة بتنضاف فوق السعر عند الدفع." /></label>
                  <select value={settings.vatIncluded ? "included" : "added"} onChange={e => setSettings(s => ({ ...s, vatIncluded: e.target.value === "included" }))} style={{ ...inputBase, cursor: "pointer" }} onFocus={focusIn} onBlur={focusOut}>
                    <option value="included">السعر شامل الضريبة (مدمجة)</option>
                    <option value="added">تُضاف على السعر (منفصلة)</option>
                  </select>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>المعتاد بالإمارات: شامل الضريبة</div>
                </div>
              </div>
              {settings.vatEnabled && (
                <div style={{ marginTop: 14, padding: "12px 16px", background: "#FFFBEB", borderRadius: 10, border: "1.5px solid #FDE68A", fontSize: 13, color: "#92400E", lineHeight: 1.7 }}>
                  💡 <b>مثال:</b> منتج بـ 100 درهم، ضريبة {settings.vatPercent || 0}%:
                  <br />
                  {settings.vatIncluded
                    ? `السعر 100 شامل ضريبة ${((100 * (settings.vatPercent || 0)) / (100 + (settings.vatPercent || 0))).toFixed(2)} درهم`
                    : `السعر 100 + ضريبة ${((100 * (settings.vatPercent || 0)) / 100).toFixed(2)} = ${(100 + (100 * (settings.vatPercent || 0)) / 100).toFixed(2)} درهم`}
                </div>
              )}
            </AdvCard>
            </div>

            {/* روابط السوشيال */}
            <div id="sec-social" style={{ ...CARD, display: visibleSettingsSections.has("sec-social") ? "block" : "none" }}>
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

            {/* بكسلات التحليلات */}
            <div id="sec-pixels" style={{ display: visibleSettingsSections.has("sec-pixels") ? "block" : "none" }}>
            <AdvCard title="بكسلات التتبع والتحليلات" icon="📊" subtitle="Facebook / Google / TikTok — للتسويق والإعلانات"
              open={openAdv.pixels} onToggle={() => toggleAdv("pixels")}>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
                الصق ID فقط (بدون <code>https://</code> أو أكواد JavaScript). الكود يُحمّل تلقائياً للزوار.
              </p>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={lbl}>🔵 Facebook/Meta Pixel ID <HelpTip text="رقم بيربط متجرك مع إعلانات فيسبوك وإنستغرام، يتبع زياراتك ومبيعاتك." title="ما هو Pixel؟" /></label>
                  <input placeholder="1234567890123456" value={settings.fbPixelId || ""} onChange={e => setSettings(s => ({ ...s, fbPixelId: e.target.value.trim() }))} style={{ ...inputBase, direction: "ltr" }} onFocus={focusIn} onBlur={focusOut} />
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>من Meta Business → Events Manager</div>
                </div>
                <div>
                  <label style={lbl}>🟠 Google Analytics (GA4) Measurement ID <HelpTip text="بيتابع زوّار موقعك من جوجل (كم زيارة، من وين، وش عملوا)." title="Google Analytics" /></label>
                  <input placeholder="G-XXXXXXXXXX" value={settings.gaMeasurementId || ""} onChange={e => setSettings(s => ({ ...s, gaMeasurementId: e.target.value.trim() }))} style={{ ...inputBase, direction: "ltr" }} onFocus={focusIn} onBlur={focusOut} />
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>من analytics.google.com → Admin → Data Streams</div>
                </div>
                <div>
                  <label style={lbl}>⚫ TikTok Pixel ID <HelpTip text="بيربط متجرك مع إعلانات تيك توك، ويتبع المبيعات من الإعلانات." title="TikTok Pixel" /></label>
                  <input placeholder="ABCDEFGHIJ1234567890" value={settings.tiktokPixelId || ""} onChange={e => setSettings(s => ({ ...s, tiktokPixelId: e.target.value.trim() }))} style={{ ...inputBase, direction: "ltr" }} onFocus={focusIn} onBlur={focusOut} />
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>من TikTok Ads Manager → Assets → Events</div>
                </div>
              </div>
            </AdvCard>
            </div>

            {/* إشعارات الطلبات للأدمن */}
            <div id="sec-notify" style={{ display: visibleSettingsSections.has("sec-notify") ? "block" : "none" }}>
            <AdvCard title="إشعارات الطلبات" icon="📬" subtitle="إرسال تلقائي لكل طلب جديد — بدون فتح نوافذ"
              open={openAdv.notify} onToggle={() => toggleAdv("notify")}>

              <div style={{ background: "#F0F9FF", border: "1.5px solid #BAE6FD", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#075985", lineHeight: 1.7 }}>
                💡 <b>اختر طريقة وحدة أو كلهم.</b> كل طلب جديد بيبعت إشعار تلقائي عالسيرفر — ما في داعي يفتح الواتساب.
              </div>

              {/* 1) Webhook URL */}
              <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #F1F5F9" }}>
                <h4 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 800, color: "#0F172A" }}>
                  🪝 Webhook URL
                  <HelpTip text="رابط الويب هوك — بيستقبل كل طلب كـ JSON. تستخدمه مع Zapier / Make / n8n / Discord / Slack — وتوصله لأي خدمة تحبها." title="ما هو Webhook؟" />
                </h4>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748B" }}>
                  الأسهل: سجّل مجاناً بـ Zapier أو Make، اعمل webhook، وحط الرابط هون.
                </p>
                <input
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={settings.adminWebhookUrl || ""}
                  onChange={e => setSettings(s => ({ ...s, adminWebhookUrl: e.target.value.trim() }))}
                  style={{ ...inputBase, direction: "ltr" }}
                  onFocus={focusIn} onBlur={focusOut}
                />
              </div>

              {/* 2) WhatsApp Cloud API */}
              <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #F1F5F9" }}>
                <h4 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 800, color: "#0F172A" }}>
                  💬 WhatsApp Cloud API (Meta) <span style={{ fontSize: 10, fontWeight: 700, background: "#ECFDF5", color: "#065F46", borderRadius: 6, padding: "2px 6px", marginInlineStart: 6 }}>مجاني</span>
                  <HelpTip text="رسالة WhatsApp مباشرة لرقمك لأي طلب جديد. تحتاج حساب WhatsApp Business + تطبيق على Meta Business Platform." title="WhatsApp Cloud API" />
                </h4>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748B" }}>
                  سجّل بـ <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener" style={{ color: "#6366F1" }}>developers.facebook.com</a> — اعمل WhatsApp App — بياخد Token + Phone ID.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="admin-2col">
                  <div>
                    <label style={lbl}>Access Token</label>
                    <input
                      placeholder="EAAxxxx..."
                      value={settings.waCloudToken || ""}
                      onChange={e => setSettings(s => ({ ...s, waCloudToken: e.target.value.trim() }))}
                      style={{ ...inputBase, direction: "ltr", fontSize: 12 }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Phone Number ID</label>
                    <input
                      placeholder="123456789012345"
                      value={settings.waCloudPhoneId || ""}
                      onChange={e => setSettings(s => ({ ...s, waCloudPhoneId: e.target.value.trim() }))}
                      style={{ ...inputBase, direction: "ltr", fontSize: 12 }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={lbl}>رقم الأدمن (مع 971) <HelpTip text="الرقم اللي رح توصله الإشعارات. لازم يكون مرتبط بحساب واتساب، مع رمز الدولة (مثلاً 971585446473)." /></label>
                    <input
                      placeholder="971585446473"
                      value={settings.waAdminPhone || ""}
                      onChange={e => setSettings(s => ({ ...s, waAdminPhone: e.target.value.trim() }))}
                      style={{ ...inputBase, direction: "ltr" }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  </div>
                </div>
              </div>

              {/* 3) Telegram */}
              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 800, color: "#0F172A" }}>
                  ✈️ Telegram Bot <span style={{ fontSize: 10, fontWeight: 700, background: "#ECFDF5", color: "#065F46", borderRadius: 6, padding: "2px 6px", marginInlineStart: 6 }}>مجاني + أسهل</span>
                  <HelpTip text="الأسهل من الكل. اعمل بوت جديد عن طريق @BotFather على تيليغرام، خذ التوكن، وابعت رسالة للبوت أول شي، بعدين ادخل على /getUpdates عشان تاخد chat_id." title="Telegram Bot" />
                </h4>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748B" }}>
                  الأسرع والأسهل: افتح تيليغرام، روح عـ <b>@BotFather</b>، اعمل بوت، خذ التوكن.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="admin-2col">
                  <div>
                    <label style={lbl}>Bot Token</label>
                    <input
                      placeholder="1234567890:ABC-DEF..."
                      value={settings.telegramBotToken || ""}
                      onChange={e => setSettings(s => ({ ...s, telegramBotToken: e.target.value.trim() }))}
                      style={{ ...inputBase, direction: "ltr", fontSize: 12 }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Chat ID</label>
                    <input
                      placeholder="123456789"
                      value={settings.telegramChatId || ""}
                      onChange={e => setSettings(s => ({ ...s, telegramChatId: e.target.value.trim() }))}
                      style={{ ...inputBase, direction: "ltr", fontSize: 12 }}
                      onFocus={focusIn} onBlur={focusOut}
                    />
                  </div>
                </div>
              </div>
            </AdvCard>
            </div>

            {/* حالة الحفظ التلقائي + زر احتياطي */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 18px", background: "#F8FAFC", borderRadius: 14, border: "1px solid #E2E8F0" }}>
              <span style={{ fontSize: 20 }}>
                {autoSaveState === "saving" ? "⏳" : autoSaveState === "saved" ? "✅" : autoSaveState === "error" ? "⚠️" : autoSaveState === "dirty" ? "✏️" : "💾"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#0F172A" }}>
                  {autoSaveState === "saving" ? "جاري الحفظ..." :
                   autoSaveState === "saved" ? "تم الحفظ" :
                   autoSaveState === "error" ? "فشل الحفظ" :
                   autoSaveState === "dirty" ? "تغييرات غير محفوظة" :
                   "الحفظ التلقائي مفعّل"}
                </div>
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                  كل تغيير بيتحفظ تلقائياً بعد ثانية
                </div>
              </div>
              <button onClick={handleSaveSettings} style={{ background: "#EEF2FF", color: "#6366F1", border: "none", borderRadius: 10, padding: "9px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                💾 حفظ الآن
              </button>
            </div>

            {/* نسخ احتياطي */}
            <div id="sec-backup" style={{ display: visibleSettingsSections.has("sec-backup") ? "block" : "none" }}>
              <BackupCard />
            </div>

            {/* خطر */}
            <div id="sec-danger" style={{ display: visibleSettingsSections.has("sec-danger") ? "block" : "none" }}>
            <AdvCard title="منطقة الخطر" icon="🚨" subtitle="حذف جماعي — إجراءات لا يمكن التراجع عنها"
              open={openAdv.danger} onToggle={() => toggleAdv("danger")} danger>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#FEF2F2", borderRadius: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>حذف جميع المنتجات ({stats.products})</div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>لا يمكن التراجع عن هذا الإجراء</div>
                  </div>
                  <button onClick={() => setDangerModal({
                    title: `حذف جميع المنتجات (${stats.products})`,
                    message: `رح يتم حذف ${stats.products} منتج من المتجر نهائياً. هذا الإجراء لا يمكن التراجع عنه.`,
                    requiredText: "حذف المنتجات",
                    onConfirm: async () => {
                      setDangerModal(m => ({ ...m, busy: true }));
                      try { await Promise.all(products.map(p => deleteProduct(p.id))); await refreshProducts(); setDangerModal(null); alert("✅ تم حذف جميع المنتجات"); }
                      catch { setDangerModal(m => ({ ...m, busy: false })); alert("❌ فشل الحذف"); }
                    }
                  })}
                    style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                    🗑️ حذف الكل
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#FEF2F2", borderRadius: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>حذف جميع الأقسام ({stats.categories})</div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>سيؤثر على ظهور المنتجات</div>
                  </div>
                  <button onClick={() => setDangerModal({
                    title: `حذف جميع الأقسام (${stats.categories})`,
                    message: `رح يتم حذف ${stats.categories} قسم. المنتجات المرتبطة فيها ما رح تظهر بصفحات الأقسام.`,
                    requiredText: "حذف الأقسام",
                    onConfirm: async () => {
                      setDangerModal(m => ({ ...m, busy: true }));
                      try { await Promise.all(categories.map(c => deleteCategory(c.id))); await refreshCategories(); setDangerModal(null); alert("✅ تم حذف جميع الأقسام"); }
                      catch { setDangerModal(m => ({ ...m, busy: false })); alert("❌ فشل الحذف"); }
                    }
                  })}
                    style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                    🗑️ حذف الكل
                  </button>
                </div>
              </div>
            </AdvCard>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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
                <div>
                  <label style={lbl}>الوزن (كغ)</label>
                  <input type="number" min="0" step="0.01" value={prodForm.weight ?? ""} onChange={e => setProdForm(f => ({ ...f, weight: e.target.value }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
              </div>
              <div>
                <label style={lbl}>اسم الماركة</label>
                <input placeholder="مثال: Nike, Samsung..." value={prodForm.brand || ""} onChange={e => setProdForm(f => ({ ...f, brand: e.target.value }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={lbl}>الوصف</label>
                <textarea rows={3} value={prodForm.description || ""} onChange={e => setProdForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputBase, resize: "vertical" }} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={lbl}>الشارات (مفصولة بفاصلة)</label>
                <input value={prodForm.badges || ""} onChange={e => setProdForm(f => ({ ...f, badges: e.target.value }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
              </div>

              {/* SEO fields */}
              <div style={{ background: "#F8FAFF", border: "1.5px solid #E0E7FF", borderRadius: 12, padding: "14px", display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>🔎 SEO</div>
                <div>
                  <label style={lbl}>Meta Title</label>
                  <input value={prodForm.metaTitle || ""} onChange={e => setProdForm(f => ({ ...f, metaTitle: e.target.value }))} maxLength={70} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>Meta Description</label>
                  <textarea value={prodForm.metaDescription || ""} onChange={e => setProdForm(f => ({ ...f, metaDescription: e.target.value }))} maxLength={170} rows={2} style={{ ...inputBase, resize: "vertical" }} onFocus={focusIn} onBlur={focusOut} />
                </div>
              </div>
              <div>
                <label style={lbl}>رابط الصورة</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={prodForm.image || ""} onChange={e => setProdForm(f => ({ ...f, image: e.target.value }))} style={{ ...inputBase, flex: 1, direction: "ltr", fontSize: 13 }} onFocus={focusIn} onBlur={focusOut} />
                  <label style={{ background: "#EEF2FF", color: "#6366F1", border: "1.5px solid #6366F1", borderRadius: r.md, padding: "10px 14px", fontWeight: 700, cursor: prodUploading ? "wait" : "pointer", fontSize: 13, whiteSpace: "nowrap", opacity: prodUploading ? 0.6 : 1 }}>
                    {prodUploading ? "⏳ جاري الرفع..." : "📷 رفع"}
                    <input type="file" accept="image/*" disabled={prodUploading} style={{ display: "none" }} onChange={async e => { const f = e.target.files?.[0]; if (f) { const url = await handleImageUpload(f, setProdUploading); if (url) setProdForm(fr => ({ ...fr, image: url })); e.target.value = ""; } }} />
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

      {/* ════════ معالج الإعداد الأولي ════════ */}
      {showWizard && (
        <SetupWizard
          initialSettings={settings || {}}
          onClose={() => setShowWizard(false)}
          onSave={async (data) => {
            const merged = { ...settings, ...data };
            setSettings(merged);
            try { await saveSettings(merged); } catch {}
          }}
        />
      )}

      {/* ════════ مودال تأكيد الإجراءات الخطرة ════════ */}
      <DangerConfirm
        open={!!dangerModal}
        title={dangerModal?.title || ""}
        message={dangerModal?.message || ""}
        requiredText={dangerModal?.requiredText || "حذف"}
        busy={!!dangerModal?.busy}
        onCancel={() => !dangerModal?.busy && setDangerModal(null)}
        onConfirm={() => dangerModal?.onConfirm?.()}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   RatingsModeration — تبويب مراجعة التقييمات
   ════════════════════════════════════════════════════════════════ */
function RatingsModeration({ products }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // pending | approved | all
  const [busyKey, setBusyKey] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAllRatings();
      setRatings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const productName = (id) => {
    const p = products.find(x => String(x.id) === String(id));
    return p?.name || `منتج ${id}`;
  };

  const filtered = ratings.filter(r => {
    if (filter === "pending")  return r.approved !== true;
    if (filter === "approved") return r.approved === true;
    return true;
  });

  const act = async (r, action) => {
    const key = `${r.productId}:${r.userId}`;
    setBusyKey(key);
    try {
      if (action === "approve") await moderateRating(r.productId, r.userId, true);
      if (action === "reject")  await moderateRating(r.productId, r.userId, false);
      if (action === "delete")  {
        if (!confirm("حذف التقييم نهائياً؟")) { setBusyKey(""); return; }
        await adminDeleteRating(r.productId, r.userId);
      }
      await load();
    } catch (e) {
      alert("❌ فشل العملية: " + (e.message || ""));
    } finally {
      setBusyKey("");
    }
  };

  const counts = {
    pending:  ratings.filter(r => r.approved !== true).length,
    approved: ratings.filter(r => r.approved === true).length,
    all:      ratings.length,
  };

  return (
    <div style={{ display: "grid", gap: 18, animation: "fadeUp .4s ease both" }}>
      {/* فلاتر */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { key: "pending",  label: `⏳ قيد المراجعة (${counts.pending})`,  col: "#F59E0B", bg: "#FFFBEB" },
          { key: "approved", label: `✅ مقبولة (${counts.approved})`,        col: "#10B981", bg: "#ECFDF5" },
          { key: "all",      label: `📋 الكل (${counts.all})`,               col: "#64748B", bg: "#F1F5F9" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{
              padding: "10px 18px", borderRadius: 12,
              background: filter === f.key ? f.col : f.bg,
              color: filter === f.key ? "#fff" : f.col,
              border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer",
              fontFamily: "'Tajawal',sans-serif",
            }}>
            {f.label}
          </button>
        ))}
        <button onClick={load}
          style={{ padding: "10px 14px", borderRadius: 12, background: "#EEF2FF", color: "#6366F1", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", marginInlineStart: "auto" }}>
          🔄 تحديث
        </button>
      </div>

      {/* القائمة */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>⏳ جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "#fff", borderRadius: 16, border: "2px dashed #E2E8F0" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>⭐</div>
          <div style={{ color: "#64748B", fontWeight: 700 }}>
            {filter === "pending" ? "لا توجد تقييمات قيد المراجعة" : "لا توجد تقييمات"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map(r => {
            const key = `${r.productId}:${r.userId}`;
            const busy = busyKey === key;
            return (
              <div key={key} style={{
                background: "#fff", borderRadius: 14,
                border: `1.5px solid ${r.approved ? "#BBF7D0" : "#FDE68A"}`,
                padding: "16px 18px", boxShadow: shadow.sm,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#0F172A" }}>
                      {r.name} — {"⭐".repeat(r.stars || 0)}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
                      على: <b>{productName(r.productId)}</b>
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, direction: "ltr", textAlign: "right" }}>
                      {r.userId} · {r.date ? new Date(r.date).toLocaleString("ar-AE") : ""}
                    </div>
                  </div>
                  <span style={{
                    background: r.approved ? "#ECFDF5" : "#FFFBEB",
                    color: r.approved ? "#10B981" : "#F59E0B",
                    borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800,
                  }}>
                    {r.approved ? "✅ مقبول" : "⏳ قيد المراجعة"}
                  </span>
                </div>
                {r.comment && (
                  <div style={{
                    background: "#F8FAFC", borderRadius: 10, padding: "10px 14px",
                    fontSize: 13, color: "#334155", marginTop: 8, lineHeight: 1.6,
                  }}>
                    {r.comment}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {!r.approved && (
                    <button disabled={busy} onClick={() => act(r, "approve")}
                      style={{ background: "#10B981", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: busy ? "wait" : "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                      ✅ قبول
                    </button>
                  )}
                  {r.approved && (
                    <button disabled={busy} onClick={() => act(r, "reject")}
                      style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: busy ? "wait" : "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                      ⏸️ إخفاء
                    </button>
                  )}
                  <button disabled={busy} onClick={() => act(r, "delete")}
                    style={{ background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 10, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: busy ? "wait" : "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                    🗑️ حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═════════ مكوّن السلات المهجورة ═════════ */
function AbandonedCarts({ settings }) {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/abandoned-carts")
      .then(data => setCarts(Array.isArray(data) ? data : []))
      .catch(() => setCarts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!confirm("حذف هذه السلة المهجورة؟")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/abandoned-carts/admin/${encodeURIComponent(id)}`, { method: "DELETE" });
      setCarts(cs => cs.filter(c => c.id !== id));
    } catch { alert("فشل الحذف"); }
    finally { setBusy(false); }
  };

  const waFollow = (c) => {
    const phone = String(c.customer?.phone || c.id || "").replace(/\D/g, "");
    if (!phone) return alert("لا يوجد رقم هاتف");
    const itemsTxt = (c.items || []).map(it => `• ${it.name} × ${it.qty}`).join("%0A");
    const storeName = settings?.storeName || "كشخة";
    const name = c.customer?.name ? `مرحباً ${c.customer.name}،` : "مرحباً،";
    const msg = `${name}%0A%0Aلاحظنا أنك تركت سلتك معنا في *${storeName}* 🛍️%0A%0Aالمنتجات:%0A${itemsTxt}%0A%0Aالإجمالي: ${fmt(c.subtotal || 0)}%0A%0Aهل نساعدك في إتمام الطلب؟ 💜`;
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const fmtTime = (iso) => {
    try {
      const d = new Date(iso);
      const mins = Math.floor((Date.now() - d.getTime()) / 60000);
      if (mins < 1) return "الآن";
      if (mins < 60) return `قبل ${mins} دقيقة`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `قبل ${hrs} ساعة`;
      const days = Math.floor(hrs / 24);
      return `قبل ${days} يوم`;
    } catch { return ""; }
  };

  return (
    <div style={{ animation: "fadeUp .4s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontWeight: 900, fontSize: 22, color: "#0F172A" }}>🛒 السلات المهجورة</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={async () => {
            const withEmail = carts.filter(c => c.customer?.email).length;
            if (!withEmail) return alert("لا يوجد سلات معها بريد إلكتروني");
            if (!window.confirm(`إرسال تذكير لـ ${withEmail} عميل؟`)) return;
            setBusy(true);
            try {
              const res = await apiFetch("/api/abandoned-carts/admin/remind-all", {
                method: "POST",
                body: { storeUrl: window.location.origin, maxAgeHours: 168 },
              });
              alert(`✅ تم إرسال ${res.sent} تذكير\n⚠️ متخطّى (بدون إيميل): ${res.skipped}\n❌ فشل: ${res.failed}`);
              load();
            } catch (e) {
              alert("❌ " + e.message);
            } finally { setBusy(false); }
          }} disabled={busy}
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: busy ? "wait" : "pointer", fontFamily: "'Tajawal',sans-serif", boxShadow: "0 4px 12px rgba(245,158,11,.3)" }}>
            ✉️ إرسال تذكير للكل
          </button>
          <button onClick={load} style={{ background: "#EEF2FF", color: "#6366F1", border: "1.5px solid #C7D2FE", borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
            🔄 تحديث
          </button>
        </div>
      </div>

      <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#B45309", marginBottom: 14 }}>
        💡 تواصل مع العميل عبر واتساب لاستعادة الطلب. السلة تُحذف تلقائياً عند إتمام الطلب.
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>جاري التحميل...</div>}

      {!loading && carts.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 20, border: "2px dashed #E2E8F0" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>✨</div>
          <div style={{ fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>لا توجد سلات مهجورة</div>
          <div style={{ fontSize: 13, color: "#94A3B8" }}>كل العملاء أكملوا طلباتهم 🎉</div>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {carts.map(c => (
          <div key={c.id} style={{ ...CARD, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A" }}>
                  {c.customer?.name || "عميل غير معروف"}
                </div>
                <div style={{ fontSize: 12, color: "#64748B", direction: "ltr", display: "inline-block", marginTop: 3 }}>
                  {c.customer?.phone || c.id}
                </div>
                {c.customer?.email && (
                  <div style={{ fontSize: 11, color: "#94A3B8", direction: "ltr", marginTop: 2 }}>
                    {c.customer.email}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{fmtTime(c.updatedAt)}</div>
                <div style={{ fontWeight: 900, color: "#6366F1", marginTop: 2 }}>{fmt(c.subtotal || 0)}</div>
              </div>
            </div>

            <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
              {(c.items || []).map((it, i) => (
                <div key={i} style={{ fontSize: 13, color: "#334155", display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span>• {it.name} × {it.qty}</span>
                  <span style={{ color: "#64748B" }}>{fmt((Number(it.price) || 0) * (Number(it.qty) || 1))}</span>
                </div>
              ))}
            </div>

            {c.lastReminderAt && (
              <div style={{ fontSize: 11, color: "#0284C7", marginBottom: 8 }}>
                ✉️ آخر تذكير: {fmtTime(c.lastReminderAt)}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => waFollow(c)}
                style={{ flex: 1, background: "#25D366", color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                💬 متابعة واتساب
              </button>
              {c.customer?.email && (
                <button disabled={busy} onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await apiFetch(`/api/abandoned-carts/admin/${encodeURIComponent(c.id)}/remind`, {
                      method: "POST",
                      body: { storeUrl: window.location.origin },
                    });
                    alert(`✅ تم إرسال إيميل تذكير إلى ${res.sentTo}`);
                    load();
                  } catch (e) {
                    alert("❌ " + e.message);
                  } finally { setBusy(false); }
                }}
                  style={{ background: "#EEF2FF", color: "#6366F1", border: "1.5px solid #C7D2FE", borderRadius: 10, padding: "10px 14px", fontWeight: 800, fontSize: 13, cursor: busy ? "wait" : "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                  ✉️ إيميل تذكير
                </button>
              )}
              <button disabled={busy} onClick={() => del(c.id)}
                style={{ background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontWeight: 800, fontSize: 13, cursor: busy ? "wait" : "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                🗑️ حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════ مناطق الشحن ════════════════════ */
const EMIRATE_OPTS = [
  { value: "dubai", label: "دبي" },
  { value: "abu-dhabi", label: "أبوظبي" },
  { value: "sharjah", label: "الشارقة" },
  { value: "ajman", label: "عجمان" },
  { value: "umm-al-quwain", label: "أم القيوين" },
  { value: "ras-al-khaimah", label: "رأس الخيمة" },
  { value: "fujairah", label: "الفجيرة" },
];

function ShippingZonesEditor({ settings, setSettings, embedded = false }) {
  const parseZ = () => {
    try { return JSON.parse(settings.shippingZones || "[]") || []; } catch { return []; }
  };
  const zones = parseZ();

  const save = (next) => {
    setSettings((s) => ({ ...s, shippingZones: JSON.stringify(next) }));
  };

  const addZone = () => save([...zones, { name: "منطقة جديدة", emirates: [], fee: 15, freeOver: 200, perKg: 0 }]);
  const updateZone = (i, patch) => save(zones.map((z, idx) => (idx === i ? { ...z, ...patch } : z)));
  const delZone = (i) => save(zones.filter((_, idx) => idx !== i));
  const toggleEmirate = (i, val) => {
    const z = zones[i];
    const list = new Set(z.emirates || []);
    list.has(val) ? list.delete(val) : list.add(val);
    updateZone(i, { emirates: Array.from(list) });
  };

  const Wrapper = embedded ? "div" : "div";
  const wrapperStyle = embedded ? {} : { background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: shadow.md, padding: "24px" };

  return (
    <Wrapper style={wrapperStyle}>
      {!embedded && <h3 style={{ fontWeight: 800, fontSize: 17, color: "#0F172A", marginBottom: 8 }}>🚚 مناطق الشحن (حسب الإمارة + الوزن)</h3>}
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
        قسّم الإمارات لمناطق برسوم مختلفة. لو فضيت المناطق، بيشتغل الشحن الثابت من الأعلى.
      </p>

      {zones.map((z, i) => (
        <div key={i} style={{ border: "1.5px solid #E0E7FF", borderRadius: 14, padding: "16px", marginBottom: 12, background: "#F8FAFF" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
            <input value={z.name} onChange={(e) => updateZone(i, { name: e.target.value })}
              placeholder="اسم المنطقة"
              style={{ flex: 1, border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "8px 12px", fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal',sans-serif", outline: "none" }} />
            <button onClick={() => delZone(i)} style={{ background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>✕ حذف</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>رسوم الشحن الأساسية (درهم)</label>
              <input type="number" min="0" value={z.fee ?? 0} onChange={(e) => updateZone(i, { fee: Number(e.target.value) || 0 })} style={inputBase} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>شحن مجاني فوق (درهم)</label>
              <input type="number" min="0" value={z.freeOver ?? 0} onChange={(e) => updateZone(i, { freeOver: Number(e.target.value) || 0 })} style={inputBase} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>تكلفة كل كغ إضافي (درهم)</label>
              <input type="number" min="0" step="0.5" value={z.perKg ?? 0} onChange={(e) => updateZone(i, { perKg: Number(e.target.value) || 0 })} style={inputBase} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, marginBottom: 6 }}>الإمارات المشمولة</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EMIRATE_OPTS.map((em) => {
                const active = (z.emirates || []).includes(em.value);
                return (
                  <button key={em.value} type="button" onClick={() => toggleEmirate(i, em.value)}
                    style={{ background: active ? "#6366F1" : "#fff", color: active ? "#fff" : "#334155", border: `1.5px solid ${active ? "#6366F1" : "#E2E8F0"}`, borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                    {em.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      <button onClick={addZone} style={{ background: "#EEF2FF", color: "#6366F1", border: "1.5px dashed #A5B4FC", borderRadius: 12, padding: "10px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
        ➕ إضافة منطقة شحن
      </button>
    </Wrapper>
  );
}

/* ════════════════════ النسخ الاحتياطي ════════════════════ */
function BackupCard() {
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastBackup, setLastBackup] = useState(() => localStorage.getItem("lastBackupAt") || "");

  useEffect(() => {
    apiFetch("/api/backup/stats").then(setStats).catch(() => {});
  }, []);

  const runBackup = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { API_URL, getToken } = await import("../api");
      const res = await fetch(`${API_URL}/api/backup`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`فشل: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kashkha-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const now = new Date().toISOString();
      localStorage.setItem("lastBackupAt", now);
      setLastBackup(now);
      alert("✅ تم تحميل النسخة الاحتياطية بنجاح");
    } catch (e) {
      alert("❌ فشل: " + (e.message || ""));
    } finally {
      setBusy(false);
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString("ar-AE", { dateStyle: "medium", timeStyle: "short" }); } catch { return iso; }
  };

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #BFDBFE", padding: "24px" }}>
      <h3 style={{ fontWeight: 800, fontSize: 17, color: "#0F172A", marginBottom: 6 }}>💾 النسخ الاحتياطي (يدوي)</h3>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
        حمّل ملف JSON يحوي كل بيانات المتجر (المنتجات، الطلبات، العملاء، الأقسام، الكوبونات، الإعدادات). اضغط الزر كلما بدك نسخة جديدة.
      </p>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 18 }}>
          {[
            { k: "products", label: "منتجات", icon: "🏷️" },
            { k: "categories", label: "أقسام", icon: "📂" },
            { k: "orders", label: "طلبات", icon: "📦" },
            { k: "users", label: "عملاء", icon: "👥" },
            { k: "coupons", label: "كوبونات", icon: "🎟️" },
            { k: "ratings", label: "تقييمات", icon: "⭐" },
            { k: "abandoned_carts", label: "سلات مهجورة", icon: "🛒" },
          ].map((x) => (
            <div key={x.k} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 22 }}>{x.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 18, color: "#0F172A", marginTop: 4 }}>{stats[x.k] ?? 0}</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>{x.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={runBackup} disabled={busy}
          style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)", color: "#fff", border: "none", borderRadius: 12, padding: "13px 26px", fontWeight: 900, fontSize: 15, cursor: busy ? "wait" : "pointer", boxShadow: "0 6px 16px rgba(14,165,233,.3)", fontFamily: "'Tajawal',sans-serif" }}>
          {busy ? "⏳ جاري التحميل..." : "⬇️ تحميل نسخة احتياطية الآن"}
        </button>
        <div style={{ fontSize: 12, color: "#64748B" }}>
          آخر نسخة من هذا المتصفح: <b style={{ color: "#0284C7" }}>{fmtDate(lastBackup)}</b>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: "12px 14px", background: "#FFFBEB", borderRadius: 10, border: "1.5px solid #FDE68A", fontSize: 12, color: "#92400E", lineHeight: 1.7 }}>
        💡 <b>نصيحة:</b> احفظ الملف على جوجل درايف أو خارجياً. كلمات سر المستخدمين محذوفة من الملف للأمان.
      </div>
    </div>
  );
}
