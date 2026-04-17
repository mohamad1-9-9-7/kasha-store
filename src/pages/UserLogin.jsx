import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";
import { useSettings } from "../hooks/useSettings";
import { apiFetch, setToken } from "../api";

const TikTokIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#010101" />
    <path d="M16.6 5.82a4.49 4.49 0 0 1-2.91-2.8h-2.28v11.4c0 1.22-.99 2.2-2.22 2.2a2.21 2.21 0 0 1-2.21-2.2 2.21 2.21 0 0 1 2.21-2.21c.22 0 .43.03.63.09V9.97a4.5 4.5 0 0 0-.63-.04 4.5 4.5 0 0 0-4.5 4.5 4.5 4.5 0 0 0 4.5 4.5 4.5 4.5 0 0 0 4.5-4.5V9.61a6.77 6.77 0 0 0 3.97 1.27V8.62a4.5 4.5 0 0 1-1.06-.8z" fill="white" />
  </svg>
);
const InstagramIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs><radialGradient id="ig2" cx="30%" cy="107%" r="150%"><stop offset="0%" stopColor="#fdf497" /><stop offset="45%" stopColor="#fd5949" /><stop offset="60%" stopColor="#d6249f" /><stop offset="90%" stopColor="#285AEB" /></radialGradient></defs>
    <rect width="24" height="24" rx="6" fill="url(#ig2)" />
    <rect x="6" y="6" width="12" height="12" rx="3.5" stroke="white" strokeWidth="1.5" fill="none" />
    <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.5" fill="none" />
    <circle cx="16.2" cy="7.8" r="0.9" fill="white" />
  </svg>
);
const FacebookIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#1877F2" />
    <path d="M13.5 21v-7.5h2.25l.375-2.625H13.5V9.75c0-.75.375-1.5 1.5-1.5h1.5V5.625S15.375 5.25 14.25 5.25c-2.25 0-3.75 1.5-3.75 3.75v1.875H8.25V13.5H10.5V21" fill="white" />
  </svg>
);
const TwitterXIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#000" />
    <path d="M17.5 5h-2.7L12 8.8 9.5 5H5l4.8 6.8L5 19h2.7l2.9-4.1L13.5 19H18l-5-7z" fill="white" />
  </svg>
);

const inp = {
  width: "100%", padding: "13px 16px", borderRadius: 12,
  border: "1.5px solid #E2E8F0", fontSize: 15, color: "#1E293B",
  background: "#F8FAFC", outline: "none", boxSizing: "border-box",
  fontFamily: "'Tajawal', sans-serif", transition: "border-color 0.18s, box-shadow 0.18s",
};

export default function UserLogin() {
  const { lang, toggle } = useLang();
  const t = k => T[lang][k] ?? T.ar[k] ?? k;
  const isRtl = lang === "ar";
  const { settings: storeSettings } = useSettings();

  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const SOCIAL = [
    { name: "Instagram", Icon: InstagramIcon, href: storeSettings.instagram || "https://instagram.com" },
    { name: "TikTok",    Icon: TikTokIcon,    href: storeSettings.tiktok    || "https://tiktok.com" },
    { name: "Facebook",  Icon: FacebookIcon,  href: storeSettings.facebook  || "https://facebook.com" },
    { name: "Twitter",   Icon: TwitterXIcon,  href: storeSettings.twitter   || "https://x.com" },
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const p = phone.trim();
    if (!p || !password) return setError(t("err_fill_all"));
    setLoading(true);
    try {
      const { token, user } = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { phone: p, password },
      });
      setToken(token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.removeItem("isAdmin");
      navigate("/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: isRtl ? "rtl" : "ltr", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:640px){
          .login-panel { display: none !important; }
          .login-card  { border-radius: 20px !important; }
          .login-form  { padding: 32px 24px !important; }
        }
      `}</style>

      <div style={{ position: "fixed", top: 16, left: isRtl ? 16 : "auto", right: isRtl ? "auto" : 16, zIndex: 500 }}>
        <button onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 6, background: "#0F172A", border: "1.5px solid rgba(255,255,255,.15)", borderRadius: 10, padding: "7px 13px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "'Tajawal',sans-serif" }}>
          {t("lang_toggle")}
        </button>
      </div>

      <div className="login-card" style={{ display: "flex", width: "100%", maxWidth: 900, borderRadius: 28, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.14)", minHeight: 560, animation: "fadeUp .45s ease both" }}>

        <div className="login-form" style={{ flex: 1, background: "#fff", padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Link to="/home" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28, textDecoration: "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 20 }}>🛍️</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, background: "linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899,#6366F1)", backgroundSize: "300% auto", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "shimmer 4s linear infinite" }}>
              {t("store_name")} ✨
            </span>
          </Link>

          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", marginBottom: 6 }}>{t("login_title")}</h2>
          <p style={{ color: "#64748B", fontSize: 14, marginBottom: 28 }}>{t("login_desc")}</p>

          <form onSubmit={handleLogin} style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, color: "#475569" }}>{t("phone_label")}</label>
              <input type="tel" inputMode="numeric" placeholder={t("phone_ph")} value={phone} onChange={e => setPhone(e.target.value)} style={{ ...inp, direction: "ltr", textAlign: isRtl ? "right" : "left" }}
                onFocus={e => { e.target.style.borderColor = "#6366F1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.1)"; }}
                onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, color: "#475569" }}>{t("pass_label")}</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} placeholder={t("pass_ph")} value={password} onChange={e => setPassword(e.target.value)}
                  style={{ ...inp, paddingLeft: isRtl ? 16 : 44, paddingRight: isRtl ? 44 : 16 }}
                  onFocus={e => { e.target.style.borderColor = "#6366F1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", [isRtl ? "left" : "right"]: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 17, color: "#94A3B8" }}>
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#EF4444", borderRadius: 12, padding: "10px 14px", fontSize: 13 }}>⚠️ {error}</div>}

            <button type="submit" disabled={loading}
              style={{ background: loading ? "#94A3B8" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", borderRadius: 14, padding: "14px", fontWeight: 900, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 8px 20px rgba(99,102,241,.35)", fontFamily: "'Tajawal',sans-serif" }}>
              {loading ? "⏳ جاري الدخول..." : t("login_btn")}
            </button>
          </form>

          <div style={{ textAlign: "center", margin: "20px 0 16px", color: "#94A3B8", fontSize: 13, position: "relative" }}>
            <span style={{ background: "#fff", padding: "0 12px", position: "relative", zIndex: 1 }}>{t("follow_us")}</span>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "#E2E8F0", zIndex: 0 }} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {SOCIAL.map(s => (
              <a key={s.name} href={s.href} target="_blank" rel="noreferrer" title={s.name}
                style={{ display: "flex", transition: "transform .15s" }}
                onMouseOver={e => e.currentTarget.style.transform = "scale(1.18)"}
                onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}>
                <s.Icon size={28} />
              </a>
            ))}
          </div>

          <p style={{ textAlign: "center", color: "#64748B", fontSize: 13, marginTop: 22 }}>
            {t("no_account")}{" "}
            <Link to="/register" style={{ color: "#6366F1", fontWeight: 800 }}>{t("register_link")}</Link>
          </p>
        </div>

        <div className="login-panel" style={{ width: 340, background: "linear-gradient(160deg,#0F172A 0%,#1E1B4B 50%,#0C4A6E 100%)", padding: "48px 32px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, left: -80, width: 260, height: 260, borderRadius: "50%", background: "rgba(99,102,241,.15)", filter: "blur(40px)" }} />
          <div style={{ position: "absolute", bottom: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(236,72,153,.12)", filter: "blur(40px)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(255,255,255,.15)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, marginBottom: 28, border: "1.5px solid rgba(255,255,255,.2)" }}>🛍️</div>
            <h3 style={{ color: "#fff", fontSize: 24, fontWeight: 900, marginBottom: 10, lineHeight: 1.3 }}>{t("welcome_back")}</h3>
            <p style={{ color: "rgba(255,255,255,.7)", fontSize: 14, lineHeight: 1.8 }}>{t("welcome_desc")}</p>
            <div style={{ marginTop: 28, display: "grid", gap: 10 }}>
              {t("features_list").map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,.8)", fontSize: 13 }}>{f}</div>
              ))}
            </div>
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <a href={`https://wa.me/${storeSettings.whatsapp || "971585446473"}`} target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(37,211,102,.2)", border: "1px solid rgba(37,211,102,.4)", borderRadius: 14, padding: "12px 16px", color: "#fff", textDecoration: "none" }}>
              <span style={{ fontSize: 22 }}>💬</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{t("contact_us")}</div>
                <div style={{ fontSize: 11, opacity: .75 }}>{t("wa_reply")}</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
