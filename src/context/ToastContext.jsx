import React, { createContext, useCallback, useContext, useState } from "react";
import { useLang } from "./LanguageContext";

const ToastCtx = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const { lang } = useLang() || { lang: "en" };
  const isRtl = lang === "ar";

  const toast = useCallback((msg, type = "success", duration = 3500) => {
    const id = ++_id;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, []);

  const remove = (id) => setToasts(t => t.filter(x => x.id !== id));

  const ICONS  = { success: "✅", error: "❌", info: "💡", warning: "⚠️" };
  const COLORS = {
    success: { bg: "#ECFDF5", border: "#6EE7B7", color: "#065F46" },
    error:   { bg: "#FEF2F2", border: "#FCA5A5", color: "#991B1B" },
    info:    { bg: "#EFF6FF", border: "#93C5FD", color: "#1E40AF" },
    warning: { bg: "#FFFBEB", border: "#FCD34D", color: "#92400E" },
  };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div style={{ position: "fixed", top: 20, [isRtl ? "right" : "left"]: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, direction: isRtl ? "rtl" : "ltr", fontFamily: "'Tajawal',sans-serif" }}>
        {toasts.map(t => {
          const c = COLORS[t.type] || COLORS.info;
          return (
            <div key={t.id}
              style={{ display: "flex", alignItems: "center", gap: 10, background: c.bg, border: `1.5px solid ${c.border}`, color: c.color, borderRadius: 14, padding: "12px 16px", minWidth: 260, maxWidth: 360, boxShadow: "0 8px 24px rgba(0,0,0,.12)", animation: "toastIn .3s ease both", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
              onClick={() => remove(t.id)}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{ICONS[t.type]}</span>
              <span style={{ flex: 1 }}>{t.msg}</span>
              <span style={{ opacity: .5, fontSize: 16, flexShrink: 0 }}>×</span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
