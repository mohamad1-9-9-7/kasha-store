import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { shadow, inputBase, focusIn, focusOut } from "../Theme";
import { apiFetch } from "../api";

const shimmer = {
  background: "linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899,#6366F1)",
  backgroundSize: "300% auto", WebkitBackgroundClip: "text", backgroundClip: "text",
  color: "transparent", animation: "shimmer 4s linear infinite",
};

const AVATARS = ["#6366F1","#EC4899","#10B981","#F59E0B","#0EA5E9","#A855F7","#EF4444","#14B8A6"];

export default function UsersList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch]       = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [selected, setSelected]   = useState(null); // عميل مفتوح

  useEffect(() => {
    if (localStorage.getItem("isAdmin") !== "true") { navigate("/user-login"); return; }
    apiFetch("/api/users").then(setCustomers).catch(() => {});
  }, []);

  const cities = useMemo(() => [...new Set(customers.map(c => c.city).filter(Boolean))], [customers]);

  const filtered = useMemo(() => {
    let arr = [...customers];
    if (search)     arr = arr.filter(c => (c.name||"").includes(search) || (c.phone||"").includes(search));
    if (cityFilter) arr = arr.filter(c => c.city === cityFilter);
    return arr;
  }, [customers, search, cityFilter]);

  const deleteUser = async (customer) => {
    if (!window.confirm("حذف هذا العميل؟")) return;
    const id = customer.id || customer.phone;
    try { await apiFetch(`/api/users/${id}`, { method: "DELETE" }); } catch {}
    setCustomers(prev => prev.filter(c => (c.id || c.phone) !== id));
    if (selected?.id === id || selected?.phone === customer.phone) setSelected(null);
  };

  const avatarColor = (name) => AVATARS[(name || "م").charCodeAt(0) % AVATARS.length];

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: "rtl" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .row-hover { transition: background .15s; cursor: pointer; }
        .row-hover:hover { background: #F1F5F9!important; }
      `}</style>

      {/* ناف */}
      <nav style={{ background: "#0F172A", borderBottom: "1px solid rgba(255,255,255,.08)", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate("/admin-dashboard")} style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.8)", border: "1.5px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>← رجوع</button>
          <span style={{ fontSize: 18, fontWeight: 900 }}>
            <span style={{ color: "#fff" }}>👥 </span>
            <span style={shimmer}>العملاء</span>
          </span>
        </div>
        <Link to="/home" style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.7)", border: "1.5px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>← المتجر</Link>
      </nav>

      <main style={{ maxWidth: 1100, margin: "28px auto", padding: "0 20px", animation: "fadeUp .4s ease both" }}>

        {/* إحصاءات */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { icon: "👥", label: "إجمالي العملاء", val: customers.length,  col: "#6366F1" },
            { icon: "🏙️", label: "المدن المسجلة",  val: cities.length,    col: "#10B981" },
            { icon: "🔍", label: "نتائج البحث",     val: filtered.length,  col: "#F59E0B" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 18, border: "1px solid #F1F5F9", boxShadow: shadow.sm, padding: "20px", borderTop: `3px solid ${s.col}`, display: "flex", alignItems: "center", gap: 16, animation: `fadeUp .4s ${i * .07}s both` }}>
              <div style={{ fontSize: 28 }}>{s.icon}</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 28, color: s.col, lineHeight: 1 }}>{s.val}</div>
                <div style={{ color: "#94A3B8", fontSize: 13, marginTop: 4 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 20, alignItems: "start" }}>

          {/* القائمة */}
          <div style={{ display: "grid", gap: 16 }}>

            {/* فلاتر */}
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F1F5F9", boxShadow: shadow.sm, padding: "16px 20px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                <input placeholder="🔍 ابحث بالاسم أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ ...inputBase, paddingRight: 14 }} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                style={{ ...inputBase, width: "auto", minWidth: 140, cursor: "pointer" }} onFocus={focusIn} onBlur={focusOut}>
                <option value="">كل المدن</option>
                {cities.map(c => <option key={c}>{c}</option>)}
              </select>
              {(search || cityFilter) && (
                <button onClick={() => { setSearch(""); setCityFilter(""); }} style={{ background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>× مسح</button>
              )}
            </div>

            {/* الجدول */}
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: shadow.md, overflow: "hidden" }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "64px 20px", color: "#94A3B8" }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>👤</div>
                  <h3 style={{ fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>{search || cityFilter ? "لا توجد نتائج" : "لا يوجد عملاء بعد"}</h3>
                  <p>{search || cityFilter ? "جرّب تغيير معايير البحث" : "سيظهر العملاء هنا بعد تسجيلهم"}</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
                      {["العميل", "رقم الهاتف", "المدينة", "العنوان", "إجراءات"].map(h => (
                        <th key={h} style={{ padding: "14px 18px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#64748B" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={i} className="row-hover"
                        onClick={() => setSelected(selected?.phone === c.phone ? null : c)}
                        style={{ borderBottom: "1px solid #F1F5F9", background: selected?.phone === c.phone ? "#F1F5F9" : "#fff" }}>
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarColor(c.name), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>
                              {(c.name || c.phone || "م").charAt(0)}
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{c.name || "—"}</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          {c.phone
                            ? <span style={{ direction: "ltr", display: "inline-block", fontWeight: 600, fontSize: 14, color: "#334155" }}>{c.phone}</span>
                            : <span style={{ fontSize: 12, color: "#6366F1", fontWeight: 600 }}>{c.email || "—"}</span>
                          }
                          {c.loginType === "google" && <span style={{ marginRight: 6, background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>G</span>}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          {c.city && <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "3px 12px", fontSize: 13, fontWeight: 700 }}>{c.city}</span>}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ color: "#64748B", fontSize: 13 }}>{c.address ? (c.address.length > 28 ? c.address.slice(0, 28) + "..." : c.address) : "—"}</span>
                        </td>
                        <td style={{ padding: "14px 18px" }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <a href={`https://wa.me/${c.phone?.replace(/^0/, "971")}`} target="_blank" rel="noreferrer"
                              style={{ background: "#ECFDF5", color: "#10B981", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                              💬 واتساب
                            </a>
                            <button onClick={() => deleteUser(c)}
                              style={{ background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* بطاقة التفاصيل */}
          {selected && (
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: shadow.md, overflow: "hidden", position: "sticky", top: 20, animation: "fadeUp .3s ease both" }}>
              <div style={{ background: "linear-gradient(135deg,#0F172A,#1E1B4B)", padding: "28px 24px", position: "relative" }}>
                <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 14, left: 14, background: "rgba(255,255,255,.1)", border: "none", borderRadius: 8, width: 30, height: 30, color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: avatarColor(selected.name), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 26, margin: "0 auto 14px" }}>
                  {(selected.name || selected.phone || "م").charAt(0)}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 18, color: "#fff" }}>{selected.name || "بدون اسم"}</div>
                  <div style={{ color: "rgba(255,255,255,.6)", fontSize: 13, marginTop: 4, direction: "ltr" }}>{selected.phone}</div>
                </div>
              </div>
              <div style={{ padding: "20px 24px", display: "grid", gap: 14 }}>
                {[
                  { icon: "🏙️", label: "المدينة",  val: selected.city    },
                  { icon: "📍", label: "العنوان",  val: selected.address },
                ].map((row, i) => row.val && (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{row.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 2 }}>{row.label}</div>
                      <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>{row.val}</div>
                    </div>
                  </div>
                ))}
                <div style={{ height: 1, background: "#F1F5F9" }} />
                <a href={`https://wa.me/${selected.phone?.replace(/^0/, "971")}`} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#25D366", color: "#fff", borderRadius: 12, padding: "12px", fontWeight: 800, fontSize: 14, textDecoration: "none", transition: "opacity .15s" }}
                  onMouseOver={e => e.currentTarget.style.opacity = ".85"}
                  onMouseOut={e => e.currentTarget.style.opacity = "1"}>
                  💬 تواصل عبر واتساب
                </a>
                <button onClick={() => deleteUser(selected)}
                  style={{ width: "100%", padding: "11px", background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                  🗑️ حذف العميل
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
