import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { inputBase, focusIn, focusOut, fmt } from "../Theme";
import { useToast } from "../context/ToastContext";
import { useCoupons, saveCoupon, updateCoupon, deleteCoupon } from "../hooks/useCoupons";

const lbl = { display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "#334155" };
const CARD = { background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: "0 2px 12px rgba(0,0,0,.06)", padding: "24px" };

const emptyForm = { code: "", type: "percent", value: "", minOrder: "", maxUses: "", expiry: "" };

export default function CouponsPage() {
  const navigate = useNavigate();
  const toast    = useToast();
  const { coupons, loading } = useCoupons();
  const [form, setForm]       = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (localStorage.getItem("isAdmin") !== "true") navigate("/user-login");
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.code.trim() || !form.value) return toast("يرجى تعبئة الرمز والقيمة", "error");
    const code = form.code.trim().toUpperCase();
    const existing = coupons.find(c => c.code === code && c.code !== editing);
    if (existing) return toast("هذا الرمز موجود مسبقاً", "error");

    if (editing) {
      await saveCoupon({ ...coupons.find(c => c.code === editing), code, type: form.type, value: Number(form.value), minOrder: Number(form.minOrder) || 0, maxUses: Number(form.maxUses) || 999, expiry: form.expiry || null });
    } else {
      await saveCoupon({ code, type: form.type, value: Number(form.value), minOrder: Number(form.minOrder) || 0, maxUses: Number(form.maxUses) || 999, uses: 0, expiry: form.expiry || null, active: true, createdAt: new Date().toISOString() });
    }
    setForm(emptyForm);
    setEditing(null);
    toast(editing ? "✅ تم تحديث الكوبون" : "✅ تم إنشاء الكوبون", "success");
  };

  const toggleActive = async (code) => {
    const c = coupons.find(x => x.code === code);
    if (c) await updateCoupon(code, { active: !c.active });
  };

  const remove = async (code) => {
    if (!window.confirm(`حذف كوبون ${code}؟`)) return;
    await deleteCoupon(code);
    toast("🗑️ تم الحذف", "success");
  };

  const startEdit = (c) => {
    setEditing(c.code);
    setForm({ code: c.code, type: c.type, value: String(c.value), minOrder: String(c.minOrder || ""), maxUses: String(c.maxUses || ""), expiry: c.expiry || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isExpired = (c) => c.expiry && new Date(c.expiry) < new Date();
  const isExhausted = (c) => c.uses >= c.maxUses;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: "rtl" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* هيدر */}
      <div style={{ background: "linear-gradient(135deg,#0F172A,#1E1B4B)", padding: "20px 28px", display: "flex", alignItems: "center", gap: 16 }}>
        <Link to="/admin-dashboard" style={{ color: "rgba(255,255,255,.7)", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>← لوحة التحكم</Link>
        <div style={{ color: "rgba(255,255,255,.3)" }}>|</div>
        <span style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>🎟️ إدارة الكوبونات</span>
      </div>

      <main style={{ maxWidth: 900, margin: "28px auto", padding: "0 20px", animation: "fadeUp .4s ease both", display: "grid", gap: 24 }}>

        {/* فورم الإنشاء */}
        <div style={CARD}>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: "#0F172A", marginBottom: 20 }}>
            {editing ? `✏️ تعديل كوبون: ${editing}` : "➕ إنشاء كوبون جديد"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
            <div>
              <label style={lbl}>رمز الكوبون</label>
              <input value={form.code} onChange={set("code")} placeholder="مثال: SAVE20" style={{ ...inputBase, textTransform: "uppercase" }} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={lbl}>نوع الخصم</label>
              <select value={form.type} onChange={set("type")} style={{ ...inputBase, cursor: "pointer" }} onFocus={focusIn} onBlur={focusOut}>
                <option value="percent">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (AED)</option>
              </select>
            </div>
            <div>
              <label style={lbl}>{form.type === "percent" ? "نسبة الخصم (%)" : "مبلغ الخصم (AED)"}</label>
              <input type="number" value={form.value} onChange={set("value")} placeholder={form.type === "percent" ? "20" : "50"} min="1" max={form.type === "percent" ? "100" : undefined} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={lbl}>الحد الأدنى للطلب (AED)</label>
              <input type="number" value={form.minOrder} onChange={set("minOrder")} placeholder="0 = بدون حد" min="0" style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={lbl}>الحد الأقصى للاستخدام</label>
              <input type="number" value={form.maxUses} onChange={set("maxUses")} placeholder="فارغ = غير محدود" min="1" style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={lbl}>تاريخ الانتهاء</label>
              <input type="date" value={form.expiry} onChange={set("expiry")} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button onClick={save} style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
              {editing ? "💾 حفظ التعديلات" : "✅ إنشاء الكوبون"}
            </button>
            {editing && (
              <button onClick={() => { setEditing(null); setForm(emptyForm); }} style={{ padding: "13px 20px", background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                إلغاء
              </button>
            )}
          </div>
        </div>

        {/* قائمة الكوبونات */}
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: "#0F172A" }}>🎟️ الكوبونات ({coupons.length})</h2>
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              <p>جاري التحميل...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎟️</div>
              <p>لا توجد كوبونات بعد. أنشئ واحدًا!</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {coupons.map(c => {
                const expired   = isExpired(c);
                const exhausted = isExhausted(c);
                const status    = !c.active ? "غير نشط" : expired ? "منتهي" : exhausted ? "استُنفذ" : "نشط";
                const statusCol = !c.active ? "#94A3B8" : expired ? "#EF4444" : exhausted ? "#F59E0B" : "#10B981";
                const statusBg  = !c.active ? "#F1F5F9" : expired ? "#FEF2F2" : exhausted ? "#FFFBEB" : "#ECFDF5";
                return (
                  <div key={c.code} style={{ border: "1.5px solid #F1F5F9", borderRadius: 14, padding: "16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: (!c.active || expired || exhausted) ? "#FAFAFA" : "#fff" }}>
                    <div style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 10, padding: "8px 14px", fontWeight: 900, fontSize: 16, letterSpacing: 1, fontFamily: "monospace" }}>{c.code}</div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A" }}>
                        {c.type === "percent" ? `${c.value}% خصم` : `${fmt(c.value)} خصم`}
                        {c.minOrder > 0 && <span style={{ color: "#94A3B8", fontWeight: 600, fontSize: 12, marginRight: 8 }}>• حد أدنى {fmt(c.minOrder)}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
                        الاستخدام: {c.uses}/{c.maxUses >= 999 ? "∞" : c.maxUses}
                        {c.expiry && <span style={{ marginRight: 8 }}>• ينتهي: {new Date(c.expiry).toLocaleDateString("ar-EG")}</span>}
                      </div>
                    </div>
                    <span style={{ background: statusBg, color: statusCol, borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{status}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => toggleActive(c.code)} style={{ padding: "7px 12px", background: c.active ? "#FFFBEB" : "#ECFDF5", color: c.active ? "#B45309" : "#059669", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                        {c.active ? "تعطيل" : "تفعيل"}
                      </button>
                      <button onClick={() => startEdit(c)} style={{ padding: "7px 12px", background: "#EEF2FF", color: "#6366F1", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>✏️</button>
                      <button onClick={() => remove(c.code)} style={{ padding: "7px 12px", background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
