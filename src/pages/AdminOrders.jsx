import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { shadow, r, fmt } from "../Theme";
import { printWaybill } from "../utils/waybill";
import { useSettings } from "../hooks/useSettings";

const STATUSES = [
  { val: "NEW",        label: "جديد",          bg: "#EEF2FF", col: "#6366F1" },
  { val: "PROCESSING", label: "قيد المعالجة",  bg: "#FDF4FF", col: "#A855F7" },
  { val: "SHIPPED",    label: "تم الشحن",       bg: "#FFFBEB", col: "#F59E0B" },
  { val: "DELIVERED",  label: "تم التسليم",     bg: "#ECFDF5", col: "#10B981" },
  { val: "CANCELED",   label: "ملغي",           bg: "#FEF2F2", col: "#EF4444" },
];

const shimmer = {
  background: "linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899,#6366F1)",
  backgroundSize: "300% auto", WebkitBackgroundClip: "text", backgroundClip: "text",
  color: "transparent", animation: "shimmer 4s linear infinite",
};

const fmtDate = (ts) => { try { const d = ts?.toDate ? ts.toDate() : new Date(ts); return d.toLocaleString("ar-EG"); } catch { return ""; } };

export default function AdminOrders() {
  const navigate = useNavigate();
  const { settings: storeSettings } = useSettings();
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded]       = useState(null);

  useEffect(() => {
    apiFetch("/api/orders")
      .then((data) => { setOrders(data.map(o => ({ ...o, docId: o.id }))); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const updateStatus = async (docId, status) => {
    try {
      await apiFetch(`/api/orders/${docId}`, { method: "PUT", body: { status } });
      setOrders(prev => prev.map(o => o.docId === docId ? { ...o, status } : o));
    } catch { alert("❌ خطأ"); }
  };
  const deleteOrder = async (docId) => {
    if (!window.confirm("حذف هذا الطلب؟")) return;
    try {
      await apiFetch(`/api/orders/${docId}`, { method: "DELETE" });
      setOrders(prev => prev.filter(o => o.docId !== docId));
    } catch { alert("❌ خطأ"); }
  };

  const exportCSV = () => {
    const header = ["رقم الطلب", "التاريخ", "العميل", "الهاتف", "المدينة", "العنوان", "رابط الموقع", "الحالة", "طريقة الدفع", "الإجمالي", "المنتجات"];
    const rows = filtered.map(o => [
      o.id || o.docId,
      o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString("ar-EG") : new Date(o.createdAt).toLocaleString("ar-EG"),
      o.customer?.name || "",
      o.customer?.phone || "",
      o.customer?.cityLabel || o.customer?.city || "",
      (o.customer?.address || "").replace(/,/g, "،"),
      o.customer?.location ? `https://maps.google.com/?q=${o.customer.location.lat},${o.customer.location.lng}` : "",
      STATUSES.find(s => s.val === o.status)?.label || o.status || "",
      o.payment?.method === "cash" ? "كاش" : "تحويل",
      o.totals?.grandTotal || 0,
      (o.items || []).map(it => {
        const vs = (it.variantSummary || []).map(v => `${v.group}: ${v.value}`).join(" - ");
        return `${it.name} ×${it.qty}${vs ? ` (${vs})` : ""}`;
      }).join(" | "),
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    let arr = [...orders];
    if (search) { const q = search.toLowerCase(); arr = arr.filter(o => (o.customer?.name || "").toLowerCase().includes(q) || (o.customer?.phone || "").includes(q) || (o.id || "").includes(q)); }
    if (statusFilter) arr = arr.filter(o => o.status === statusFilter);
    return arr;
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => ({
    total:    orders.length,
    newOrders: orders.filter(o => o.status === "NEW").length,
    revenue:  orders.filter(o => o.status === "DELIVERED").reduce((s, o) => s + (o.totals?.grandTotal || 0), 0),
  }), [orders]);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: "rtl" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:768px){
          .ao-stats { grid-template-columns: 1fr !important; }
          .ao-filter { flex-direction: column !important; align-items: stretch !important; }
          .ao-filter input { width: 100% !important; }
          .ao-order-head { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .ao-order-total { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
        }
        @media(max-width:480px){
          .ao-stats { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ناف */}
      <nav style={{ background: "#0F172A", borderBottom: "1px solid rgba(255,255,255,.08)", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.8)", border: "1.5px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>← رجوع</button>
          <span style={{ fontSize: 18, fontWeight: 900 }}><span style={{ color: "#fff" }}>📦 </span><span style={shimmer}>الطلبات</span></span>
          {!loading && <span style={{ background: "#ECFDF5", color: "#10B981", borderRadius: 999, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{orders.length} طلب</span>}
        </div>
        <Link to="/admin-dashboard" style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, boxShadow: "0 4px 12px rgba(99,102,241,.4)" }}>← لوحة التحكم</Link>
      </nav>

      <main style={{ maxWidth: 1100, margin: "24px auto", padding: "0 20px", display: "grid", gap: 20 }}>

        {/* إحصاءات */}
        <div className="ao-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {[
            { label: "إجمالي الطلبات", val: stats.total,             col: "#6366F1", bg: "#EEF2FF", icon: "📦" },
            { label: "طلبات جديدة",    val: stats.newOrders,         col: "#EC4899", bg: "#FDF2F8", icon: "🔴" },
            { label: "إيرادات مسلّمة", val: fmt(stats.revenue),      col: "#10B981", bg: "#ECFDF5", icon: "💰" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 18, border: "1px solid #F1F5F9", boxShadow: shadow.sm, padding: "20px", borderTop: `3px solid ${s.col}`, animation: `fadeUp .4s ${i * .08}s both` }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ color: "#64748B", fontSize: 13, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontWeight: 900, fontSize: 26, color: s.col }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* فلاتر */}
        <div className="ao-filter" style={{ background: "#fff", borderRadius: 16, border: "1px solid #F1F5F9", boxShadow: shadow.sm, padding: "16px 20px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
            <input placeholder="🔍 بحث بالاسم أو الهاتف أو رقم الطلب" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 14, outline: "none", fontFamily: "'Tajawal',sans-serif", background: "#F8FAFC", boxSizing: "border-box" }}
              onFocus={e => { e.target.style.borderColor = "#6366F1"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.1)"; }}
              onBlur={e => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{ val: "", label: "الكل" }, ...STATUSES].map(s => (
              <button key={s.val} onClick={() => setStatusFilter(s.val)}
                style={{ padding: "8px 14px", borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: "pointer", border: statusFilter === s.val ? "none" : "1.5px solid #E2E8F0", background: statusFilter === s.val ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : "#fff", color: statusFilter === s.val ? "#fff" : "#64748B", fontFamily: "'Tajawal',sans-serif", transition: "all .15s" }}>
                {s.label}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} disabled={filtered.length === 0}
            style={{ padding: "9px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: filtered.length ? "pointer" : "not-allowed", background: "#ECFDF5", color: "#10B981", border: "1.5px solid #A7F3D0", fontFamily: "'Tajawal',sans-serif", opacity: filtered.length ? 1 : .5, flexShrink: 0 }}>
            📥 تصدير CSV
          </button>
        </div>

        {/* الطلبات */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94A3B8", background: "#fff", borderRadius: 20 }}>⏳ جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 20, border: "2px dashed #E2E8F0", color: "#94A3B8" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            لا توجد طلبات {search || statusFilter ? "مطابقة" : "بعد"}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((o, idx) => {
              const st = STATUSES.find(s => s.val === o.status) || STATUSES[0];
              const isOpen = expanded === o.docId;
              return (
                <div key={o.docId} style={{ background: "#fff", borderRadius: 18, border: "1px solid #F1F5F9", boxShadow: shadow.sm, overflow: "hidden", borderRight: `4px solid ${st.col}`, animation: `fadeUp .35s ${idx * 0.03}s both` }}>

                  {/* رأس الطلب */}
                  <div style={{ padding: "18px 20px", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: "#0F172A" }}>{o.id}</span>
                        <span style={{ background: st.bg, color: st.col, borderRadius: 999, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                        <span style={{ background: o.payment?.method === "cash" ? "#FFFBEB" : "#EFF6FF", color: o.payment?.method === "cash" ? "#B45309" : "#6366F1", borderRadius: 999, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                          {o.payment?.method === "cash" ? "💵 كاش" : "🏦 تحويل"}
                        </span>
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>{fmtDate(o.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: 14, color: "#64748B" }}>
                        👤 {o.customer?.name} — 📞 {o.customer?.phone} — 📍 {o.customer?.cityLabel || o.customer?.city}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 900, fontSize: 18, color: "#6366F1" }}>{fmt(o.totals?.grandTotal || 0)}</span>
                      <button onClick={() => setExpanded(isOpen ? null : o.docId)}
                        style={{ background: "#EEF2FF", color: "#6366F1", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", transition: "background .15s" }}
                        onMouseOver={e => e.currentTarget.style.background = "#E0E7FF"}
                        onMouseOut={e => e.currentTarget.style.background = "#EEF2FF"}>
                        {isOpen ? "إخفاء ▲" : "تفاصيل ▼"}
                      </button>
                    </div>
                  </div>

                  {/* تفاصيل */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid #F1F5F9", padding: "18px 20px", background: "#F8FAFC", display: "grid", gap: 16 }}>
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 10, color: "#0F172A", fontSize: 14 }}>المنتجات</div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {(o.items || []).map((it, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 12, padding: "10px 14px", border: "1px solid #F1F5F9" }}>
                              <img src={(it.image || "").trim() || "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Crect fill='%23F1F5F9' width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' font-size='22' text-anchor='middle' dy='.3em'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E"} alt={it.name} style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 10 }} onError={e => { e.currentTarget.onerror = null; e.currentTarget.style.display = "none"; }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: "#0F172A" }}>{it.name}</div>
                                {it.variantSummary?.length > 0 && (
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                    {it.variantSummary.map((v, j) => (
                                      <span key={j} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#EEF2FF", color: "#4338CA", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                                        {v.hex && <span style={{ width: 10, height: 10, borderRadius: "50%", background: v.hex, display: "inline-block", border: "1px solid rgba(0,0,0,.1)" }} />}
                                        {v.group}: {v.value}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div style={{ color: "#94A3B8", fontSize: 13 }}>×{it.qty}</div>
                              <div style={{ fontWeight: 800, color: "#6366F1" }}>{fmt((it.price || 0) * (it.qty || 0))}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #F1F5F9", fontSize: 14, color: "#64748B" }}>
                        <div style={{ marginBottom: o.customer?.location || o.customer?.notes ? 8 : 0 }}>
                          📍 <strong style={{ color: "#0F172A" }}>العنوان:</strong> {o.customer?.address}
                        </div>
                        {o.customer?.notes && <div style={{ marginBottom: o.customer?.location ? 8 : 0 }}>📝 <strong style={{ color: "#0F172A" }}>ملاحظات:</strong> {o.customer.notes}</div>}

                        {/* موقع GPS */}
                        {o.customer?.location && (
                          <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 12, padding: "12px 14px", marginTop: 6 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <div>
                                <div style={{ fontWeight: 800, color: "#059669", fontSize: 13, marginBottom: 3 }}>
                                  📍 موقع العميل على الخريطة
                                </div>
                                <div style={{ fontSize: 12, color: "#065F46", direction: "ltr" }}>
                                  GPS: {Number(o.customer.location.lat).toFixed(5)}, {Number(o.customer.location.lng).toFixed(5)}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <a
                                  href={o.customer.location.mapLink || `https://maps.google.com/?q=${o.customer.location.lat},${o.customer.location.lng}`}
                                  target="_blank" rel="noreferrer"
                                  style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#059669", color: "#fff", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 12px rgba(5,150,105,.3)", transition: "transform .15s" }}
                                  onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
                                  onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                                  🗺️ افتح Google Maps
                                </a>
                                <a
                                  href={`https://www.waze.com/ul?ll=${o.customer.location.lat},${o.customer.location.lng}&navigate=yes`}
                                  target="_blank" rel="noreferrer"
                                  style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#3B82F6", color: "#fff", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
                                  🚗 Waze
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#334155" }}>تغيير الحالة:</span>
                        {STATUSES.map(s => (
                          <button key={s.val} onClick={() => updateStatus(o.docId, s.val)}
                            style={{ padding: "7px 14px", borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "none", background: o.status === s.val ? s.col : s.bg, color: o.status === s.val ? "#fff" : s.col, fontFamily: "'Tajawal',sans-serif", transition: "opacity .15s" }}
                            onMouseOver={e => e.currentTarget.style.opacity = ".8"}
                            onMouseOut={e => e.currentTarget.style.opacity = "1"}>
                            {s.label}
                          </button>
                        ))}
                        <button onClick={() => printWaybill(o, storeSettings)}
                          style={{ background: "#EEF2FF", color: "#6366F1", border: "1.5px solid #C7D2FE", borderRadius: 10, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                          📦 بوليصة شحن
                        </button>
                        <button onClick={() => deleteOrder(o.docId)}
                          style={{ marginRight: "auto", background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 10, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                          🗑️ حذف
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
