import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";
import { useSettings } from "../hooks/useSettings";
import { apiFetch, setToken } from "../api";

const EMIRATES_AR = ["دبي", "أبو ظبي", "الشارقة", "عجمان", "رأس الخيمة", "الفجيرة", "أم القيوين"];
const EMIRATES_EN = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];

/**
 * صفحة Login/Register موحّدة مع تحويلة بصرية ناعمة بين النمطين.
 * الاستخدام:
 *   <AuthPage mode="login" />    ← تبدأ بـ Login
 *   <AuthPage mode="register" /> ← تبدأ بـ Register
 */
export default function AuthPage({ mode: initialMode = "login" }) {
  const { lang, toggle } = useLang();
  const t = (k) => T[lang][k] ?? T.ar[k] ?? k;
  const isRtl = lang === "ar";
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // sync with url
  useEffect(() => {
    const path = mode === "login" ? "/user-login" : "/register";
    if (window.location.pathname !== path) {
      window.history.replaceState(null, "", path);
    }
  }, [mode]);

  // ── حقول تسجيل الدخول
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // ── حقول التسجيل
  const EMIRATES = isRtl ? EMIRATES_AR : EMIRATES_EN;
  const [rForm, setRForm] = useState({ name: "", phone: "", city: EMIRATES[0], address: "", password: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState(false);
  const setR = (k) => (e) => setRForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    setError("");
    if (!loginPhone.trim() || !loginPass) return setError(t("err_fill_all"));
    setLoading(true);
    try {
      const { token, user } = await apiFetch("/api/auth/login", {
        method: "POST", body: { phone: loginPhone.trim(), password: loginPass },
      });
      setToken(token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.removeItem("isAdmin");
      navigate("/home");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e?.preventDefault?.();
    setError("");
    const phone = rForm.phone.replace(/\s/g, "");
    if (!phone || !rForm.name.trim() || !rForm.address.trim()) return setError(t("err_fill_all"));
    if (!/^05\d{8}$/.test(phone)) return setError(t("err_phone_format"));
    if (rForm.password.length < 4) return setError(t("err_pass_short"));
    if (rForm.password !== rForm.confirmPassword) return setError(t("err_pass_mismatch"));
    setLoading(true);
    try {
      const { token, user } = await apiFetch("/api/auth/register", {
        method: "POST",
        body: { name: rForm.name.trim(), phone, city: rForm.city, address: rForm.address.trim(), password: rForm.password },
      });
      setToken(token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.removeItem("isAdmin");
      navigate("/home");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const isLogin = mode === "login";

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", fontFamily: "'Tajawal',sans-serif", direction: isRtl ? "rtl" : "ltr", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      <style>{AUTH_CSS}</style>

      {/* خلفية نابضة */}
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />
      <div className="auth-glow auth-glow-3" />

      {/* زر اللغة */}
      <button onClick={toggle}
        style={{
          position: "fixed", top: 16, [isRtl ? "left" : "right"]: 16, zIndex: 500,
          background: "rgba(255,255,255,.08)", border: "1.5px solid rgba(255,255,255,.15)",
          borderRadius: 10, padding: "7px 13px", fontWeight: 700, fontSize: 13, cursor: "pointer",
          color: "#fff", fontFamily: "'Tajawal',sans-serif", backdropFilter: "blur(8px)",
        }}>
        {t("lang_toggle")}
      </button>

      <div className={`auth-card ${isLogin ? "is-login" : "is-register"}`}>

        {/* نموذج تسجيل الدخول */}
        <form className="auth-pane auth-login-pane" onSubmit={handleLogin}>
          <div className="auth-pane-inner">
            <Link to="/home" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18, textDecoration: "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 18 }}>🛍️</span>
              </div>
              <span className="auth-logo">{t("store_name")} ✨</span>
            </Link>

            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#F8FAFC", margin: "0 0 6px" }}>{t("login_title")}</h2>
            <p style={{ color: "#94A3B8", fontSize: 13, margin: "0 0 22px" }}>{t("login_desc")}</p>

            <div className="auth-input">
              <span className="auth-input-icon">📱</span>
              <input type="tel" inputMode="numeric" placeholder={t("phone_label")}
                value={loginPhone} onChange={e => setLoginPhone(e.target.value)}
                style={{ direction: "ltr", textAlign: isRtl ? "right" : "left" }} />
            </div>

            <div className="auth-input">
              <span className="auth-input-icon">🔒</span>
              <input type={showPw ? "text" : "password"} placeholder={t("pass_label")}
                value={loginPass} onChange={e => setLoginPass(e.target.value)} />
              <button type="button" onClick={() => setShowPw(v => !v)} className="auth-input-eye">
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>

            {!isLogin ? null : error && <div className="auth-error">⚠️ {error}</div>}

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? "⏳" : t("login_btn")}
            </button>

            <p className="auth-switch">
              {t("no_account")}{" "}
              <button type="button" onClick={() => { setMode("register"); setError(""); }} className="auth-switch-btn">
                {t("register_link")}
              </button>
            </p>
          </div>
        </form>

        {/* نموذج التسجيل */}
        <form className="auth-pane auth-register-pane" onSubmit={handleRegister}>
          <div className="auth-pane-inner">
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#F8FAFC", margin: "0 0 6px" }}>{t("register_title")}</h2>
            <p style={{ color: "#94A3B8", fontSize: 13, margin: "0 0 18px" }}>{t("welcome_desc")}</p>

            <div className="auth-grid-2">
              <div className="auth-input auth-input-sm">
                <span className="auth-input-icon">👤</span>
                <input placeholder={t("name_label")} value={rForm.name} onChange={setR("name")} />
              </div>
              <div className="auth-input auth-input-sm">
                <span className="auth-input-icon">📱</span>
                <input type="tel" inputMode="numeric" placeholder={t("phone_label")}
                  value={rForm.phone} onChange={setR("phone")}
                  style={{ direction: "ltr", textAlign: isRtl ? "right" : "left" }} />
              </div>
            </div>

            <div className="auth-grid-2">
              <div className="auth-input auth-input-sm">
                <span className="auth-input-icon">🏙️</span>
                <select value={rForm.city} onChange={setR("city")}>
                  {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
                </select>
              </div>
              <div className="auth-input auth-input-sm">
                <span className="auth-input-icon">📍</span>
                <input placeholder={t("address_label")} value={rForm.address} onChange={setR("address")} />
              </div>
            </div>

            <div className="auth-input auth-input-sm">
              <span className="auth-input-icon">🔒</span>
              <input type={showPw ? "text" : "password"} placeholder={t("pass_label")}
                value={rForm.password} onChange={setR("password")} />
              <button type="button" onClick={() => setShowPw(v => !v)} className="auth-input-eye">
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>

            <div className="auth-input auth-input-sm">
              <span className="auth-input-icon">✓</span>
              <input type="password" placeholder={t("confirm_pass")} value={rForm.confirmPassword} onChange={setR("confirmPassword")} />
            </div>

            {!isLogin && error && <div className="auth-error">⚠️ {error}</div>}

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? "⏳" : t("register_btn")}
            </button>

            <p className="auth-switch">
              {t("have_account")}{" "}
              <button type="button" onClick={() => { setMode("login"); setError(""); }} className="auth-switch-btn">
                {t("login_link")}
              </button>
            </p>
          </div>
        </form>

        {/* اللوحة المتحرّكة (الترحيب / الانضمام) */}
        <div className="auth-welcome">
          <div className="auth-welcome-side auth-welcome-login">
            <div style={{ fontSize: 36, marginBottom: 14 }}>👋</div>
            <h3 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: "0 0 10px", letterSpacing: 0.3 }}>{t("welcome_back")}</h3>
            <p style={{ color: "rgba(255,255,255,.85)", fontSize: 14, lineHeight: 1.7, margin: 0, maxWidth: 260 }}>{t("welcome_desc")}</p>

            <div style={{ marginTop: 22, display: "grid", gap: 8 }}>
              {(t("features_list") || []).map((f, i) => (
                <div key={i} style={{ color: "rgba(255,255,255,.9)", fontSize: 12 }}>{f}</div>
              ))}
            </div>

            <button onClick={() => { setMode("register"); setError(""); }} className="auth-ghost-btn">
              {t("register_link")} →
            </button>
          </div>

          <div className="auth-welcome-side auth-welcome-register">
            <div style={{ fontSize: 36, marginBottom: 14 }}>🎉</div>
            <h3 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: "0 0 10px", letterSpacing: 0.3 }}>
              {isRtl ? "انضمّ إلينا!" : "Join Us!"}
            </h3>
            <p style={{ color: "rgba(255,255,255,.85)", fontSize: 14, lineHeight: 1.7, margin: 0, maxWidth: 260 }}>
              {isRtl ? "اعمل حساب جديد واستمتع بالعروض والنقط ✨" : "Create an account and enjoy offers and points ✨"}
            </p>

            <div style={{ marginTop: 22, display: "grid", gap: 8 }}>
              {(t("features_list") || []).map((f, i) => (
                <div key={i} style={{ color: "rgba(255,255,255,.9)", fontSize: 12 }}>{f}</div>
              ))}
            </div>

            <button onClick={() => { setMode("login"); setError(""); }} className="auth-ghost-btn">
              ← {t("login_link")}
            </button>
          </div>

          {settings?.whatsapp && (
            <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="auth-wa">
              💬 {t("contact_us")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ CSS ═══════════════ */
const AUTH_CSS = `
/* خلفية متحرّكة */
.auth-glow { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.55; pointer-events: none; }
.auth-glow-1 { width: 420px; height: 420px; top: -160px; left: -120px; background: radial-gradient(circle, #6366F1 0%, transparent 70%); animation: authGlow1 14s ease-in-out infinite; }
.auth-glow-2 { width: 380px; height: 380px; bottom: -120px; right: -100px; background: radial-gradient(circle, #EC4899 0%, transparent 70%); animation: authGlow2 16s ease-in-out infinite; }
.auth-glow-3 { width: 300px; height: 300px; top: 40%; left: 50%; transform: translate(-50%,-50%); background: radial-gradient(circle, #8B5CF6 0%, transparent 70%); animation: authGlow3 12s ease-in-out infinite; opacity: .35; }
@keyframes authGlow1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,30px) scale(1.1); } }
@keyframes authGlow2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,-40px) scale(1.15); } }
@keyframes authGlow3 { 0%,100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.2); } }

@keyframes authIn { from { opacity: 0; transform: translateY(20px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }

/* البطاقة */
.auth-card {
  position: relative;
  width: 100%;
  max-width: 880px;
  height: 560px;
  background: rgba(15, 23, 42, .7);
  border: 1.5px solid rgba(255,255,255,.08);
  border-radius: 24px;
  overflow: hidden;
  backdrop-filter: blur(24px);
  box-shadow: 0 32px 80px rgba(0,0,0,.55);
  animation: authIn .45s ease both;
  z-index: 2;
}

/* ألواح النماذج */
.auth-pane {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 38px;
  box-sizing: border-box;
  transition: transform .7s cubic-bezier(.65,0,.3,1), opacity .35s ease;
  z-index: 1;
}
.auth-pane-inner { width: 100%; max-width: 340px; }

/* وضعية LTR: Login يسار، Register يمين */
[dir="ltr"] .auth-login-pane    { left: 0; }
[dir="ltr"] .auth-register-pane { left: 0; opacity: 0; pointer-events: none; }
[dir="ltr"] .auth-card.is-register .auth-login-pane    { transform: translateX(100%); opacity: 0; pointer-events: none; }
[dir="ltr"] .auth-card.is-register .auth-register-pane { transform: translateX(100%); opacity: 1; pointer-events: auto; }

/* وضعية RTL: Login يمين، Register يمين (تتبدّل) */
[dir="rtl"] .auth-login-pane    { right: 0; }
[dir="rtl"] .auth-register-pane { right: 0; opacity: 0; pointer-events: none; }
[dir="rtl"] .auth-card.is-register .auth-login-pane    { transform: translateX(-100%); opacity: 0; pointer-events: none; }
[dir="rtl"] .auth-card.is-register .auth-register-pane { transform: translateX(-100%); opacity: 1; pointer-events: auto; }

/* لوحة الترحيب المتحرّكة */
.auth-welcome {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #991B1B 100%);
  overflow: hidden;
  transition: transform .7s cubic-bezier(.65,0,.3,1);
  z-index: 3;
  clip-path: polygon(12% 0, 100% 0, 100% 100%, 0 100%);
}
[dir="ltr"] .auth-welcome { right: 0; transform: translateX(0); }
[dir="ltr"] .auth-card.is-register .auth-welcome { transform: translateX(-100%); clip-path: polygon(0 0, 88% 0, 100% 100%, 0 100%); }

[dir="rtl"] .auth-welcome { left: 0; transform: translateX(0); clip-path: polygon(0 0, 88% 0, 100% 100%, 0 100%); }
[dir="rtl"] .auth-card.is-register .auth-welcome { transform: translateX(100%); clip-path: polygon(12% 0, 100% 0, 100% 100%, 0 100%); }

.auth-welcome-side {
  position: absolute;
  inset: 0;
  padding: 56px 44px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  transition: opacity .5s ease, transform .7s ease;
  pointer-events: none;
}
.auth-welcome-login    { opacity: 1; pointer-events: auto; }
.auth-welcome-register { opacity: 0; transform: scale(.95); pointer-events: none; }
.auth-card.is-register .auth-welcome-login    { opacity: 0; transform: scale(.95); pointer-events: none; }
.auth-card.is-register .auth-welcome-register { opacity: 1; transform: scale(1); pointer-events: auto; }

/* زر شبحي داخل لوحة الترحيب */
.auth-ghost-btn {
  margin-top: 28px;
  background: transparent; color: #fff;
  border: 2px solid rgba(255,255,255,.7);
  border-radius: 999px;
  padding: 10px 24px;
  font-weight: 800; font-size: 13px;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: background .2s, transform .15s;
}
.auth-ghost-btn:hover { background: rgba(255,255,255,.15); transform: translateY(-2px); }

/* زر الواتساب بالأسفل */
.auth-wa {
  position: absolute;
  bottom: 18px; left: 50%; transform: translateX(-50%);
  background: rgba(255,255,255,.18);
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 999px;
  padding: 6px 14px;
  color: #fff; text-decoration: none;
  font-size: 11px; font-weight: 700;
  backdrop-filter: blur(6px);
}

/* حقول */
.auth-input {
  position: relative;
  margin-bottom: 12px;
}
.auth-input input, .auth-input select {
  width: 100%;
  padding: 13px 40px 13px 40px;
  background: rgba(255,255,255,.06);
  border: 1.5px solid rgba(255,255,255,.1);
  border-radius: 12px;
  color: #F8FAFC;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  font-family: 'Tajawal', sans-serif;
  transition: border-color .2s, background .2s;
}
.auth-input input:focus, .auth-input select:focus {
  border-color: #6366F1;
  background: rgba(255,255,255,.09);
}
.auth-input input::placeholder { color: rgba(248,250,252,.45); }
.auth-input-sm input, .auth-input-sm select { padding-top: 10px; padding-bottom: 10px; font-size: 13px; }
.auth-input-icon {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: .6;
  pointer-events: none;
}
[dir="ltr"] .auth-input-icon { left: 12px; }
[dir="rtl"] .auth-input-icon { right: 12px; }
.auth-input-eye {
  position: absolute;
  top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  font-size: 14px; color: rgba(248,250,252,.5);
  padding: 0;
}
[dir="ltr"] .auth-input-eye { right: 12px; }
[dir="rtl"] .auth-input-eye { left: 12px; }

/* رسالة خطأ */
.auth-error {
  background: rgba(239,68,68,.15);
  border: 1px solid rgba(239,68,68,.4);
  color: #FCA5A5;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 12px;
  margin-bottom: 12px;
}

/* زر إرسال */
.auth-submit {
  width: 100%;
  padding: 13px;
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-weight: 900;
  font-size: 15px;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  box-shadow: 0 8px 24px rgba(99,102,241,.4);
  transition: transform .15s, box-shadow .15s;
  margin-top: 4px;
}
.auth-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(99,102,241,.55); }
.auth-submit:disabled { opacity: .6; cursor: not-allowed; }

.auth-switch {
  text-align: center;
  color: #94A3B8;
  font-size: 12px;
  margin: 16px 0 0;
}
.auth-switch-btn {
  background: none; border: none;
  color: #A5B4FC; font-weight: 800;
  cursor: pointer; font-size: 12px;
  font-family: 'Tajawal', sans-serif;
}
.auth-switch-btn:hover { color: #C7D2FE; }

/* صف بحقلين */
.auth-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 0; }

/* شعار */
.auth-logo {
  font-size: 18px; font-weight: 900;
  background: linear-gradient(90deg,#A5B4FC,#F0ABFC,#FDA4AF,#A5B4FC);
  background-size: 300% auto;
  -webkit-background-clip: text; background-clip: text;
  color: transparent;
  animation: authShimmer 4s linear infinite;
}
@keyframes authShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }

/* ═══════════ Responsive ═══════════ */
@media (max-width: 820px) {
  .auth-card { height: auto; min-height: 560px; }
  .auth-pane { width: 100%; padding: 28px 24px; }
  .auth-welcome { display: none; }
  /* في موبايل: بدل سلايد، بنعمل fade بين الاثنين */
  .auth-register-pane { opacity: 0; pointer-events: none; transform: none !important; }
  .auth-card.is-register .auth-login-pane    { opacity: 0; pointer-events: none; transform: none !important; position: absolute; }
  .auth-card.is-register .auth-register-pane { opacity: 1; pointer-events: auto; position: relative; }
}
`;
