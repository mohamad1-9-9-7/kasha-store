import React, { useEffect, useState } from "react";

/**
 * مودال تأكيد للإجراءات الخطرة. العميل لازم يكتب كلمة محدّدة قبل ما يضغط تأكيد.
 */
export default function DangerConfirm({ open, title, message, requiredText = "حذف", onConfirm, onCancel, busy }) {
  const [typed, setTyped] = useState("");
  useEffect(() => { if (!open) setTyped(""); }, [open]);

  if (!open) return null;

  const match = typed.trim() === requiredText;

  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,.75)", zIndex: 1100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      animation: "dcFade .18s ease",
    }}>
      <style>{`
        @keyframes dcFade{from{opacity:0}to{opacity:1}}
        @keyframes dcIn{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes dcShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
      `}</style>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 18, padding: "24px", maxWidth: 440, width: "100%",
        boxShadow: "0 24px 64px rgba(0,0,0,.35)", animation: "dcIn .22s ease",
        fontFamily: "'Tajawal',sans-serif", border: "2px solid #FECACA",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>🚨</div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#EF4444" }}>{title}</h3>
        </div>
        <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.7, marginBottom: 16 }}>{message}</p>

        <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#991B1B", fontWeight: 700, marginBottom: 6 }}>
            للتأكيد اكتب <span style={{ background: "#fff", padding: "2px 8px", borderRadius: 6, color: "#EF4444", fontWeight: 900 }}>{requiredText}</span> بالأسفل:
          </div>
          <input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={requiredText}
            autoFocus
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10,
              border: `1.5px solid ${typed && !match ? "#EF4444" : "#E2E8F0"}`,
              fontSize: 14, fontWeight: 700, outline: "none", background: "#fff",
              fontFamily: "'Tajawal',sans-serif", boxSizing: "border-box",
              animation: typed && !match ? "dcShake .3s" : "none",
            }}
          />
          {typed && !match && <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4, fontWeight: 700 }}>النص غير مطابق</div>}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={busy}
            style={{ background: "#F1F5F9", color: "#334155", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", fontFamily: "'Tajawal',sans-serif" }}>
            إلغاء
          </button>
          <button
            onClick={() => match && !busy && onConfirm()}
            disabled={!match || busy}
            style={{
              background: match ? "#EF4444" : "#FCA5A5", color: "#fff",
              border: "none", borderRadius: 10, padding: "10px 20px",
              fontWeight: 800, fontSize: 13,
              cursor: (match && !busy) ? "pointer" : "not-allowed",
              fontFamily: "'Tajawal',sans-serif",
              boxShadow: match ? "0 6px 18px rgba(239,68,68,.3)" : "none",
            }}>
            {busy ? "⏳ جاري..." : "🗑️ نفّذ الحذف"}
          </button>
        </div>
      </div>
    </div>
  );
}
