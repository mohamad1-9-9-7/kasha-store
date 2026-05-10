import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { shadow, inputBase, focusIn, focusOut } from "../Theme";
import { apiFetch } from "../api";
import AdminLayout, { Card, Stat, ADMIN } from "../components/AdminLayout";
import { IconUsers, IconStore, IconSearch, IconTrash, IconClose, IconPhone } from "../components/Icons";

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
    <AdminLayout title="العملاء" subtitle={`${customers.length} عميل مسجّل`} search={search} onSearch={setSearch}>
      <style>{`.row-hover { transition: background .15s; cursor: pointer; } .row-hover:hover { background: #F8FAFC!important; }`}</style>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(3,1fr)", marginBottom: 16 }}>
        <Stat icon={IconUsers} tone="default" label="إجمالي العملاء" value={customers.length} />
        <Stat icon={IconStore}  tone="success" label="المدن المسجلة" value={cities.length} />
        <Stat icon={IconSearch} tone="warn"    label="نتائج البحث"  value={filtered.length} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 16, alignItems: "start" }}>

          {/* القائمة */}
          <div style={{ display: "grid", gap: 12 }}>

            {/* فلاتر */}
            <Card style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", padding: "12px 16px" }}>
              <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                style={{ ...inputBase, padding: "9px 12px", width: "auto", minWidth: 140, cursor: "pointer", fontSize: 13 }} onFocus={focusIn} onBlur={focusOut}>
                <option value="">كل المدن</option>
                {cities.map(c => <option key={c}>{c}</option>)}
              </select>
              {(search || cityFilter) && (
                <button onClick={() => { setSearch(""); setCityFilter(""); }} style={{
                  background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 8,
                  padding: "8px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer",
                  fontFamily: "'Tajawal',sans-serif",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}><IconClose size={14} /> مسح</button>
              )}
              <span style={{ marginInlineStart: "auto", fontSize: 12, color: ADMIN.textMuted }}>{filtered.length} نتيجة</span>
            </Card>

            {/* الجدول */}
            <Card padded={false} style={{ overflow: "hidden" }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px", color: ADMIN.textSubtle }}>
                  <IconUsers size={36} style={{ color: ADMIN.textSubtle, marginBottom: 10 }} />
                  <h3 style={{ fontWeight: 700, color: ADMIN.text, marginBottom: 4, fontSize: 15 }}>{search || cityFilter ? "لا توجد نتائج" : "لا يوجد عملاء بعد"}</h3>
                  <p style={{ fontSize: 13 }}>{search || cityFilter ? "جرّب تغيير معايير البحث" : "سيظهر العملاء هنا بعد تسجيلهم"}</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#FAFBFC", borderBottom: `1px solid ${ADMIN.border}` }}>
                      {["العميل", "الهاتف", "المدينة", "العنوان", ""].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: 11, color: ADMIN.textMuted, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={i} className="row-hover"
                        onClick={() => setSelected(selected?.phone === c.phone ? null : c)}
                        style={{ borderBottom: `1px solid ${ADMIN.border}`, background: selected?.phone === c.phone ? "#F6F7FB" : "#fff" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarColor(c.name), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                              {(c.name || c.phone || "م").charAt(0)}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 13, color: ADMIN.text }}>{c.name || "—"}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {c.phone
                            ? <span style={{ direction: "ltr", display: "inline-block", fontWeight: 500, fontSize: 13, color: ADMIN.textMuted, fontFamily: "monospace" }}>{c.phone}</span>
                            : <span style={{ fontSize: 12, color: ADMIN.accent, fontWeight: 600 }}>{c.email || "—"}</span>
                          }
                          {c.loginType === "google" && <span style={{ marginInlineStart: 6, background: ADMIN.accentBg, color: ADMIN.accent, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>G</span>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {c.city && <span style={{ background: ADMIN.accentBg, color: ADMIN.accent, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{c.city}</span>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ color: ADMIN.textMuted, fontSize: 12 }}>{c.address ? (c.address.length > 28 ? c.address.slice(0, 28) + "..." : c.address) : "—"}</span>
                        </td>
                        <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <a href={`https://wa.me/${c.phone?.replace(/^0/, "971")}`} target="_blank" rel="noreferrer"
                              title="واتساب"
                              style={{ width: 30, height: 30, background: "#ECFDF5", color: "#10B981", border: "none", borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                              <IconPhone size={14} />
                            </a>
                            <button onClick={() => deleteUser(c)}
                              title="حذف"
                              style={{ width: 30, height: 30, background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                              <IconTrash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          {/* بطاقة التفاصيل */}
          {selected && (
            <Card padded={false} style={{ overflow: "hidden", position: "sticky", top: 80 }}>
              <div style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", padding: "24px 20px", position: "relative" }}>
                <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 12, insetInlineStart: 12, background: "rgba(255,255,255,.15)", border: "none", borderRadius: 8, width: 28, height: 28, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconClose size={14} />
                </button>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,.2)", border: "2px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 22, margin: "0 auto 10px" }}>
                  {(selected.name || selected.phone || "م").charAt(0)}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>{selected.name || "بدون اسم"}</div>
                  <div style={{ color: "rgba(255,255,255,.75)", fontSize: 12, marginTop: 2, direction: "ltr" }}>{selected.phone}</div>
                </div>
              </div>
              <div style={{ padding: 16, display: "grid", gap: 10 }}>
                {selected.city && (
                  <div style={infoRow}>
                    <span style={infoLabel}>المدينة</span>
                    <span style={infoVal}>{selected.city}</span>
                  </div>
                )}
                {selected.address && (
                  <div style={infoRow}>
                    <span style={infoLabel}>العنوان</span>
                    <span style={infoVal}>{selected.address}</span>
                  </div>
                )}
                <a href={`https://wa.me/${selected.phone?.replace(/^0/, "971")}`} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#25D366", color: "#fff", borderRadius: 10, padding: "10px", fontWeight: 700, fontSize: 13, textDecoration: "none", marginTop: 6 }}>
                  <IconPhone size={14} /> تواصل عبر واتساب
                </a>
                <button onClick={() => deleteUser(selected)}
                  style={{ width: "100%", padding: "9px", background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA", borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <IconTrash size={13} /> حذف العميل
                </button>
              </div>
            </Card>
          )}
        </div>
    </AdminLayout>
  );
}

const infoRow = { display: "grid", gridTemplateColumns: "70px 1fr", gap: 12, alignItems: "start", fontSize: 13 };
const infoLabel = { color: "#94A3B8", fontWeight: 600, fontSize: 12 };
const infoVal = { color: "#0F172A", fontWeight: 600 };
