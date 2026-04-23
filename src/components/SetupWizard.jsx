import React, { useState } from "react";
import { inputBase, btnPrimary, focusIn, focusOut } from "../Theme";

const KEY = "kashkha_wizard_done";

export function isWizardDone() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return true; }
}

export function markWizardDone() {
  try { localStorage.setItem(KEY, "1"); } catch {}
}

const STEPS = [
  {
    id: "store", icon: "🏪", title: "معلومات متجرك",
    desc: "لنبلّش بالأساسيات. هي المعلومات اللي بتظهر للعملاء.",
    fields: [
      { key: "storeName", label: "اسم المتجر", placeholder: "كشخة", required: true },
      { key: "whatsapp", label: "رقم واتساب (بدون +)", placeholder: "971585446473", dir: "ltr", required: true },
      { key: "storeEmail", label: "البريد الإلكتروني", placeholder: "info@example.com", dir: "ltr", type: "email" },
    ],
  },
  {
    id: "shipping", icon: "🚚", title: "الشحن والطلبات",
    desc: "احدد كيف بيكون الشحن وكم رسومه.",
    fields: [
      { key: "freeShipThreshold", label: "حد الشحن المجاني (درهم)", placeholder: "200", type: "number", hint: "طلبات فوق هذا المبلغ = شحن مجاني" },
      { key: "shippingFee", label: "رسوم التوصيل (درهم)", placeholder: "15", type: "number", hint: "للطلبات تحت حد الشحن المجاني" },
      { key: "minOrderAmount", label: "الحد الأدنى للطلب (اختياري)", placeholder: "0", type: "number", hint: "حط 0 لو ما بدك حد أدنى" },
    ],
  },
  {
    id: "social", icon: "📲", title: "السوشيال ميديا",
    desc: "الروابط اللي بتظهر بالفوتر. تقدر تتخطى هالخطوة.",
    fields: [
      { key: "instagram", label: "رابط إنستغرام", placeholder: "https://instagram.com/...", dir: "ltr" },
      { key: "tiktok", label: "رابط تيك توك", placeholder: "https://tiktok.com/@...", dir: "ltr" },
      { key: "facebook", label: "رابط فيسبوك", placeholder: "https://facebook.com/...", dir: "ltr" },
    ],
  },
];

export default function SetupWizard({ onClose, onSave, initialSettings = {} }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(() => {
    const d = {};
    STEPS.forEach(s => s.fields.forEach(f => { d[f.key] = initialSettings[f.key] ?? ""; }));
    return d;
  });
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const canNext = () => current.fields.every(f => !f.required || (data[f.key] && String(data[f.key]).trim()));

  const handleNext = async () => {
    if (!canNext()) return;
    if (!isLast) { setStep(step + 1); return; }
    setSaving(true);
    try { await onSave?.(data); markWizardDone(); onClose?.(); }
    finally { setSaving(false); }
  };

  const skip = () => { markWizardDone(); onClose?.(); };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,.8)", zIndex: 1200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      fontFamily: "'Tajawal',sans-serif", direction: "rtl",
    }}>
      <style>{`@keyframes wzIn{from{opacity:0;transform:translateY(16px)}to{opacity:1}}`}</style>
      <div style={{
        background: "#fff", borderRadius: 22, maxWidth: 560, width: "100%", maxHeight: "90vh",
        overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,.4)", animation: "wzIn .3s ease",
      }}>
        {/* هيدر مع شريط تقدّم */}
        <div style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", padding: "22px 24px", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 14, opacity: 0.9 }}>خطوة {step + 1} من {STEPS.length}</span>
            <button onClick={skip} style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "none", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>تخطّي</button>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? "#fff" : "rgba(255,255,255,.3)", transition: "background .3s" }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{current.icon}</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{current.title}</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>{current.desc}</p>
            </div>
          </div>
        </div>

        {/* المحتوى */}
        <div style={{ padding: "22px 24px" }}>
          <div style={{ display: "grid", gap: 14 }}>
            {current.fields.map((f) => (
              <div key={f.key}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 700, fontSize: 13, color: "#334155" }}>
                  {f.label} {f.required && <span style={{ color: "#EF4444" }}>*</span>}
                </label>
                <input
                  type={f.type || "text"}
                  placeholder={f.placeholder}
                  value={data[f.key] || ""}
                  onChange={(e) => setData((d) => ({ ...d, [f.key]: e.target.value }))}
                  style={{ ...inputBase, direction: f.dir || "rtl" }}
                  onFocus={focusIn}
                  onBlur={focusOut}
                />
                {f.hint && <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>{f.hint}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* الأزرار */}
        <div style={{ padding: "14px 24px 22px", display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            style={{
              background: step === 0 ? "#F1F5F9" : "#EEF2FF", color: step === 0 ? "#CBD5E1" : "#6366F1",
              border: "none", borderRadius: 12, padding: "11px 20px",
              fontWeight: 800, fontSize: 13, cursor: step === 0 ? "not-allowed" : "pointer",
              fontFamily: "'Tajawal',sans-serif",
            }}
          >
            → السابق
          </button>
          <button
            onClick={handleNext}
            disabled={!canNext() || saving}
            style={{
              ...btnPrimary, padding: "11px 24px",
              opacity: canNext() && !saving ? 1 : 0.5,
              cursor: canNext() && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "⏳ جاري الحفظ..." : isLast ? "✅ إنهاء" : "التالي ←"}
          </button>
        </div>
      </div>
    </div>
  );
}
