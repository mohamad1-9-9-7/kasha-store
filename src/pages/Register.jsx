import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { inputBase, focusIn, focusOut } from "../Theme";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";
import { apiFetch, setToken } from "../api";

const EMIRATES_AR = ["دبي", "أبو ظبي", "الشارقة", "عجمان", "رأس الخيمة", "الفجيرة", "أم القيوين"];
const EMIRATES_EN = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];

export default function Register() {
  const { lang, toggle } = useLang();
  const t = k => T[lang][k] ?? T.ar[k] ?? k;
  const isRtl = lang === "ar";
  const EMIRATES = isRtl ? EMIRATES_AR : EMIRATES_EN;

  const [form, setForm] = useState({ name: "", phone: "", city: EMIRATES[0], address: "", password: "", confirmPassword: "" });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const lbl = { display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "#334155" };
  const shimmer = { background: "linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899,#6366F1)", backgroundSize: "300% auto", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "shimmer 4s linear infinite" };

  const handleRegister = async () => {
    setError("");
    const phone = form.phone.replace(/\s/g, "");
    if (!phone || !form.name.trim() || !form.address.trim()) return setError(t("err_fill_all"));
    if (!/^05\d{8}$/.test(phone)) return setError(t("err_phone_format"));
    if (form.password.length < 4) return setError(t("err_pass_short"));
    if (form.password !== form.confirmPassword) return setError(t("err_pass_mismatch"));

    setLoading(true);
    try {
      const { token, user } = await apiFetch("/api/auth/register", {
        method: "POST",
        body: { name: form.name.trim(), phone, city: form.city, address: form.address.trim(), password: form.password },
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
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: isRtl ? "rtl" : "ltr", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:480px){
          .reg-2col { grid-template-columns: 1fr !important; }
          .reg-card  { padding: 20px !important; }
        }
      `}</style>

      <div style={{ position: "fixed", top: 16, left: isRtl ? 16 : "auto", right: isRtl ? "auto" : 16, zIndex: 500 }}>
        <button onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 6, background: "#0F172A", border: "1.5px solid rgba(255,255,255,.15)", borderRadius: 10, padding: "7px 13px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "'Tajawal',sans-serif" }}>
          {t("lang_toggle")}
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: 520, animation: "fadeUp .45s ease both" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link to="/home" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 10, textDecoration: "none" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(99,102,241,.35)" }}>
              <span style={{ fontSize: 24 }}>🛍️</span>
            </div>
            <span style={{ fontSize: 28, fontWeight: 900, ...shimmer }}>{t("store_name")} ✨</span>
          </Link>
          <p style={{ color: "#64748B", fontSize: 15, marginTop: 4 }}>{t("register_title")}</p>
        </div>

        <div className="reg-card" style={{ background: "#fff", borderRadius: 24, border: "1px solid #E2E8F0", boxShadow: "0 10px 40px rgba(0,0,0,.08)", padding: "32px" }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div className="reg-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>{t("name_label")}</label>
                <input placeholder={t("name_ph")} value={form.name} onChange={set("name")} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={lbl}>{t("phone_label")}</label>
                <input type="tel" inputMode="numeric" placeholder={t("phone_ph")} value={form.phone} onChange={set("phone")} style={{ ...inputBase, direction: "ltr", textAlign: isRtl ? "right" : "left" }} onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>

            <div className="reg-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>{t("city_label")}</label>
                <select value={form.city} onChange={set("city")} style={{ ...inputBase, cursor: "pointer" }} onFocus={focusIn} onBlur={focusOut}>
                  {EMIRATES.map(em => <option key={em}>{em}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>{t("address_label")}</label>
                <input placeholder={t("address_ph")} value={form.address} onChange={set("address")} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>

            <div>
              <label style={lbl}>{t("pass_label")}</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} placeholder={t("pass_ph")} value={form.password} onChange={set("password")}
                  style={{ ...inputBase, paddingLeft: isRtl ? 16 : 44, paddingRight: isRtl ? 44 : 16 }} onFocus={focusIn} onBlur={focusOut} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", [isRtl ? "left" : "right"]: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94A3B8" }}>
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div>
              <label style={lbl}>{t("confirm_pass")}</label>
              <input type="password" placeholder="••••••••" value={form.confirmPassword} onChange={set("confirmPassword")} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>

            {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#EF4444", borderRadius: 12, padding: "12px 16px", fontSize: 14 }}>⚠️ {error}</div>}

            <button onClick={handleRegister} disabled={loading}
              style={{ width: "100%", padding: "14px", background: loading ? "#94A3B8" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", borderRadius: 14, fontWeight: 900, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 8px 24px rgba(99,102,241,.4)", fontFamily: "'Tajawal',sans-serif", marginTop: 4 }}>
              {loading ? "⏳ جاري التسجيل..." : t("register_btn")}
            </button>

            <p style={{ textAlign: "center", color: "#64748B", fontSize: 14 }}>
              {t("have_account")}{" "}
              <Link to="/user-login" style={{ color: "#6366F1", fontWeight: 800 }}>{t("login_link")}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
