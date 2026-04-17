import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";

const shimmer = {
  background: "linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899,#6366F1)",
  backgroundSize: "300% auto", WebkitBackgroundClip: "text", backgroundClip: "text",
  color: "transparent", animation: "shimmer 4s linear infinite",
};

export default function NotFound() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = k => T[lang][k] ?? T.ar[k] ?? k;
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0F172A,#1E1B4B,#0C4A6E)", fontFamily: "'Tajawal',sans-serif", direction: lang === "ar" ? "rtl" : "ltr", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <style>{`@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}} @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* دوائر زخرفية */}
      <div style={{ position: "absolute", top: -120, right: -120, width: 400, height: 400, borderRadius: "50%", background: "rgba(99,102,241,.15)", filter: "blur(60px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(236,72,153,.12)", filter: "blur(60px)", pointerEvents: "none" }} />

      {/* المحتوى */}
      <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 120, lineHeight: 1, marginBottom: 8, animation: "float 4s ease-in-out infinite" }}>🛍️</div>
        <div style={{ fontSize: "clamp(80px,15vw,140px)", fontWeight: 900, lineHeight: 1, marginBottom: 8, animation: "fadeUp .5s ease both" }}>
          <span style={shimmer}>404</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 12, animation: "fadeUp .5s .1s ease both" }}>
          {t("not_found_title")}
        </h1>
        <p style={{ color: "rgba(255,255,255,.6)", fontSize: 15, marginBottom: 36, animation: "fadeUp .5s .2s ease both" }}>
          {t("not_found_desc")} 🚀
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", animation: "fadeUp .5s .3s ease both" }}>
          <Link to="/home"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", borderRadius: 14, padding: "13px 28px", fontWeight: 900, fontSize: 15, boxShadow: "0 8px 24px rgba(99,102,241,.45)" }}>
            🏠 {t("nav_home")}
          </Link>
          <button onClick={() => navigate(-1)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.08)", color: "#fff", border: "1.5px solid rgba(255,255,255,.15)", borderRadius: 14, padding: "13px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
            {t("back")}
          </button>
        </div>
      </div>
    </div>
  );
}
