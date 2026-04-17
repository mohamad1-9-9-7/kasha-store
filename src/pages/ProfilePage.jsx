import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { inputBase, focusIn, focusOut, safeParse } from "../Theme";
import MiniNav from "../components/MiniNav";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";

const EMIRATES_AR = ["دبي", "أبو ظبي", "الشارقة", "عجمان", "رأس الخيمة", "الفجيرة", "أم القيوين"];
const EMIRATES_EN = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];
const AVATARS  = ["#6366F1","#EC4899","#10B981","#F59E0B","#0EA5E9","#A855F7"];
const avatarColor = (name) => AVATARS[(name || "م").charCodeAt(0) % AVATARS.length];

const lbl = { display: "block", marginBottom: 6, fontWeight: 700, fontSize: 14, color: "#334155" };

export default function ProfilePage() {
  const navigate = useNavigate();
  const toast    = useToast();
  const { lang } = useLang();
  const t = k => T[lang][k] ?? T.ar[k] ?? k;
  const EMIRATES = lang === "ar" ? EMIRATES_AR : EMIRATES_EN;
  const user     = safeParse("user");

  const [form, setForm] = useState({
    name:     user?.name     || "",
    phone:    user?.phone    || "",
    city:     user?.city     || "",
    address:  user?.address  || "",
    password: "",
    newPw:    "",
    confirmPw:"",
  });
  const [showPw, setShowPw] = useState(false);
  const [tab, setTab]       = useState("info"); // info | security

  if (!user) { navigate("/user-login"); return null; }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const saveInfo = () => {
    if (!form.name.trim() || !form.phone.trim()) return toast("يرجى تعبئة الاسم والهاتف", "error");
    const updated = { ...user, name: form.name.trim(), phone: form.phone.trim(), city: form.city, address: form.address.trim() };
    localStorage.setItem("user", JSON.stringify(updated));
    // تحديث في قائمة المستخدمين
    const users = safeParse("users", []);
    const idx   = users.findIndex(u => u.phone === user.phone);
    if (idx >= 0) { users[idx] = { ...users[idx], ...updated }; localStorage.setItem("users", JSON.stringify(users)); }
    toast("✅ تم حفظ المعلومات", "success");
  };

  const changePw = () => {
    const users = safeParse("users", []);
    const me    = users.find(u => u.phone === user.phone);
    if (!me)                          return toast("حساب غير موجود", "error");
    if (me.password !== form.password) return toast("كلمة المرور الحالية خاطئة", "error");
    if (form.newPw.length < 4)         return toast("كلمة المرور الجديدة قصيرة (4 خانات على الأقل)", "error");
    if (form.newPw !== form.confirmPw) return toast("كلمات المرور غير متطابقة", "error");
    const updated = users.map(u => u.phone === user.phone ? { ...u, password: form.newPw } : u);
    localStorage.setItem("users", JSON.stringify(updated));
    setForm(f => ({ ...f, password: "", newPw: "", confirmPw: "" }));
    toast("✅ تم تغيير كلمة المرور", "success");
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("isAdmin");
    navigate("/user-login", { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: lang === "ar" ? "rtl" : "ltr" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:600px){
          .profile-name-grid { grid-template-columns: 1fr !important; }
          .profile-card-row  { flex-wrap: wrap !important; }
          .profile-orders-btn{ margin-right: 0 !important; }
        }
      `}</style>
      <MiniNav title={t("profile_title")} backTo="/home" />

      <main style={{ maxWidth: 600, margin: "28px auto", padding: "0 20px", animation: "fadeUp .4s ease both" }}>

        {/* بطاقة الهوية */}
        <div className="profile-card-row" style={{ background: "linear-gradient(135deg,#0F172A,#1E1B4B)", borderRadius: 24, padding: "28px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(99,102,241,.15)", filter: "blur(30px)" }} />
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: avatarColor(user.name), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 28, flexShrink: 0, border: "3px solid rgba(255,255,255,.2)", position: "relative", zIndex: 1 }}>
            {(user.name || user.phone || "م").charAt(0)}
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: "#fff" }}>{user.name || "بدون اسم"}</div>
            <div style={{ color: "rgba(255,255,255,.6)", fontSize: 14, direction: "ltr", marginTop: 4 }}>{user.phone}</div>
            {user.city && <div style={{ color: "#818CF8", fontSize: 13, marginTop: 4 }}>📍 {user.city}</div>}
          </div>
          <div style={{ marginRight: lang === "ar" ? "auto" : 0, marginLeft: lang === "en" ? "auto" : 0, position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            {user.points > 0 && (
              <div style={{ background: "rgba(168,85,247,.2)", border: "1.5px solid rgba(168,85,247,.4)", color: "#E9D5FF", borderRadius: 12, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>
                ⭐ {user.points} {lang === "ar" ? "نقطة" : "pts"}
              </div>
            )}
            <Link to="/my-orders" style={{ background: "rgba(255,255,255,.1)", border: "1.5px solid rgba(255,255,255,.2)", color: "#fff", borderRadius: 12, padding: "10px 16px", fontWeight: 700, fontSize: 13 }}>
              📦 {t("my_orders")}
            </Link>
          </div>
        </div>

        {/* تابز */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F1F5F9", overflow: "hidden", marginBottom: 20, display: "flex" }}>
          {[{ key: "info", label: lang === "ar" ? "👤 المعلومات" : "👤 Info" }, { key: "security", label: lang === "ar" ? "🔐 الأمان" : "🔐 Security" }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: "14px", fontWeight: tab === t.key ? 800 : 600, fontSize: 14, color: tab === t.key ? "#6366F1" : "#64748B", background: tab === t.key ? "#EEF2FF" : "#fff", border: "none", cursor: "pointer", fontFamily: "'Tajawal',sans-serif", transition: "all .15s", borderBottom: tab === t.key ? "2px solid #6366F1" : "2px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* المعلومات */}
        {tab === "info" && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", padding: "24px", display: "grid", gap: 14 }}>
            <div className="profile-name-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>{t("name_label")}</label>
                <input value={form.name} onChange={set("name")} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={lbl}>{t("phone_label")}</label>
                <input value={form.phone} onChange={set("phone")} style={{ ...inputBase, direction: "ltr", textAlign: "right" }} onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>
            <div>
              <label style={lbl}>{t("city_label")}</label>
              <select value={form.city} onChange={set("city")} style={{ ...inputBase, cursor: "pointer" }} onFocus={focusIn} onBlur={focusOut}>
                <option value="">{lang === "ar" ? "اختر المدينة" : "Select city"}</option>
                {EMIRATES.map(em => <option key={em}>{em}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>{t("address_label")}</label>
              <textarea rows={2} value={form.address} onChange={set("address")} style={{ ...inputBase, resize: "vertical" }} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <button onClick={saveInfo} style={{ padding: "13px", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", boxShadow: "0 6px 18px rgba(99,102,241,.35)" }}>
              💾 {t("save")}
            </button>
          </div>
        )}

        {/* الأمان */}
        {tab === "security" && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", padding: "24px", display: "grid", gap: 14 }}>
            <div>
              <label style={lbl}>{lang === "ar" ? "كلمة المرور الحالية" : "Current Password"}</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} style={{ ...inputBase, paddingLeft: 44 }} onFocus={focusIn} onBlur={focusOut} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 17, color: "#94A3B8" }}>{showPw ? "🙈" : "👁️"}</button>
              </div>
            </div>
            <div>
              <label style={lbl}>{lang === "ar" ? "كلمة المرور الجديدة" : "New Password"}</label>
              <input type="password" value={form.newPw} onChange={set("newPw")} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={lbl}>{t("confirm_pass")}</label>
              <input type="password" value={form.confirmPw} onChange={set("confirmPw")} style={inputBase} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <button onClick={changePw} style={{ padding: "13px", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
              🔐 {lang === "ar" ? "تغيير كلمة المرور" : "Change Password"}
            </button>
            <div style={{ height: 1, background: "#F1F5F9" }} />
            <button onClick={logout} style={{ padding: "12px", background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
              🚪 {t("nav_logout")}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
