import React, { useState, useRef, useEffect } from "react";

/**
 * شارة ❓ بتفتح tooltip لما تدوس عليها
 * الاستخدام: <HelpTip text="شرح الحقل" />
 */
export default function HelpTip({ text, title, placement = "top" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const pos = {
    top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
    left: { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  }[placement] || {};

  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-flex", marginInlineStart: 6, verticalAlign: "middle" }}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
        aria-label="شو هاد؟"
        style={{
          width: 18, height: 18, borderRadius: "50%",
          background: open ? "#6366F1" : "#EEF2FF",
          color: open ? "#fff" : "#6366F1",
          border: "none", cursor: "pointer",
          fontSize: 11, fontWeight: 900, padding: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Tajawal',sans-serif", lineHeight: 1,
          transition: "background .15s, color .15s",
        }}
      >
        ?
      </button>
      {open && (
        <div
          role="tooltip"
          style={{
            position: "absolute", zIndex: 100, ...pos,
            background: "#0F172A", color: "#fff", padding: "10px 12px",
            borderRadius: 10, fontSize: 12, lineHeight: 1.6, fontWeight: 600,
            fontFamily: "'Tajawal',sans-serif", textAlign: "start",
            width: "max-content", maxWidth: 280,
            boxShadow: "0 8px 24px rgba(0,0,0,.3)",
            animation: "tipIn .15s ease",
          }}
        >
          {title && <div style={{ fontWeight: 900, marginBottom: 4, color: "#A5B4FC" }}>{title}</div>}
          {text}
        </div>
      )}
      <style>{`@keyframes tipIn{from{opacity:0;transform:translateY(4px) translateX(-50%)}to{opacity:1}}`}</style>
    </span>
  );
}
