import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { shadow, inputBase, focusIn, focusOut } from "../Theme";
import { useCategories, addCategory, updateCategory, deleteCategory } from "../hooks/useCategories";

const S = {
  card: { background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: shadow.md, padding: "24px" },
  lbl: { display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "#334155" },
};

export default function ManageCategories() {
  const navigate = useNavigate();
  const { categories, loading, refresh } = useCategories();
  const [name, setName]       = useState("");
  const [nameEn, setNameEn]   = useState("");
  const [image, setImage]     = useState("");
  const [editId, setEditId]   = useState(null);
  const [saving, setSaving]   = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return alert("❗ أدخل اسم القسم بالعربي");
    try {
      setSaving(true);
      if (editId !== null) {
        await updateCategory(editId, { name: name.trim(), nameEn: nameEn.trim(), image: image.trim() });
        setEditId(null);
      } else {
        await addCategory({ name: name.trim(), nameEn: nameEn.trim(), image: image.trim() });
      }
      setName(""); setNameEn(""); setImage("");
      await refresh();
    } catch (e) {
      alert("❌ فشل الحفظ: " + (e.message || "خطأ غير معروف"));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat) => {
    setName(cat.name || ""); setNameEn(cat.nameEn || ""); setImage(cat.image || "");
    setEditId(cat.id);
  };

  const handleDelete = async (cat) => {
    if (!window.confirm("حذف هذا القسم؟")) return;
    try {
      await deleteCategory(cat.id);
      await refresh();
    } catch (e) {
      alert("❌ فشل الحذف: " + (e.message || "خطأ غير معروف"));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: "rtl" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}`}</style>

      {/* ناف */}
      <nav style={{ background: "#0F172A", borderBottom: "1px solid rgba(255,255,255,.08)", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.8)", border: "1.5px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>← رجوع</button>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>🗂 إدارة الأقسام</span>
        </div>
      </nav>

      <main style={{ maxWidth: 800, margin: "28px auto", padding: "0 20px", animation: "fadeUp .4s ease both" }}>

        {/* فورم الإضافة */}
        <div style={S.card}>
          <h3 style={{ fontWeight: 800, fontSize: 18, color: "#0F172A", marginBottom: 20 }}>
            {editId !== null ? "✏️ تعديل القسم" : "➕ إضافة قسم جديد"}
          </h3>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={S.lbl}>اسم القسم (عربي) <span style={{ color: "#EF4444" }}>*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: المنزل والمطبخ" style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={S.lbl}>Category Name (English) <span style={{ color: "#6366F1" }}>مهم للترجمة</span></label>
              <input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="e.g. Home & Kitchen" style={{ ...inputBase, direction: "ltr" }} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={S.lbl}>رابط الصورة (اختياري)</label>
              <input value={image} onChange={e => setImage(e.target.value)} placeholder="https://..." style={{ ...inputBase, direction: "ltr" }} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleAdd} disabled={saving}
                style={{ flex: 1, padding: "14px", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Tajawal',sans-serif", boxShadow: "0 6px 18px rgba(99,102,241,.3)", opacity: saving ? 0.6 : 1 }}>
                {saving ? "⏳ جاري الحفظ..." : (editId !== null ? "💾 حفظ التعديل" : "➕ إضافة القسم")}
              </button>
              {editId !== null && (
                <button onClick={() => { setEditId(null); setName(""); setNameEn(""); setImage(""); }}
                  style={{ padding: "14px 20px", background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                  إلغاء
                </button>
              )}
            </div>
          </div>
        </div>

        {/* القائمة */}
        <div style={{ ...S.card, marginTop: 20 }}>
          <h3 style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 16 }}>📋 الأقسام الحالية ({categories.length})</h3>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#94A3B8" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              <div style={{ fontWeight: 600 }}>جاري التحميل...</div>
            </div>
          ) : categories.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#94A3B8" }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🗂</div>
              <div style={{ fontWeight: 600 }}>لا توجد أقسام بعد</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {categories.map((cat) => (
                <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#F8FAFC", borderRadius: 14, border: "1px solid #F1F5F9" }}>
                  {cat.image ? (
                    <img src={cat.image} alt="" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 10, border: "1px solid #E2E8F0" }} onError={e => e.currentTarget.style.display = "none"} />
                  ) : (
                    <div style={{ width: 50, height: 50, borderRadius: 10, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff" }}>📦</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{cat.name}</div>
                    {cat.nameEn && <div style={{ fontSize: 13, color: "#6366F1", fontWeight: 600, direction: "ltr" }}>{cat.nameEn}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => startEdit(cat)} style={{ background: "#EEF2FF", color: "#6366F1", border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>✏️</button>
                    <button onClick={() => handleDelete(cat)} style={{ background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
