import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, setToken } from "../api";

const shimmer = {
  background: "linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899,#6366F1)",
  backgroundSize: "300% auto",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  animation: "shimmer 4s linear infinite",
};

const inp = {
  width: "100%", padding: "13px 16px", borderRadius: 12,
  border: "1.5px solid rgba(255,255,255,.15)", fontSize: 15, color: "#fff",
  background: "rgba(255,255,255,.08)", outline: "none", boxSizing: "border-box",
  fontFamily: "'Tajawal', sans-serif", transition: "border-color .18s, box-shadow .18s",
};

export default function AdminLogin() {
  const navigate = useNavigate();
  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { token } = await apiFetch("/api/auth/admin-login", {
        method: "POST",
        body: { phone: phone.trim(), password },
      });
      setToken(token);
      localStorage.setItem("isAdmin", "true");
      localStorage.setItem("user", JSON.stringify({ phone: phone.trim(), isAdmin: true }));
      navigate("/admin-dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0F172A,#1E1B4B,#0C4A6E)", fontFamily: "'Tajawal',sans-serif", direction: "rtl", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      <style>{`@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}} @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ position: "fixed", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(99,102,241,.2)", filter: "blur(60px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -80, left: -80, width: 350, height: 350, borderRadius: "50%", background: "rgba(236,72,153,.15)", filter: "blur(60px)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, animation: "fadeUp .45s ease both" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(255,255,255,.1)", border: "1.5px solid rgba(255,255,255,.2)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto 16px" }}>
            ⚙️
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 6 }}>لوحة التحكم</h2>
          <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14 }}>
            <span style={shimmer}>كشخة ✨</span> — دخول المشرف
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 24, padding: "32px", backdropFilter: "blur(16px)" }}>
          <form onSubmit={handleLogin} style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,.8)" }}>رقم الهاتف</label>
              <input type="tel" inputMode="numeric" placeholder="05xxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} required style={inp}
                onFocus={e => { e.target.style.borderColor = "#818CF8"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.2)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,.15)"; e.target.style.boxShadow = "none"; }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,.8)" }}>كلمة المرور</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} placeholder="••••••" value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ ...inp, paddingLeft: 44 }}
                  onFocus={e => { e.target.style.borderColor = "#818CF8"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.2)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,.15)"; e.target.style.boxShadow = "none"; }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 17, color: "rgba(255,255,255,.5)" }}>
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)", color: "#FCA5A5", borderRadius: 12, padding: "10px 14px", fontSize: 13 }}>⚠️ {error}</div>
            )}

            <button type="submit" disabled={loading}
              style={{ padding: "14px", background: loading ? "rgba(99,102,241,.5)" : "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", borderRadius: 14, fontWeight: 900, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 8px 24px rgba(99,102,241,.45)", fontFamily: "'Tajawal',sans-serif", marginTop: 4 }}>
              {loading ? "⏳ جاري الدخول..." : "دخول لوحة التحكم ←"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link to="/home" style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>← العودة للمتجر</Link>
        </div>
      </div>
    </div>
  );
}
