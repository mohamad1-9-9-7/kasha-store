import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { shadow, r, inputBase, btnPrimary, focusIn, focusOut, safeParse, slugify, fmt } from "../Theme";
import AdminLayout, { Card, Stat, SectionHeader, ADMIN } from "../components/AdminLayout";
import {
  IconHome, IconBox, IconTag, IconFolder, IconStar, IconCart, IconSettings,
  IconUsers, IconTicket, IconUpload, IconPlus, IconWallet, IconChart, IconTruck,
  IconAlert, IconClock, IconCheck, IconCheckCircle, IconImage, IconLayers,
  IconReceipt, IconSparkles, IconArrowRight, IconLock, IconDownload, IconShield,
} from "../components/Icons";
import { useCategories, addCategory, updateCategory, deleteCategory } from "../hooks/useCategories";
import { useProducts, updateProduct, replaceProduct, deleteProduct } from "../hooks/useProducts";
import { useSettings, saveSettings } from "../hooks/useSettings";
import { fetchAllRatings, moderateRating, adminDeleteRating } from "../hooks/useRatings";
import { useCoupons, saveCoupon, updateCoupon, deleteCoupon } from "../hooks/useCoupons";
import { apiFetch, clearAuth } from "../api";
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
const CARD  = { background: "#fff", borderRadius: 14, border: "1px solid #F1F5F9", boxShadow: "0 1px 2px rgba(15,23,42,.04)", padding: "20px" };
const emptyBox = { textAlign: "center", padding: "24px", color: "#94A3B8", background: "#FAFBFC", borderRadius: 10, border: "1px dashed #EEF0F4", fontSize: 13 };
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
  const location = useLocation();
  // Drive the active tab from ?tab= — the unified nav in AdminLayout sets this
  // via <Link>, so react-router updates `location.search` and we re-render.
  const tab = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get("tab") || "home";
  }, [location.search]);
  const setTab = (t) => {
    navigate(t && t !== "home" ? `/admin-dashboard?tab=${t}` : "/admin-dashboard");
  };

  /* بيانات */
  const { categories, refresh: refreshCategories } = useCategories();
  const { products, refresh: refreshProducts }     = useProducts();
  const [orders,     setOrders]     = useState([]);

  /* فورم الأقسام */
  const [catForm,  setCatForm]  = useState({ name: "", nameEn: "", image: "" });
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
  const [openAdv, setOpenAdv] = useState({ coupons: false, loyalty: false, zones: false, vat: false, pixels: false, notify: false, security: false, danger: false });
  const toggleAdv = (k) => setOpenAdv(s => ({ ...s, [k]: !s[k] }));

  /* مودال تأكيد الحذف الخطر */
  const [dangerModal, setDangerModal] = useState(null); // null | { title, message, onConfirm, busy }

  /* معالج الإعداد الأولي */
  const [showWizard, setShowWizard] = useState(false);

  /* بحث داخل الإعدادات */
  const [settingsQuery, setSettingsQuery] = useState("");
  const SETTINGS_NAV = [
    { id: "sec-store", icon: "🏪", label: "معلومات المتجر", keywords: "اسم متجر واتساب إعلان بريد عنوان" },
    { id: "sec-coupons", icon: "🎟️", label: "الكوبونات", keywords: "كوبون كوبونات خصم coupon code" },
    { id: "sec-loyalty", icon: "⭐", label: "نظام النقط", keywords: "loyalty نقط خصم استبدال ولاء" },
    { id: "sec-shipping", icon: "🚚", label: "الشحن والطلبات", keywords: "شحن مجاني رسوم حد أدنى طلب" },
    { id: "sec-zones", icon: "📍", label: "مناطق الشحن", keywords: "مناطق إمارات دبي أبوظبي وزن" },
    { id: "sec-vat", icon: "🧾", label: "ضريبة VAT", keywords: "ضريبة tax vat قيمة مضافة 5" },
    { id: "sec-social", icon: "📲", label: "روابط السوشيال", keywords: "إنستغرام تيك توك فيسبوك تويتر سوشيال" },
    { id: "sec-pixels", icon: "📊", label: "بكسلات التتبع", keywords: "facebook pixel google analytics tiktok بكسل تتبع" },
    { id: "sec-notify", icon: "📬", label: "إشعارات الطلبات", keywords: "webhook whatsapp telegram notify إشعار طلب" },
    { id: "sec-backup", icon: "💾", label: "النسخ الاحتياطي", keywords: "backup نسخ احتياطي تصدير استرجاع" },
    { id: "sec-security", icon: "🔐", label: "كلمة سر الأدمن", keywords: "كلمة سر مرور باسوورد password admin أدمن أمان security" },
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
  }, []);

  // Refresh orders whenever the admin lands back on the home tab — and on
  // window-focus while the home tab is visible — so KPIs (revenue, new
  // orders count, recent orders) reflect what's happening right now,
  // not whatever was there at first mount.
  useEffect(() => {
    if (tab !== "home") return;
    let cancelled = false;
    const load = () => apiFetch("/api/orders").then((data) => { if (!cancelled) setOrders(data); }).catch(() => {});
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [tab]);

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
      const payload = {
        name: catForm.name.trim(),
        nameEn: (catForm.nameEn || "").trim(),
        image: catForm.image,
      };
      if (catEdit !== null) {
        await updateCategory(catEdit, payload);
      } else {
        await addCategory(payload);
      }
      setCatForm({ name: "", nameEn: "", image: "" }); setCatEdit(null);
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

  /* ── فلاتر المنتجات المتقدمة ── */
  const [prodFilterCat, setProdFilterCat] = useState("");
  const [prodFilterStock, setProdFilterStock] = useState("all"); // all | in | low | out
  const [prodFilterVis, setProdFilterVis] = useState("all");     // all | shown | hidden
  const [prodFilterFeat, setProdFilterFeat] = useState("all");   // all | yes | no
  const [prodFilterSale, setProdFilterSale] = useState("all");   // all | yes | no
  const [prodPriceMin, setProdPriceMin] = useState("");
  const [prodPriceMax, setProdPriceMax] = useState("");
  const [prodSort, setProdSort] = useState("default");
  const [selectedProds, setSelectedProds] = useState(() => new Set());
  const [showProdFilters, setShowProdFilters] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const filteredProds = useMemo(() => {
    let arr = [...products];
    const q = prodSearch.trim().toLowerCase();
    if (q) arr = arr.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.nameEn || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q)
    );
    if (prodFilterCat) arr = arr.filter(p => p.category === prodFilterCat);
    if (prodFilterStock !== "all") {
      arr = arr.filter(p => {
        const s = Number(p.stock);
        if (!Number.isFinite(s)) return prodFilterStock === "in";
        if (prodFilterStock === "out") return s <= 0;
        if (prodFilterStock === "low") return s > 0 && s <= (p.lowStockThreshold || 5);
        if (prodFilterStock === "in")  return s > 0;
        return true;
      });
    }
    if (prodFilterVis === "shown")  arr = arr.filter(p => !p.hidden);
    if (prodFilterVis === "hidden") arr = arr.filter(p => !!p.hidden);
    if (prodFilterFeat === "yes") arr = arr.filter(p => !!p.featured);
    if (prodFilterFeat === "no")  arr = arr.filter(p => !p.featured);
    if (prodFilterSale === "yes") arr = arr.filter(p => Number(p.oldPrice) > Number(p.price));
    if (prodFilterSale === "no")  arr = arr.filter(p => !(Number(p.oldPrice) > Number(p.price)));
    const minN = prodPriceMin === "" ? -Infinity : Number(prodPriceMin);
    const maxN = prodPriceMax === "" ? Infinity  : Number(prodPriceMax);
    if (Number.isFinite(minN) || Number.isFinite(maxN)) {
      arr = arr.filter(p => { const pr = Number(p.price) || 0; return pr >= minN && pr <= maxN; });
    }

    // ترتيب
    if (prodSort === "name-asc")   arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (prodSort === "name-desc")  arr.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    if (prodSort === "price-asc")  arr.sort((a, b) => Number(a.price) - Number(b.price));
    if (prodSort === "price-desc") arr.sort((a, b) => Number(b.price) - Number(a.price));
    if (prodSort === "stock-asc")  arr.sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));
    if (prodSort === "stock-desc") arr.sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));
    if (prodSort === "newest")     arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (prodSort === "oldest")     arr.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    return arr;
  }, [products, prodSearch, prodFilterCat, prodFilterStock, prodFilterVis, prodFilterFeat, prodFilterSale, prodPriceMin, prodPriceMax, prodSort]);

  const activeProdFilters = useMemo(() => {
    const chips = [];
    if (prodFilterCat) chips.push({ label: `📂 ${prodFilterCat}`, clear: () => setProdFilterCat("") });
    if (prodFilterStock !== "all") chips.push({ label: `📦 ${prodFilterStock === "out" ? "نفد" : prodFilterStock === "low" ? "منخفض" : "متوفر"}`, clear: () => setProdFilterStock("all") });
    if (prodFilterVis !== "all") chips.push({ label: `👁️ ${prodFilterVis === "shown" ? "ظاهر" : "مخفي"}`, clear: () => setProdFilterVis("all") });
    if (prodFilterFeat !== "all") chips.push({ label: `⭐ ${prodFilterFeat === "yes" ? "مميّز" : "غير مميّز"}`, clear: () => setProdFilterFeat("all") });
    if (prodFilterSale !== "all") chips.push({ label: `🔥 ${prodFilterSale === "yes" ? "تخفيض" : "سعر عادي"}`, clear: () => setProdFilterSale("all") });
    if (prodPriceMin || prodPriceMax) chips.push({ label: `💰 ${prodPriceMin || 0} - ${prodPriceMax || "∞"}`, clear: () => { setProdPriceMin(""); setProdPriceMax(""); } });
    return chips;
  }, [prodFilterCat, prodFilterStock, prodFilterVis, prodFilterFeat, prodFilterSale, prodPriceMin, prodPriceMax]);

  const clearAllProdFilters = () => {
    setProdSearch(""); setProdFilterCat(""); setProdFilterStock("all"); setProdFilterVis("all");
    setProdFilterFeat("all"); setProdFilterSale("all"); setProdPriceMin(""); setProdPriceMax("");
    setProdSort("default");
  };

  /* ── اختيار جماعي وإجراءات ── */
  const toggleProdSelect = (id) => {
    setSelectedProds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAllProds = () => {
    setSelectedProds(prev => {
      if (prev.size === filteredProds.length) return new Set();
      return new Set(filteredProds.map(p => p.id));
    });
  };
  const bulkAction = async (action) => {
    if (selectedProds.size === 0) return;
    const ids = Array.from(selectedProds);
    if (action === "delete") {
      if (!window.confirm(`حذف ${ids.length} منتج نهائياً؟`)) return;
    }
    setBulkBusy(true);
    try {
      if (action === "delete") await Promise.all(ids.map(id => deleteProduct(id)));
      if (action === "hide")   await Promise.all(ids.map(id => updateProduct(id, { hidden: true })));
      if (action === "show")   await Promise.all(ids.map(id => updateProduct(id, { hidden: false })));
      if (action === "feat")   await Promise.all(ids.map(id => updateProduct(id, { featured: true })));
      if (action === "unfeat") await Promise.all(ids.map(id => updateProduct(id, { featured: false })));
      await refreshProducts();
      setSelectedProds(new Set());
    } catch (e) { alert("❌ فشل التنفيذ: " + (e.message || "")); }
    finally { setBulkBusy(false); }
  };

  /* ── تصدير CSV ── */
  const exportProdsCSV = () => {
    const rows = [["ID","Name","Name(EN)","SKU","Category","Brand","Price","Old Price","Stock","Hidden","Featured","Image"]];
    filteredProds.forEach(p => rows.push([
      p.id, p.name || "", p.nameEn || "", p.sku || "", p.category || "", p.brand || "",
      p.price || "", p.oldPrice || "", p.stock ?? "", p.hidden ? "yes" : "no",
      p.featured ? "yes" : "no", p.image || ""
    ]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `products-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  /* ── آخر الطلبات ── */
  const recentOrders = useMemo(() => [...orders].slice(-5).reverse(), [orders]);

  // Subtitle reflects active section so the sticky topbar always tells you where you are
  const TAB_TITLES = {
    home:      { title: "نظرة عامة",     subtitle: "ملخّص أداء المتجر اليوم" },
    cats:      { title: "إدارة الأقسام",   subtitle: "تنظيم تصنيفات منتجاتك" },
    products:  { title: "إدارة المنتجات", subtitle: `${stats.products} منتج · ${stats.outOfStock} نفد · ${stats.lowStock} منخفض` },
    ratings:   { title: "التقييمات",       subtitle: "مراجعة وموافقة تقييمات العملاء" },
    abandoned: { title: "السلات المهجورة", subtitle: "العملاء اللي ما أكملوا الطلب" },
    settings:  { title: "الإعدادات",        subtitle: "تخصيص متجرك ومحركات الدفع والشحن" },
  };
  const headInfo = TAB_TITLES[tab] || TAB_TITLES.home;

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        .prod-row { transition: background .15s; }
        .prod-row:hover { background: #F8FAFC!important; }
        .icon-btn { transition: transform .15s, opacity .15s; cursor: pointer; border: none; }
        .icon-btn:hover { transform: scale(1.1); opacity: .85; }
        .modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,.55); backdrop-filter:blur(4px); z-index:800; display:flex; align-items:center; justify-content:center; padding:20px; }
        .modal-box { background:#fff; border-radius:24px; padding:28px; width:100%; max-width:600px; max-height:90vh; overflow-y:auto; box-shadow:0 32px 80px rgba(0,0,0,.2); animation:fadeUp .3s ease both; }
        .adm-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .admin-2col { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; }
        .admin-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
        @media(max-width:1100px){ .adm-stats-grid { grid-template-columns: repeat(2,1fr); } }
        @media(max-width:900px){
          .admin-2col  { grid-template-columns: 1fr; }
          .admin-stats { grid-template-columns: repeat(2,1fr); }
        }
        @media(max-width:768px){
          .prod-table-wrap { overflow-x: auto; }
          .prod-hide-mobile { display: none !important; }
          .settings-body { grid-template-columns: 1fr !important; }
          .settings-sidebar { position: static !important; overflow-x: auto !important; }
        }
      `}</style>

      <AdminLayout
        title={headInfo.title}
        subtitle={headInfo.subtitle}
        badges={{ newOrders: stats.newOrders }}
      >
        {/* ════════════ الرئيسية ════════════ */}
        {tab === "home" && (
          <div style={{ display: "grid", gap: 20, animation: "fadeUp .4s ease both" }}>

            {/* الإحصاءات الرئيسية — صفّ نظيف بأيقونات SVG */}
            <div className="adm-stats-grid">
              <Stat icon={IconWallet} tone="default" label="الإيرادات (مسلّمة)"
                value={fmt(stats.revenue)}
                hint={stats.deliveredCount ? `${stats.deliveredCount} طلب مسلّم` : "لا مبيعات بعد"}
                trend={insights.growth} />
              <Stat icon={IconReceipt} tone="pink" label="إجمالي الطلبات"
                value={stats.orders}
                hint={`${stats.newOrders} جديدة · ${stats.processing} قيد المعالجة`} />
              <Stat icon={IconBox} tone="success" label="المنتجات"
                value={stats.products}
                hint={`${stats.categories} قسم`} />
              <Stat icon={IconAlert} tone={stats.outOfStock + stats.lowStock > 0 ? "danger" : "success"} label="حالة المخزون"
                value={stats.outOfStock + stats.lowStock}
                hint={`${stats.outOfStock} نفد · ${stats.lowStock} منخفض`} />
            </div>

            {/* ══ مهام اليوم ══ */}
            {todayTasks.length > 0 ? (
              <Card>
                <SectionHeader
                  title="يحتاج انتباهك"
                  hint={`${todayTasks.length} عنصر يحتاج إجراء`}
                />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                  {todayTasks.map((task, i) => {
                    const Inner = (
                      <>
                        <div style={{
                          width: 36, height: 36, borderRadius: 9,
                          background: task.bg, color: task.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {task.label.includes("جديدة") ? <IconReceipt size={18} /> :
                           task.label.includes("معالجة") ? <IconClock size={18} /> :
                           task.label.includes("نفد")  ? <IconBox size={18} /> :
                           task.label.includes("منخفض") ? <IconAlert size={18} /> :
                           task.label.includes("صورة")  ? <IconImage size={18} /> :
                           task.label.includes("قسم")   ? <IconFolder size={18} /> : <IconAlert size={18} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: ADMIN.text, lineHeight: 1.4 }}>{task.label}</div>
                          <div style={{ fontSize: 11, color: ADMIN.textMuted, marginTop: 2 }}>{task.count} {task.count === 1 ? "عنصر" : "عناصر"}</div>
                        </div>
                        <span style={{
                          background: task.color, color: "#fff", borderRadius: 999,
                          padding: "2px 10px", fontSize: 12, fontWeight: 800, flexShrink: 0,
                        }}>{task.count}</span>
                        <IconArrowRight size={14} style={{ color: ADMIN.textSubtle, transform: "scaleX(-1)" }} />
                      </>
                    );
                    const style = {
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "11px 14px", borderRadius: 10,
                      background: "#FAFBFC", border: "1px solid #EEF0F4",
                      cursor: "pointer", textDecoration: "none",
                      fontFamily: "'Tajawal',sans-serif",
                      transition: "border-color .15s, background .15s",
                    };
                    const hover = e => { e.currentTarget.style.borderColor = task.color; e.currentTarget.style.background = "#fff"; };
                    const unhover = e => { e.currentTarget.style.borderColor = "#EEF0F4"; e.currentTarget.style.background = "#FAFBFC"; };
                    return task.to ? (
                      <Link key={i} to={task.to} style={style} onMouseEnter={hover} onMouseLeave={unhover}>{Inner}</Link>
                    ) : (
                      <button key={i} onClick={() => setTab(task.tab)} style={{ ...style, width: "100%", textAlign: "inherit" }} onMouseEnter={hover} onMouseLeave={unhover}>{Inner}</button>
                    );
                  })}
                </div>
              </Card>
            ) : stats.products > 0 ? (
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 4px" }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 11,
                    background: "#ECFDF5", color: "#10B981",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <IconCheckCircle size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: ADMIN.text }}>كل شي تمام</div>
                    <div style={{ fontSize: 12, color: ADMIN.textMuted, marginTop: 2 }}>لا توجد مهام عاجلة الآن</div>
                  </div>
                </div>
              </Card>
            ) : null}

            {/* ── بطاقات تحليلات سريعة ── */}
            <div className="adm-stats-grid">
              <Stat icon={IconWallet} tone="default" label="متوسط قيمة الطلب"
                value={stats.aov > 0 ? fmt(stats.aov) : "—"}
                hint={stats.deliveredCount ? `من ${stats.deliveredCount} طلب مسلّم` : "لا طلبات مسلّمة"} />
              <Stat icon={IconChart} tone="success" label="أفضل يوم (الأسبوع)"
                value={insights.bestDay?.total > 0 ? insights.bestDay.label : "—"}
                hint={insights.bestDay?.total > 0 ? fmt(insights.bestDay.total) : "لا مبيعات"} />
              <Stat icon={IconSparkles} tone={insights.growth >= 0 ? "success" : "danger"} label="مقارنة بأمس"
                value={`${insights.growth >= 0 ? "+" : ""}${insights.growth.toFixed(0)}%`}
                hint={`اليوم ${fmt(insights.today)} • أمس ${fmt(insights.yesterday)}`} />
              <Stat icon={IconUsers} tone="warn" label="عملاء فريدين"
                value={insights.uniqueCustomers || 0}
                hint={`من إجمالي ${stats.orders} طلب`} />
            </div>

            {/* ── رسم الإيرادات الأسبوعية ── */}
            {(() => {
              const maxVal = Math.max(...weeklyRevenue.map(d => d.total), 1);
              const total7 = weeklyRevenue.reduce((s, d) => s + d.total, 0);
              return (
                <Card>
                  <SectionHeader
                    title="إيرادات آخر 7 أيام"
                    hint={`معدّل يومي ${fmt(insights.avgDaily)} • إجمالي ${fmt(total7)}`}
                  />
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140, paddingTop: 16 }}>
                    {weeklyRevenue.map((d, i) => {
                      const isBest = d === insights.bestDay && d.total > 0;
                      const h = Math.max((d.total / maxVal) * 100, d.total > 0 ? 8 : 4);
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: isBest ? "#10B981" : ADMIN.textMuted, opacity: d.total > 0 ? 1 : 0, height: 14 }}>
                            {d.total > 0 ? Number(d.total).toFixed(0) : ""}
                          </span>
                          <div style={{
                            width: "100%",
                            background: d.total > 0
                              ? (isBest ? "linear-gradient(180deg,#10B981,#059669)" : "linear-gradient(180deg,#6366F1,#8B5CF6)")
                              : "#F1F5F9",
                            borderRadius: "8px 8px 4px 4px",
                            height: `${h}%`, minHeight: 4,
                            transition: "height .8s cubic-bezier(.4,0,.2,1)",
                          }} />
                          <span style={{ fontSize: 11, color: ADMIN.textSubtle, fontWeight: 600 }}>{d.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })()}

            {/* ── أكثر المنتجات مبيعاً + مخطط الطلبات ── */}
            <div className="admin-2col" style={{ gridTemplateColumns: "1fr 1fr" }}>

              {/* أكثر المنتجات مبيعاً */}
              <Card>
                <SectionHeader title="الأكثر مبيعاً" hint="ترتيب المنتجات حسب الكمية المباعة" />
                {topProducts.length === 0 ? (
                  <div style={emptyBox}>لا توجد مبيعات بعد</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {topProducts.map((p, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "9px 12px", borderRadius: 10,
                        background: "#FAFBFC", border: "1px solid #EEF0F4",
                      }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 7,
                          background: i === 0 ? "#F59E0B" : i === 1 ? "#94A3B8" : i === 2 ? "#CD7F32" : "#EEF2FF",
                          color: i < 3 ? "#fff" : "#6366F1",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: 12, flexShrink: 0,
                        }}>{i + 1}</div>
                        <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: ADMIN.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                        <span style={{
                          background: ADMIN.accentBg, color: ADMIN.accent, borderRadius: 999,
                          padding: "2px 10px", fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>{p.qty}×</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* مخطط الطلبات حسب الحالة */}
              {orders.length > 0 && (() => {
                const statusCounts = Object.entries(STATUSES).map(([key, s]) => ({ ...s, key, count: orders.filter(o => o.status === key).length }));
                const max = Math.max(...statusCounts.map(s => s.count), 1);
                return (
                  <Card>
                    <SectionHeader title="توزيع الطلبات" hint="حسب الحالة الحالية" />
                    <div style={{ display: "grid", gap: 12 }}>
                      {statusCounts.map((s) => (
                        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 82, fontSize: 12, fontWeight: 600, color: ADMIN.textMuted, flexShrink: 0 }}>{s.label}</div>
                          <div style={{ flex: 1, height: 8, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${(s.count / max) * 100}%`,
                              background: s.col, borderRadius: 999,
                              transition: "width 1s ease",
                            }} />
                          </div>
                          <div style={{ width: 28, fontSize: 13, fontWeight: 800, color: s.col, textAlign: "center", flexShrink: 0 }}>{s.count}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })()}

            </div>{/* إغلاق admin-2col للمبيعات */}

            {/* آخر الطلبات + منتجات قليلة المخزون */}
            <div className="admin-2col">

              {/* آخر الطلبات */}
              <Card>
                <SectionHeader
                  title="آخر الطلبات"
                  hint={`${recentOrders.length} طلب أخير`}
                  action={
                    <Link to="/admin-orders" style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      color: ADMIN.accent, fontSize: 12, fontWeight: 700,
                      textDecoration: "none",
                    }}>
                      عرض الكل <IconArrowRight size={12} style={{ transform: "scaleX(-1)" }} />
                    </Link>
                  }
                />
                {recentOrders.length === 0 ? (
                  <div style={emptyBox}>لا توجد طلبات بعد</div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {recentOrders.map((o, i) => {
                      const st = STATUSES[o.status] || STATUSES.NEW;
                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 12px", borderRadius: 10,
                          background: "#FAFBFC", border: "1px solid #EEF0F4",
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.col, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: ADMIN.text }}>{o.customer?.name || "—"}</div>
                            <div style={{ fontSize: 11, color: ADMIN.textSubtle, fontFamily: "monospace" }}>{String(o.id || "").slice(0, 8)}</div>
                          </div>
                          <span style={{
                            background: st.bg, color: st.col, borderRadius: 6,
                            padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                          }}>{st.label}</span>
                          <span style={{ fontWeight: 700, color: ADMIN.text, fontSize: 13, whiteSpace: "nowrap" }}>{fmt(o.totals?.grandTotal || o.total || 0)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* منتجات قليلة المخزون */}
              <Card>
                <SectionHeader
                  title="مخزون منخفض"
                  hint={stats.lowStock === 0 ? "كل المنتجات متوفرة" : `${stats.lowStock} منتج يحتاج تجديد`}
                  action={stats.lowStock > 0 && (
                    <button
                      onClick={() => setShowLowStock(v => !v)}
                      style={{
                        background: "transparent", border: "none", cursor: "pointer",
                        color: ADMIN.accent, fontSize: 12, fontWeight: 700, fontFamily: "'Tajawal',sans-serif",
                      }}
                    >{showLowStock ? "إخفاء" : "عرض"}</button>
                  )}
                />
                {stats.lowStock === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#ECFDF5", color: "#059669", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                    <IconCheckCircle size={18} />
                    جميع المنتجات متوفرة
                  </div>
                ) : showLowStock ? (
                  <div className="adm-noscrollbar" style={{ display: "grid", gap: 6, maxHeight: 280, overflowY: "auto" }}>
                    {products.filter(p => Number.isFinite(p.stock) && p.stock <= (p.lowStockThreshold || 5) && p.stock > 0)
                      .sort((a, b) => a.stock - b.stock)
                      .map((p, i) => (
                        <Link key={i} to={`/product/${p.id}`} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px", borderRadius: 10,
                          background: "#FAFBFC", border: "1px solid #EEF0F4",
                          textDecoration: "none",
                        }}>
                          <div style={{ width: 32, height: 32, borderRadius: 7, overflow: "hidden", flexShrink: 0, background: "#fff", border: "1px solid #F1F5F9" }}>
                            {p.image
                              ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} />
                              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: ADMIN.textSubtle }}><IconImage size={14} /></div>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: ADMIN.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "#EF4444", fontWeight: 700, marginTop: 1 }}>بقي {p.stock} فقط</div>
                          </div>
                          <IconArrowRight size={14} style={{ color: ADMIN.textSubtle, transform: "scaleX(-1)" }} />
                        </Link>
                      ))}
                  </div>
                ) : null}
              </Card>
            </div>

            {/* إجراءات سريعة */}
            <Card>
              <SectionHeader title="إجراءات سريعة" hint="الاختصارات الأكثر استخداماً" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                {[
                  { icon: IconPlus,     label: "إضافة منتج",   to: "/add-product"      },
                  { icon: IconReceipt,  label: "إدارة الطلبات", to: "/admin-orders"     },
                  { icon: IconFolder,   label: "إدارة الأقسام", tab: "cats"             },
                  { icon: IconUsers,    label: "العملاء",       to: "/customers"        },
                  { icon: IconTicket,   label: "الكوبونات",     tab: "settings"          },
                  { icon: IconUpload,   label: "استيراد جماعي", to: "/bulk-import"      },
                  { icon: IconSettings, label: "الإعدادات",     tab: "settings"         },
                ].map((a, i) => {
                  const Ic = a.icon;
                  const sty = {
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 14px", borderRadius: 10,
                    background: "#FAFBFC", border: "1px solid #EEF0F4",
                    color: ADMIN.text, textDecoration: "none",
                    cursor: "pointer", fontFamily: "'Tajawal',sans-serif",
                    fontWeight: 600, fontSize: 13, textAlign: "inherit",
                    transition: "border-color .15s, color .15s, background .15s",
                  };
                  const hover  = e => { e.currentTarget.style.borderColor = ADMIN.accent; e.currentTarget.style.color = ADMIN.accent; e.currentTarget.style.background = "#fff"; };
                  const unhov  = e => { e.currentTarget.style.borderColor = "#EEF0F4";    e.currentTarget.style.color = ADMIN.text;   e.currentTarget.style.background = "#FAFBFC"; };
                  return a.to ? (
                    <Link key={i} to={a.to} style={sty} onMouseEnter={hover} onMouseLeave={unhov}>
                      <Ic size={17} /> {a.label}
                    </Link>
                  ) : (
                    <button key={i} onClick={() => setTab(a.tab)} style={{ ...sty, width: "100%" }} onMouseEnter={hover} onMouseLeave={unhov}>
                      <Ic size={17} /> {a.label}
                    </button>
                  );
                })}
              </div>
            </Card>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>اسم القسم (عربي) <span style={{ color: "#EF4444" }}>*</span></label>
                  <input placeholder="مثال: عطور" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>Name (English) <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>(اختياري)</span></label>
                  <input placeholder="e.g. Perfumes" value={catForm.nameEn} onChange={e => setCatForm(f => ({ ...f, nameEn: e.target.value }))} style={{ ...inputBase, direction: "ltr", textAlign: "left" }} onFocus={focusIn} onBlur={focusOut} />
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>صورة القسم</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input placeholder="https://..." value={catForm.image} onChange={e => setCatForm(f => ({ ...f, image: e.target.value }))} style={{ ...inputBase, flex: 1 }} onFocus={focusIn} onBlur={focusOut} />
                  <label style={{ background: "#EEF2FF", color: "#6366F1", border: "1.5px solid #6366F1", borderRadius: r.md, padding: "10px 14px", fontWeight: 700, cursor: catUploading ? "wait" : "pointer", fontSize: 13, whiteSpace: "nowrap", opacity: catUploading ? 0.6 : 1 }}>
                    {catUploading ? "⏳ جاري الرفع..." : "📷 رفع"}
                    <input type="file" accept="image/*" disabled={catUploading} style={{ display: "none" }} onChange={async e => { const f = e.target.files?.[0]; if (f) { const url = await handleImageUpload(f, setCatUploading); if (url) setCatForm(fr => ({ ...fr, image: url })); e.target.value = ""; } }} />
                  </label>
                </div>
              </div>
              {catForm.image && <img src={catForm.image} alt="معاينة" style={{ width: 100, height: 80, objectFit: "cover", borderRadius: r.md, marginBottom: 16, border: "1px solid #E2E8F0" }} onError={e => e.currentTarget.style.display = "none"} />}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={saveCat} style={{ ...btnPrimary, padding: "11px 24px" }}>{catEdit !== null ? "تحديث القسم" : "حفظ القسم"}</button>
                {catEdit !== null && <button onClick={() => { setCatEdit(null); setCatForm({ name: "", nameEn: "", image: "" }); }} style={{ background: "#F8FAFC", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: r.md, padding: "11px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>إلغاء</button>}
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
                          <button className="icon-btn" onClick={() => { setCatEdit(cat.id); setCatForm({ name: cat.name || "", nameEn: cat.nameEn || "", image: cat.image || "" }); }} style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'Tajawal',sans-serif" }}>✏️ تعديل</button>
                          <button className="icon-btn" onClick={async () => {
                            if (!window.confirm(`حذف "${cat.name}"؟`)) return;
                            try { await deleteCategory(cat.id); await refreshCategories(); }
                            catch (e) { alert("❌ فشل الحذف: " + (e?.message || "")); }
                          }} style={{ background: "#FEF2F2", color: "#EF4444", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'Tajawal',sans-serif" }}>🗑️ حذف</button>
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
          <div style={{ display: "grid", gap: 16, animation: "fadeUp .4s ease both" }}>

            {/* شريط الأدوات */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: shadow.sm, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
                  <input placeholder="🔍 ابحث (اسم، قسم، ماركة، SKU)..." value={prodSearch} onChange={e => setProdSearch(e.target.value)}
                    style={{ ...inputBase, padding: "10px 14px" }} onFocus={focusIn} onBlur={focusOut} />
                </div>

                <button onClick={() => setShowProdFilters(v => !v)}
                  style={{ padding: "10px 16px", borderRadius: 10, border: `1.5px solid ${activeProdFilters.length ? "#6366F1" : "#E2E8F0"}`, background: activeProdFilters.length ? "#EEF2FF" : "#F8FAFC", color: activeProdFilters.length ? "#6366F1" : "#334155", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                  🎛️ فلاتر {activeProdFilters.length > 0 && <span style={{ background: "#6366F1", color: "#fff", borderRadius: 999, padding: "1px 8px", fontSize: 11 }}>{activeProdFilters.length}</span>}
                </button>

                <select value={prodSort} onChange={e => setProdSort(e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 13, background: "#F8FAFC", fontWeight: 700, fontFamily: "'Tajawal',sans-serif", cursor: "pointer", outline: "none" }}>
                  <option value="default">ترتيب: افتراضي</option>
                  <option value="newest">🆕 الأحدث</option>
                  <option value="oldest">📅 الأقدم</option>
                  <option value="name-asc">📝 الاسم أ-ي</option>
                  <option value="name-desc">📝 الاسم ي-أ</option>
                  <option value="price-asc">💰 السعر ↑</option>
                  <option value="price-desc">💰 السعر ↓</option>
                  <option value="stock-asc">📦 المخزون الأقل أولاً</option>
                  <option value="stock-desc">📦 المخزون الأكثر أولاً</option>
                </select>

                <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {filteredProds.length} / {products.length}
                </span>

                <button onClick={exportProdsCSV} title="تصدير Excel"
                  style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #10B981", background: "#ECFDF5", color: "#10B981", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                  📥 CSV
                </button>
                <Link to="/add-product" style={{ ...btnPrimary, padding: "10px 18px", whiteSpace: "nowrap" }}>➕ منتج</Link>
              </div>

              {/* رقائق الفلاتر المفعّلة */}
              {activeProdFilters.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
                  {activeProdFilters.map((c, i) => (
                    <button key={i} onClick={c.clear} style={{ background: "#EEF2FF", color: "#6366F1", border: "1px solid #C7D2FE", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {c.label} <span style={{ fontSize: 13 }}>×</span>
                    </button>
                  ))}
                  <button onClick={clearAllProdFilters} style={{ background: "transparent", color: "#EF4444", border: "none", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                    🧹 مسح الكل
                  </button>
                </div>
              )}

              {/* لوحة الفلاتر التفصيلية */}
              {showProdFilters && (
                <div style={{ marginTop: 14, padding: "14px", background: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                  <div>
                    <label style={{ ...lbl, fontSize: 12 }}>القسم</label>
                    <select value={prodFilterCat} onChange={e => setProdFilterCat(e.target.value)}
                      style={{ ...inputBase, padding: "7px 10px", fontSize: 12 }}>
                      <option value="">— الكل —</option>
                      {categories.map(c => { const name = typeof c === "string" ? c : c.name; return <option key={name} value={name}>{name}</option>; })}
                    </select>
                  </div>
                  <div>
                    <label style={{ ...lbl, fontSize: 12 }}>المخزون</label>
                    <select value={prodFilterStock} onChange={e => setProdFilterStock(e.target.value)} style={{ ...inputBase, padding: "7px 10px", fontSize: 12 }}>
                      <option value="all">الكل</option>
                      <option value="in">✅ متوفر</option>
                      <option value="low">⚠️ منخفض</option>
                      <option value="out">🔴 نفد</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ ...lbl, fontSize: 12 }}>الظهور</label>
                    <select value={prodFilterVis} onChange={e => setProdFilterVis(e.target.value)} style={{ ...inputBase, padding: "7px 10px", fontSize: 12 }}>
                      <option value="all">الكل</option>
                      <option value="shown">👁️ ظاهر</option>
                      <option value="hidden">🙈 مخفي</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ ...lbl, fontSize: 12 }}>مميّز</label>
                    <select value={prodFilterFeat} onChange={e => setProdFilterFeat(e.target.value)} style={{ ...inputBase, padding: "7px 10px", fontSize: 12 }}>
                      <option value="all">الكل</option>
                      <option value="yes">⭐ مميّز</option>
                      <option value="no">عادي</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ ...lbl, fontSize: 12 }}>التخفيضات</label>
                    <select value={prodFilterSale} onChange={e => setProdFilterSale(e.target.value)} style={{ ...inputBase, padding: "7px 10px", fontSize: 12 }}>
                      <option value="all">الكل</option>
                      <option value="yes">🔥 مع تخفيض</option>
                      <option value="no">سعر عادي</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ ...lbl, fontSize: 12 }}>السعر (درهم)</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="number" placeholder="من" value={prodPriceMin} onChange={e => setProdPriceMin(e.target.value)} style={{ ...inputBase, padding: "7px 10px", fontSize: 12 }} />
                      <input type="number" placeholder="إلى" value={prodPriceMax} onChange={e => setProdPriceMax(e.target.value)} style={{ ...inputBase, padding: "7px 10px", fontSize: 12 }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* شريط الإجراءات الجماعية */}
            {selectedProds.size > 0 && (
              <div style={{ background: "linear-gradient(135deg,#EEF2FF,#FDF4FF)", border: "1.5px solid #C7D2FE", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", animation: "fadeUp .2s" }}>
                <span style={{ fontWeight: 900, color: "#6366F1", fontSize: 14 }}>{selectedProds.size} محدّد</span>
                <div style={{ flex: 1 }} />
                <button disabled={bulkBusy} onClick={() => bulkAction("show")}
                  style={{ background: "#ECFDF5", color: "#10B981", border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>👁️ إظهار</button>
                <button disabled={bulkBusy} onClick={() => bulkAction("hide")}
                  style={{ background: "#FEF3C7", color: "#B45309", border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>🙈 إخفاء</button>
                <button disabled={bulkBusy} onClick={() => bulkAction("feat")}
                  style={{ background: "#FFFBEB", color: "#F59E0B", border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>⭐ جعله مميّز</button>
                <button disabled={bulkBusy} onClick={() => bulkAction("unfeat")}
                  style={{ background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>إزالة تمييز</button>
                <button disabled={bulkBusy} onClick={() => bulkAction("delete")}
                  style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>🗑️ حذف</button>
                <button onClick={() => setSelectedProds(new Set())}
                  style={{ background: "transparent", color: "#64748B", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>إلغاء التحديد</button>
              </div>
            )}

            {/* جدول المنتجات */}
            <div className="prod-table-wrap adm-noscrollbar" style={{ background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: shadow.md, overflow: "auto" }}>
              {filteredProds.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                  {prodSearch ? "لا توجد نتائج" : "لا توجد منتجات بعد"}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
                      <th style={{ padding: "14px 14px", width: 40 }}>
                        <input type="checkbox"
                          checked={filteredProds.length > 0 && selectedProds.size === filteredProds.length}
                          onChange={toggleAllProds}
                          style={{ width: 16, height: 16, accentColor: "#6366F1", cursor: "pointer" }} />
                      </th>
                      {["المنتج", "القسم", "السعر", "المخزون", "الحالة", "إجراءات"].map(h => (
                        <th key={h} style={{ padding: "14px 16px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#64748B" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProds.map((p, i) => (
                      <tr key={p.id} className="prod-row" style={{ borderBottom: "1px solid #F1F5F9", background: selectedProds.has(p.id) ? "#EEF2FF" : p.hidden ? "#FAFAFA" : "#fff" }}>
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <input type="checkbox"
                            checked={selectedProds.has(p.id)}
                            onChange={() => toggleProdSelect(p.id)}
                            style={{ width: 16, height: 16, accentColor: "#6366F1", cursor: "pointer" }} />
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", background: "#F1F5F9", flexShrink: 0, position: "relative" }}>
                              {p.image
                                ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} />
                                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, opacity: .4 }}>📦</div>
                              }
                              {p.featured && <span style={{ position: "absolute", top: -4, right: -4, background: "#F59E0B", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>⭐</span>}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: p.hidden ? "#94A3B8" : "#0F172A" }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: "#94A3B8", display: "flex", gap: 6, marginTop: 2 }}>
                                {p.sku && <span>🏷️ {p.sku}</span>}
                                {p.brand && <span>• {p.brand}</span>}
                              </div>
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

            {/* الكوبونات */}
            <div id="sec-coupons" style={{ display: visibleSettingsSections.has("sec-coupons") ? "block" : "none" }}>
              <AdvCard
                title="الكوبونات"
                icon="🎟️"
                subtitle="إنشاء وإدارة أكواد الخصم — نسبة مئوية أو مبلغ ثابت"
                open={openAdv.coupons}
                onToggle={() => toggleAdv("coupons")}
              >
                <CouponsManager />
              </AdvCard>
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

            {/* كلمة سر الأدمن */}
            <div id="sec-security" style={{ display: visibleSettingsSections.has("sec-security") ? "block" : "none" }}>
              <AdvCard title="كلمة سر الأدمن" icon="🔐" subtitle="غيّر كلمة السر — رح تتسجّل خروج بعد التغيير"
                open={openAdv.security} onToggle={() => toggleAdv("security")}>
                <AdminPasswordCard />
              </AdvCard>
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
      </AdminLayout>
    </>
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

/* ════════════════════ تغيير كلمة سر الأدمن ════════════════════ */
function AdminPasswordCard() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async () => {
    if (!form.current || !form.next) return alert("⚠️ عبّي الحقول");
    if (form.next.length < 8) return alert("⚠️ الكلمة الجديدة لازم 8 خانات على الأقل");
    if (form.next !== form.confirm) return alert("⚠️ التأكيد مش مطابق");
    if (form.current === form.next) return alert("⚠️ الكلمة الجديدة لازم تكون مختلفة عن القديمة");
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "PUT",
        body: { currentPassword: form.current, newPassword: form.next },
      });
      alert("✅ تم تغيير كلمة السر — رح تتسجّل خروج. سجّل دخول بالكلمة الجديدة.");
      // Force re-login with the new password. clearAuth wipes the full
      // auth set (token, user, isAdmin, userName) so the next page loads
      // cleanly — partial clears used to leave a zombie `user` cached.
      clearAuth();
      window.location.href = "/user-login";
    } catch (e) {
      alert("❌ " + (e.message || "فشل التغيير"));
      setBusy(false);
    }
  };

  const field = (key, placeholder) => (
    <input
      type={show ? "text" : "password"}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      placeholder={placeholder}
      autoComplete="new-password"
      style={inputBase}
      onFocus={focusIn}
      onBlur={focusOut}
    />
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <label style={lbl}>كلمة السر الحالية</label>
        {field("current", "أدخل كلمة السر الحالية")}
      </div>
      <div>
        <label style={lbl}>كلمة السر الجديدة (8 خانات على الأقل)</label>
        {field("next", "كلمة سر جديدة")}
      </div>
      <div>
        <label style={lbl}>تأكيد كلمة السر الجديدة</label>
        {field("confirm", "أعد كتابة كلمة السر الجديدة")}
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", cursor: "pointer" }}>
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} style={{ accentColor: "#6366F1" }} />
        إظهار كلمات السر
      </label>

      <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#92400E", lineHeight: 1.7 }}>
        ⚠️ بعد التغيير: الكلمة القديمة بـ <code>.env</code> رح تبطل تشتغل، والكلمة الجديدة رح تنحفظ بقاعدة البيانات.
      </div>

      <button
        onClick={submit}
        disabled={busy}
        style={{ ...btnPrimary, padding: "12px 24px", opacity: busy ? 0.6 : 1, cursor: busy ? "wait" : "pointer" }}
      >
        {busy ? "⏳ جاري التغيير..." : "🔐 غيّر كلمة السر"}
      </button>
    </div>
  );
}

/* ════════════════════ إدارة الكوبونات (داخل الإعدادات) ════════════════════ */
const emptyCouponForm = { code: "", type: "percent", value: "", minOrder: "", maxUses: "", expiry: "" };

function CouponsManager() {
  const { coupons, loading, refresh } = useCoupons();
  const [form, setForm]       = useState(emptyCouponForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.code.trim() || !form.value) return alert("يرجى تعبئة الرمز والقيمة");
    const code = form.code.trim().toUpperCase();
    const dup = coupons.find((c) => c.code === code && c.code !== editing);
    if (dup) return alert("هذا الرمز موجود مسبقاً");

    try {
      setSaving(true);
      if (editing) {
        await saveCoupon({
          ...coupons.find((c) => c.code === editing),
          code, type: form.type, value: Number(form.value),
          minOrder: Number(form.minOrder) || 0,
          maxUses: Number(form.maxUses) || 999,
          expiry: form.expiry || null,
        });
      } else {
        await saveCoupon({
          code, type: form.type, value: Number(form.value),
          minOrder: Number(form.minOrder) || 0,
          maxUses: Number(form.maxUses) || 999,
          uses: 0, expiry: form.expiry || null,
          active: true, createdAt: new Date().toISOString(),
        });
      }
      setForm(emptyCouponForm);
      setEditing(null);
      setShowForm(false);
      await refresh();
    } catch (e) {
      alert("❌ فشل الحفظ: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (code) => {
    const c = coupons.find((x) => x.code === code);
    if (!c) return;
    try { await updateCoupon(code, { active: !c.active }); await refresh(); }
    catch { alert("❌ فشل التحديث"); }
  };

  const remove = async (code) => {
    if (!window.confirm(`حذف كوبون ${code}؟`)) return;
    try { await deleteCoupon(code); await refresh(); }
    catch { alert("❌ فشل الحذف"); }
  };

  const startEdit = (c) => {
    setEditing(c.code);
    setForm({
      code: c.code, type: c.type, value: String(c.value),
      minOrder: String(c.minOrder || ""), maxUses: String(c.maxUses || ""),
      expiry: c.expiry || "",
    });
    setShowForm(true);
  };

  const cancelEdit = () => { setEditing(null); setForm(emptyCouponForm); setShowForm(false); };

  const isExpired   = (c) => c.expiry && new Date(c.expiry) < new Date();
  const isExhausted = (c) => c.uses >= c.maxUses;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Add / Edit toggle button (only when form is closed) */}
      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm(emptyCouponForm); }}
          style={{
            background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff",
            border: "none", borderRadius: 10, padding: "10px 16px",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
            fontFamily: "'Tajawal',sans-serif",
            boxShadow: "0 4px 12px rgba(99,102,241,.25)",
            display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start",
          }}
        >➕ إنشاء كوبون جديد</button>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ background: "#FAFBFC", border: "1px solid #EEF0F4", borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 12 }}>
            {editing ? `تعديل كوبون: ${editing}` : "كوبون جديد"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
            <div>
              <label style={lbl}>رمز الكوبون</label>
              <input value={form.code} onChange={setF("code")} placeholder="SAVE20"
                style={{ ...inputBase, textTransform: "uppercase", fontFamily: "monospace" }}
                onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={lbl}>نوع الخصم</label>
              <select value={form.type} onChange={setF("type")}
                style={{ ...inputBase, cursor: "pointer" }}
                onFocus={focusIn} onBlur={focusOut}>
                <option value="percent">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (AED)</option>
              </select>
            </div>
            <div>
              <label style={lbl}>{form.type === "percent" ? "النسبة (%)" : "المبلغ (AED)"}</label>
              <input type="number" value={form.value} onChange={setF("value")}
                placeholder={form.type === "percent" ? "20" : "50"}
                min="1" max={form.type === "percent" ? "100" : undefined}
                style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={lbl}>الحد الأدنى للطلب</label>
              <input type="number" value={form.minOrder} onChange={setF("minOrder")}
                placeholder="0 = بدون حد" min="0"
                style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={lbl}>الحد الأقصى للاستخدام</label>
              <input type="number" value={form.maxUses} onChange={setF("maxUses")}
                placeholder="فارغ = غير محدود" min="1"
                style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={lbl}>تاريخ الانتهاء</label>
              <input type="date" value={form.expiry} onChange={setF("expiry")}
                style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={save} disabled={saving}
              style={{ ...btnPrimary, padding: "10px 18px", fontSize: 13, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "جاري الحفظ..." : (editing ? "💾 حفظ التعديل" : "✅ إنشاء")}
            </button>
            <button onClick={cancelEdit}
              style={{ background: "#fff", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
            الكوبونات الحالية
            <span style={{ marginInlineStart: 8, color: "#94A3B8", fontWeight: 600 }}>({coupons.length})</span>
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 20, color: "#94A3B8", fontSize: 13 }}>جاري التحميل...</div>
        ) : coupons.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 28, color: "#94A3B8",
            background: "#FAFBFC", borderRadius: 10, border: "1px dashed #EEF0F4", fontSize: 13,
          }}>
            🎟️ لا توجد كوبونات بعد. أنشئ أول كوبون من الزر بالأعلى.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {coupons.map((c) => {
              const expired   = isExpired(c);
              const exhausted = isExhausted(c);
              const status    = !c.active ? "غير نشط" : expired ? "منتهي" : exhausted ? "استُنفذ" : "نشط";
              const statusCol = !c.active ? "#94A3B8" : expired ? "#EF4444" : exhausted ? "#F59E0B" : "#10B981";
              const statusBg  = !c.active ? "#F1F5F9" : expired ? "#FEF2F2" : exhausted ? "#FFFBEB" : "#ECFDF5";
              const dim = !c.active || expired || exhausted;
              return (
                <div key={c.code} style={{
                  border: "1px solid #EEF0F4", borderRadius: 10,
                  padding: "10px 12px",
                  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                  background: dim ? "#FAFBFC" : "#fff", opacity: dim ? 0.85 : 1,
                }}>
                  <div style={{
                    background: "#EEF2FF", color: "#6366F1",
                    borderRadius: 7, padding: "5px 10px",
                    fontWeight: 800, fontSize: 13, letterSpacing: 0.5,
                    fontFamily: "monospace",
                  }}>{c.code}</div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>
                      {c.type === "percent" ? `${c.value}%` : `${fmt(c.value)}`} خصم
                      {c.minOrder > 0 && <span style={{ color: "#94A3B8", fontWeight: 500, fontSize: 11, marginInlineStart: 8 }}>• حد أدنى {fmt(c.minOrder)}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                      الاستخدام: {c.uses || 0}/{c.maxUses >= 999 ? "∞" : c.maxUses}
                      {c.expiry && <span style={{ marginInlineStart: 8 }}>• ينتهي {new Date(c.expiry).toLocaleDateString("ar-EG")}</span>}
                    </div>
                  </div>
                  <span style={{
                    background: statusBg, color: statusCol, borderRadius: 6,
                    padding: "2px 9px", fontSize: 11, fontWeight: 700,
                  }}>{status}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => toggleActive(c.code)} title={c.active ? "تعطيل" : "تفعيل"}
                      style={miniBtn(c.active ? "#FFFBEB" : "#ECFDF5", c.active ? "#B45309" : "#059669")}>
                      {c.active ? "⏸" : "▶"}
                    </button>
                    <button onClick={() => startEdit(c)} title="تعديل" style={miniBtn("#EEF2FF", "#6366F1")}>✏️</button>
                    <button onClick={() => remove(c.code)} title="حذف" style={miniBtn("#FEF2F2", "#EF4444")}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const miniBtn = (bg, color) => ({
  width: 28, height: 28, borderRadius: 7,
  background: bg, color, border: "none",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontSize: 12, fontFamily: "'Tajawal',sans-serif",
});
