import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { shadow, r, inputBase, btnPrimary, focusIn, focusOut, safeParse, fmt } from "../Theme";
import { uploadToCloudinary, CLOUD_NAME } from "../utils/cloudinary";
import { useToast } from "../context/ToastContext";
import { useCategories } from "../hooks/useCategories";
import { saveProduct } from "../hooks/useProducts";

const shimmer = {
  background: "linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899,#6366F1)",
  backgroundSize: "300% auto", WebkitBackgroundClip: "text", backgroundClip: "text",
  color: "transparent", animation: "shimmer 4s linear infinite",
};

const lbl = { display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "#334155" };

/* ── مجموعات الخيارات المسبقة ── */
const PRESET_TYPES = [
  { key: "size",   label: "قياس",  icon: "👕", presets: ["XS","S","M","L","XL","XXL","XXXL"] },
  { key: "number", label: "مقاس",  icon: "👟", presets: ["36","37","38","39","40","41","42","43","44","45"] },
  { key: "color",  label: "لون",   icon: "🎨", presets: [{ label:"أسود",hex:"#1E293B" },{ label:"أبيض",hex:"#F8FAFC" },{ label:"أحمر",hex:"#EF4444" },{ label:"أزرق",hex:"#3B82F6" },{ label:"أخضر",hex:"#22C55E" },{ label:"أصفر",hex:"#EAB308" },{ label:"وردي",hex:"#EC4899" },{ label:"رمادي",hex:"#94A3B8" },{ label:"بيج",hex:"#D4A574" },{ label:"بني",hex:"#92400E" }] },
  { key: "age",    label: "عمر",   icon: "🎂", presets: ["0-6 أشهر","6-12 شهر","1-2 سنة","2-4 سنة","4-6 سنة","6-8 سنة","8-10 سنة","10-12 سنة"] },
  { key: "custom", label: "مخصص", icon: "⚙️", presets: [] },
];

const newGroup = (type) => ({
  id: Date.now() + Math.random(),
  name: PRESET_TYPES.find(t=>t.key===type)?.label || "خيار",
  type,
  required: true,
  options: [],
});

const newOption = (type, label = "", hex = "") => ({
  id: Date.now() + Math.random(),
  label,
  hex: type === "color" ? (hex || "#6366F1") : "",
  priceAdj: 0,
  stock: "",
});

export default function AddProduct() {
  const navigate = useNavigate();
  const toast    = useToast();
  const { categories: rawCats } = useCategories();
  const categories = rawCats.map(c => typeof c === "string" ? c : c?.name).filter(Boolean);
  const [form, setForm] = useState({ name: "", nameEn: "", price: "", oldPrice: "", category: "", stock: "", description: "", descriptionEn: "", badges: "", featured: false });

  // صور متعددة: [{ url, uploading, progress }]
  const [images, setImages]     = useState([]);
  const [mainIdx, setMainIdx]   = useState(0);
  const [uploading, setUploading] = useState(false);

  // مجموعات الخيارات
  const [variantGroups, setVarGroups] = useState([]);

  useEffect(() => {
    if (localStorage.getItem("isAdmin") !== "true") { navigate("/user-login"); return; }
  }, []);

  useEffect(() => {
    if (categories.length) setForm(f => f.category ? f : { ...f, category: categories[0] });
  }, [categories]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const pct = useMemo(() => {
    const p = parseFloat(form.price), o = parseFloat(form.oldPrice);
    return (Number.isFinite(p) && Number.isFinite(o) && o > p) ? Math.round(100 - (p / o) * 100) : null;
  }, [form.price, form.oldPrice]);

  // رفع صور
  const handleImageFiles = async (files) => {
    const arr = Array.from(files).slice(0, 8 - images.length);
    if (!arr.length) return;

    // إذا لم يكن cloudinary مضبوطاً، استخدم base64
    const cloudConfigured = CLOUD_NAME && CLOUD_NAME !== "YOUR_CLOUD_NAME";

    setUploading(true);
    const newImgs = arr.map(f => ({ url: "", uploading: true, progress: 0, name: f.name }));
    setImages(prev => [...prev, ...newImgs]);
    const startIdx = images.length;

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      try {
        let url;
        if (cloudConfigured) {
          url = await uploadToCloudinary(file, (prog) => {
            setImages(prev => prev.map((img, idx) => idx === startIdx + i ? { ...img, progress: prog } : img));
          });
        } else {
          // fallback: base64
          url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
        }
        setImages(prev => prev.map((img, idx) => idx === startIdx + i ? { ...img, url, uploading: false, progress: 100 } : img));
      } catch {
        setImages(prev => prev.map((img, idx) => idx === startIdx + i ? { ...img, uploading: false, error: true } : img));
        toast(`فشل رفع ${file.name}`, "error");
      }
    }
    setUploading(false);
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    if (mainIdx >= idx && mainIdx > 0) setMainIdx(mainIdx - 1);
  };

  const canSubmit = form.name.trim() && form.price && form.category && form.description.trim() && !uploading;

  /* ── helpers للمتغيرات ── */
  const addGroup = (type) => setVarGroups(g => [...g, newGroup(type)]);
  const removeGroup = (gid) => setVarGroups(g => g.filter(x => x.id !== gid));
  const updateGroup = (gid, key, val) => setVarGroups(g => g.map(x => x.id === gid ? { ...x, [key]: val } : x));
  const addOption = (gid, label = "", hex = "") => {
    setVarGroups(g => g.map(x => x.id === gid ? { ...x, options: [...x.options, newOption(x.type, label, hex)] } : x));
  };
  const removeOption = (gid, oid) => setVarGroups(g => g.map(x => x.id === gid ? { ...x, options: x.options.filter(o => o.id !== oid) } : x));
  const updateOption = (gid, oid, key, val) => setVarGroups(g => g.map(x => x.id === gid ? { ...x, options: x.options.map(o => o.id === oid ? { ...o, [key]: val } : o) } : x));
  const addPresets = (gid, type) => {
    const pt = PRESET_TYPES.find(t => t.key === type);
    if (!pt) return;
    pt.presets.forEach(p => {
      if (typeof p === "object") addOption(gid, p.label, p.hex);
      else addOption(gid, p);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const readyImgs = images.filter(img => img.url && !img.error);
    const mainImage = readyImgs[mainIdx]?.url || readyImgs[0]?.url || "";
    const sku = "KSH-" + Math.random().toString(36).toUpperCase().slice(2, 9);
    // تنظيف مجموعات الخيارات
    const cleanVariants = variantGroups
      .filter(g => g.options.length > 0)
      .map(g => ({
        id: String(g.id),
        name: g.name,
        type: g.type,
        required: g.required,
        options: g.options
          .filter(o => o.label.trim())
          .map(o => ({
            id: String(o.id),
            label: o.label.trim(),
            hex: o.hex || "",
            priceAdj: Number(o.priceAdj) || 0,
            stock: o.stock !== "" ? parseInt(o.stock) : null,
          })),
      }))
      .filter(g => g.options.length > 0);

    const newP = {
      id: Date.now(),
      sku,
      name: form.name.trim(),
      nameEn: form.nameEn.trim(),
      price: parseFloat(form.price),
      oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : undefined,
      currency: "AED",
      category: form.category,
      stock: form.stock ? parseInt(form.stock) : 0,
      description: form.description.trim(),
      descriptionEn: form.descriptionEn.trim(),
      badges: form.badges.split(",").map(b => b.trim()).filter(Boolean),
      image: mainImage,
      images: readyImgs.map(img => img.url),
      featured: form.featured,
      variants: cleanVariants,
      createdAt: new Date().toISOString(),
    };
    try {
      await saveProduct(newP);
      toast("✅ تم إضافة المنتج!", "success");
      navigate("/admin-dashboard");
    } catch {
      toast("❌ فشل حفظ المنتج، حاول مجدداً", "error");
    }
  };

  const mainImage = images.filter(img => img.url)[mainIdx]?.url || images.find(img => img.url)?.url || "";

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: "rtl" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:700px){
          .ap-grid    { grid-template-columns: 1fr !important; }
          .ap-2col    { grid-template-columns: 1fr !important; }
          .ap-preview { position: static !important; }
        }
      `}</style>

      {/* ناف */}
      <nav style={{ background: "#0F172A", borderBottom: "1px solid rgba(255,255,255,.08)", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link to="/admin-dashboard" style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.8)", border: "1.5px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>← رجوع</Link>
          <span style={{ fontSize: 18, fontWeight: 900 }}><span style={{ color: "#fff" }}>➕ </span><span style={shimmer}>إضافة منتج جديد</span></span>
        </div>
        <Link to="/home" style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.7)", border: "1.5px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>المتجر ←</Link>
      </nav>

      <main style={{ maxWidth: 960, margin: "28px auto", padding: "0 20px", animation: "fadeUp .45s ease both" }}>
        <form onSubmit={handleSubmit}>
          <div className="ap-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start" }}>

            {/* النموذج */}
            <div style={{ background: "#fff", borderRadius: 22, border: "1px solid #F1F5F9", boxShadow: shadow.md, padding: "28px", display: "grid", gap: 18 }}>
              <div>
                <label style={lbl}>اسم المنتج (عربي) *</label>
                <input placeholder="مثال: سماعات لاسلكية" value={form.name} onChange={set("name")} required style={inputBase} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={lbl}>Product Name (English) <span style={{ color: "#6366F1", fontSize: 12 }}>مهم للترجمة</span></label>
                <input placeholder="e.g. Wireless Headphones" value={form.nameEn} onChange={set("nameEn")} style={{ ...inputBase, direction: "ltr" }} onFocus={focusIn} onBlur={focusOut} />
              </div>

              <div className="ap-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={lbl}>السعر (درهم) *</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={set("price")} required style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
                <div>
                  <label style={lbl}>
                    السعر القديم
                    {pct && <span style={{ background: "#FEF2F2", color: "#EF4444", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 800, marginRight: 6 }}>- {pct}%</span>}
                  </label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={form.oldPrice} onChange={set("oldPrice")} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
              </div>

              <div className="ap-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={lbl}>القسم *</label>
                  <select value={form.category} onChange={set("category")} required style={{ ...inputBase, cursor: "pointer" }} onFocus={focusIn} onBlur={focusOut}>
                    {categories.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>المخزون</label>
                  <input type="number" min="0" placeholder="0" value={form.stock} onChange={set("stock")} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
                </div>
              </div>

              <div>
                <label style={lbl}>الوصف (عربي) *</label>
                <textarea placeholder="وصف مختصر وجذاب للمنتج..." value={form.description} onChange={set("description")} required rows={4} style={{ ...inputBase, resize: "vertical" }} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={lbl}>Description (English) <span style={{ color: "#6366F1", fontSize: 12 }}>مهم للترجمة</span></label>
                <textarea placeholder="Short and attractive product description..." value={form.descriptionEn} onChange={set("descriptionEn")} rows={3} style={{ ...inputBase, resize: "vertical", direction: "ltr" }} onFocus={focusIn} onBlur={focusOut} />
              </div>

              <div>
                <label style={lbl}>الشارات التسويقية (مفصولة بفاصلة)</label>
                <input placeholder="الأكثر مبيعاً, شحن سريع, ضمان سنة" value={form.badges} onChange={set("badges")} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
              </div>

              {/* ═══ الخيارات والمتغيرات ═══ */}
              <div style={{ border: "1.5px solid #E0E7FF", borderRadius: 16, padding: "20px", background: "#F8FAFF" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 4 }}>🎛️ الخيارات والمتغيرات</div>
                <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>أضف قياسات، ألوان، أعمار، أو أي خيارات مخصصة</div>

                {/* زر إضافة مجموعة */}
                {variantGroups.length < 5 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: variantGroups.length > 0 ? 16 : 0 }}>
                    {PRESET_TYPES.map(pt => (
                      <button key={pt.key} type="button" onClick={() => addGroup(pt.key)}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer", fontFamily: "'Tajawal',sans-serif", transition: "all .15s" }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = "#6366F1"; e.currentTarget.style.color = "#6366F1"; e.currentTarget.style.background = "#EEF2FF"; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#334155"; e.currentTarget.style.background = "#fff"; }}>
                        {pt.icon} + {pt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* مجموعات الخيارات */}
                {variantGroups.map((grp, gi) => (
                  <div key={grp.id} style={{ background: "#fff", border: "1.5px solid #E0E7FF", borderRadius: 14, padding: "16px", marginBottom: 12 }}>
                    {/* رأس المجموعة */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <span style={{ fontSize: 20 }}>{PRESET_TYPES.find(t=>t.key===grp.type)?.icon}</span>
                      <input value={grp.name} onChange={e => updateGroup(grp.id, "name", e.target.value)}
                        style={{ flex: 1, border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "8px 12px", fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal',sans-serif", color: "#0F172A", outline: "none" }}
                        onFocus={e => e.target.style.borderColor="#6366F1"} onBlur={e => e.target.style.borderColor="#E2E8F0"} />
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748B", cursor: "pointer", whiteSpace: "nowrap" }}>
                        <input type="checkbox" checked={grp.required} onChange={e => updateGroup(grp.id, "required", e.target.checked)} style={{ accentColor: "#6366F1" }} />
                        إجباري
                      </label>
                      <button type="button" onClick={() => removeGroup(grp.id)}
                        style={{ background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>

                    {/* أزرار قيم مسبقة */}
                    {PRESET_TYPES.find(t=>t.key===grp.type)?.presets?.length > 0 && grp.options.length === 0 && (
                      <button type="button" onClick={() => addPresets(grp.id, grp.type)}
                        style={{ marginBottom: 12, padding: "7px 14px", background: "#EEF2FF", color: "#6366F1", border: "1.5px dashed #A5B4FC", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                        ⚡ أضف القيم الشائعة تلقائياً
                      </button>
                    )}

                    {/* قائمة الخيارات */}
                    {grp.options.length > 0 && (
                      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                        {/* ترويسة */}
                        <div style={{ display: "grid", gridTemplateColumns: grp.type === "color" ? "30px 1fr 1fr 80px 80px 28px" : "1fr 80px 80px 28px", gap: 8, fontSize: 11, color: "#94A3B8", fontWeight: 700, paddingBottom: 4 }}>
                          {grp.type === "color" && <span>لون</span>}
                          <span>الاسم</span>
                          <span>سعر إضافي</span>
                          <span>مخزون</span>
                          <span></span>
                        </div>
                        {grp.options.map(opt => (
                          <div key={opt.id} style={{ display: "grid", gridTemplateColumns: grp.type === "color" ? "30px 1fr 80px 80px 28px" : "1fr 80px 80px 28px", gap: 8, alignItems: "center" }}>
                            {grp.type === "color" && (
                              <div style={{ position: "relative", width: 30, height: 30 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 8, background: opt.hex, border: "2px solid #E2E8F0", cursor: "pointer", overflow: "hidden", position: "relative" }}>
                                  <input type="color" value={opt.hex} onChange={e => updateOption(grp.id, opt.id, "hex", e.target.value)}
                                    style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", border: "none" }} />
                                </div>
                              </div>
                            )}
                            <input value={opt.label} onChange={e => updateOption(grp.id, opt.id, "label", e.target.value)}
                              placeholder="مثال: XL" style={{ border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "'Tajawal',sans-serif", color: "#0F172A", outline: "none" }}
                              onFocus={e => e.target.style.borderColor="#6366F1"} onBlur={e => e.target.style.borderColor="#E2E8F0"} />
                            <input type="number" value={opt.priceAdj} onChange={e => updateOption(grp.id, opt.id, "priceAdj", e.target.value)}
                              placeholder="+0" style={{ border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "'Tajawal',sans-serif", color: "#0F172A", outline: "none" }}
                              onFocus={e => e.target.style.borderColor="#6366F1"} onBlur={e => e.target.style.borderColor="#E2E8F0"} />
                            <input type="number" min="0" value={opt.stock} onChange={e => updateOption(grp.id, opt.id, "stock", e.target.value)}
                              placeholder="∞" style={{ border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "'Tajawal',sans-serif", color: "#0F172A", outline: "none" }}
                              onFocus={e => e.target.style.borderColor="#6366F1"} onBlur={e => e.target.style.borderColor="#E2E8F0"} />
                            <button type="button" onClick={() => removeOption(grp.id, opt.id)}
                              style={{ background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* زر إضافة خيار */}
                    <button type="button" onClick={() => addOption(grp.id)}
                      style={{ padding: "7px 14px", background: "#F8FAFC", border: "1.5px dashed #CBD5E1", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#64748B", cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                      ➕ إضافة خيار
                    </button>
                  </div>
                ))}

                {variantGroups.length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px", color: "#94A3B8", fontSize: 13, background: "#fff", borderRadius: 12, border: "1.5px dashed #E2E8F0" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🎛️</div>
                    لا يوجد خيارات — اضغط أحد الأزرار أعلاه لإضافة خيارات للمنتج
                  </div>
                )}
              </div>

              {/* منتج مميز */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "#F8FAFC", borderRadius: 12, padding: "12px 14px", border: "1.5px solid #E2E8F0" }}>
                <input type="checkbox" checked={form.featured} onChange={set("featured")} style={{ width: 18, height: 18, accentColor: "#6366F1", cursor: "pointer" }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#334155" }}>⭐ منتج مميز</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>سيظهر في قسم "المنتجات المميزة" في الصفحة الرئيسية</div>
                </div>
              </label>

              {/* رفع الصور */}
              <div>
                <label style={lbl}>
                  صور المنتج
                  <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginRight: 8 }}>({images.length}/8) — اضغط الصورة لجعلها رئيسية</span>
                </label>

                {/* منطقة الرفع */}
                <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, height: 120, border: "2px dashed #C7D2FE", borderRadius: 16, background: "#EEF2FF", cursor: "pointer", transition: "border-color .2s, background .2s" }}
                  onMouseOver={e => { e.currentTarget.style.background = "#E0E7FF"; e.currentTarget.style.borderColor = "#6366F1"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "#EEF2FF"; e.currentTarget.style.borderColor = "#C7D2FE"; }}>
                  <span style={{ fontSize: 32 }}>🖼️</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#6366F1" }}>اضغط لرفع صور (حتى 8)</span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>JPG, PNG, WEBP — حتى 5 ميغابايت للصورة</span>
                  <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => { handleImageFiles(e.target.files); e.target.value = ""; }} disabled={images.length >= 8} />
                </label>

                {/* معرض الصور */}
                {images.length > 0 && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                    {images.map((img, i) => (
                      <div key={i} onClick={() => !img.uploading && setMainIdx(i)}
                        style={{ position: "relative", width: 80, height: 80, borderRadius: 12, overflow: "hidden", border: `2.5px solid ${mainIdx === i ? "#6366F1" : "#E2E8F0"}`, cursor: img.uploading ? "default" : "pointer", flexShrink: 0 }}>
                        {img.uploading ? (
                          <div style={{ width: "100%", height: "100%", background: "#F1F5F9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <div style={{ fontSize: 18 }}>⏳</div>
                            <div style={{ fontSize: 10, color: "#6366F1", fontWeight: 700 }}>{img.progress}%</div>
                          </div>
                        ) : img.error ? (
                          <div style={{ width: "100%", height: "100%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>❌</div>
                        ) : (
                          <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                        {mainIdx === i && !img.uploading && !img.error && (
                          <div style={{ position: "absolute", top: 3, right: 3, background: "#6366F1", borderRadius: 999, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 900 }}>✓</div>
                        )}
                        <button type="button" onClick={e => { e.stopPropagation(); removeImage(i); }}
                          style={{ position: "absolute", top: 3, left: 3, background: "rgba(239,68,68,.85)", color: "#fff", border: "none", borderRadius: 999, width: 18, height: 18, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {CLOUD_NAME === "YOUR_CLOUD_NAME" && (
                  <div style={{ marginTop: 10, padding: "10px 14px", background: "#FFFBEB", borderRadius: 10, border: "1.5px solid #FDE68A", fontSize: 13, color: "#92400E" }}>
                    ⚠️ لم يتم ضبط Cloudinary — الصور ستُحفظ محلياً (base64). سجّل في cloudinary.com وأضف بياناتك في <code>src/utils/cloudinary.js</code>
                  </div>
                )}
              </div>

              <button type="submit" disabled={!canSubmit}
                style={{ ...btnPrimary, width: "100%", padding: "14px", fontSize: 16, opacity: canSubmit ? 1 : .45, cursor: canSubmit ? "pointer" : "not-allowed" }}>
                {uploading ? "⏳ جاري رفع الصور..." : "✅ إضافة المنتج"}
              </button>
            </div>

            {/* معاينة */}
            <div className="ap-preview" style={{ background: "#fff", borderRadius: 22, border: "1px solid #F1F5F9", boxShadow: shadow.md, padding: "22px", position: "sticky", top: 80 }}>
              <div style={{ fontWeight: 800, color: "#0F172A", marginBottom: 16, fontSize: 15 }}>👁️ معاينة المنتج</div>
              <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #F1F5F9", marginBottom: 14, height: 200, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {mainImage ? (
                  <img src={mainImage} alt="معاينة" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 40, opacity: .3 }}>🖼️</span>
                )}
              </div>
              {images.filter(img => img.url).length > 1 && (
                <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14 }}>
                  {images.filter(img => img.url).map((img, i) => (
                    <img key={i} src={img.url} alt="" onClick={() => setMainIdx(i)} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: `2px solid ${mainIdx === i ? "#6366F1" : "#E2E8F0"}`, flexShrink: 0 }} />
                  ))}
                </div>
              )}
              <div style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 2 }}>{form.name || "اسم المنتج"}</div>
              {form.nameEn && <div style={{ fontSize: 13, color: "#6366F1", fontWeight: 600, direction: "ltr", marginBottom: 6 }}>{form.nameEn}</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontWeight: 900, fontSize: 18, color: "#6366F1" }}>{form.price ? `${form.price} درهم` : "السعر"}</span>
                {pct && <span style={{ background: "#FEF2F2", color: "#EF4444", borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 800 }}>- {pct}%</span>}
              </div>
              {form.description && (
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.7, borderTop: "1px solid #F1F5F9", paddingTop: 10, marginBottom: 0 }}>
                  {form.description.substring(0, 120)}{form.description.length > 120 ? "..." : ""}
                </p>
              )}
              {form.descriptionEn && (
                <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6, direction: "ltr", marginTop: 4 }}>
                  {form.descriptionEn.substring(0, 120)}{form.descriptionEn.length > 120 ? "..." : ""}
                </p>
              )}
              {form.badges && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {form.badges.split(",").map((b, i) => b.trim() && (
                    <span key={i} style={{ background: "#FFFBEB", color: "#B45309", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{b.trim()}</span>
                  ))}
                </div>
              )}
              {form.category && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: "#EEF2FF", borderRadius: 10, fontSize: 13, color: "#6366F1", fontWeight: 700 }}>📂 {form.category}</div>
              )}
              {form.featured && <div style={{ marginTop: 8, padding: "8px 12px", background: "#FEFCE8", borderRadius: 10, fontSize: 13, color: "#CA8A04", fontWeight: 700 }}>⭐ منتج مميز</div>}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
