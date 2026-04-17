import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";
import LangToggle from "./LangToggle";

const shimmerStyle = {
  background: "linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899,#6366F1)",
  backgroundSize: "300% auto",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  animation: "shimmer 4s linear infinite",
};

export default function MiniNav({ title, backTo, showCart = true, extra }) {
  const navigate  = useNavigate();
  const { lang }  = useLang();
  const t         = k => T[lang][k] ?? T.ar[k] ?? k;
  const isRtl     = lang === "ar";
  const goBack    = () => (backTo ? navigate(backTo) : navigate(-1));

  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}`}</style>
      <nav style={{
        background: "#0F172A",
        borderBottom: "1px solid rgba(255,255,255,.08)",
        boxShadow: "0 2px 16px rgba(0,0,0,.2)",
        padding: "0 20px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 400,
        fontFamily: "'Tajawal',sans-serif",
        direction: isRtl ? "rtl" : "ltr",
        gap: 10,
      }}>
        {/* يسار: رجوع */}
        <button onClick={goBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.85)", border: "1.5px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", transition: "all .15s", flexShrink: 0 }}
          onMouseOver={e => { e.currentTarget.style.background = "rgba(99,102,241,.25)"; e.currentTarget.style.borderColor = "#6366F1"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.12)"; }}>
          {t("back")}
        </button>

        {/* وسط: الشعار */}
        <Link to="/home" style={{ fontSize: 20, fontWeight: 900, lineHeight: 1, textDecoration: "none" }}>
          <span style={shimmerStyle}>{t("store_name")}</span>
          <span style={{ color: "#fff" }}> ✨</span>
        </Link>

        {/* يمين: سلة + تبديل لغة */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {extra}
          <LangToggle />
          {showCart && (
            <Link to="/cart"
              style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", borderRadius: 10, padding: "9px 14px", fontWeight: 800, fontSize: 13, boxShadow: "0 4px 12px rgba(99,102,241,.35)", whiteSpace: "nowrap" }}>
              {t("cart_btn")}
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
