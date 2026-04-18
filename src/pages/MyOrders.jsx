import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { safeParse, fmt } from "../Theme";
import MiniNav from "../components/MiniNav";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";

const STATUSES_DATA = {
  NEW:        { col: "#6366F1", bg: "#EEF2FF", icon: "🆕" },
  PROCESSING: { col: "#A855F7", bg: "#FDF4FF", icon: "⚙️" },
  SHIPPED:    { col: "#F59E0B", bg: "#FFFBEB", icon: "🚚" },
  DELIVERED:  { col: "#10B981", bg: "#ECFDF5", icon: "✅" },
  CANCELED:   { col: "#EF4444", bg: "#FEF2F2", icon: "❌" },
};

const fmtDate = (ts, lang) => { try { const d = ts?.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-AE", { year: "numeric", month: "short", day: "numeric" }); } catch { return ""; } };

export default function MyOrders() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = k => T[lang][k] ?? T.ar[k] ?? k;
  const STATUSES = Object.fromEntries(Object.entries(STATUSES_DATA).map(([k, v]) => [k, { ...v, label: t("status_" + k) }]));
  const user = safeParse("user");
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!user) { navigate("/user-login"); return; }
    apiFetch(`/api/orders?phone=${encodeURIComponent(user.phone || "")}`)
      .then((data) => { setOrders(data.map(o => ({ ...o, docId: o.id }))); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const timeline = (status) => {
    const steps = ["NEW", "PROCESSING", "SHIPPED", "DELIVERED"];
    const idx = steps.indexOf(status);
    return steps.map((s, i) => ({ ...STATUSES[s], key: s, done: i <= idx && status !== "CANCELED" }));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: lang === "ar" ? "rtl" : "ltr" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @media(max-width:600px){
          .order-head  { flex-direction: column !important; align-items: flex-start !important; }
          .order-total { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .order-timeline span { font-size: 9px !important; }
          .order-timeline > div > div:first-child { width: 22px !important; height: 22px !important; }
        }
      `}</style>
      <MiniNav title={t("my_orders")} backTo="/home" />

      <main style={{ maxWidth: 800, margin: "28px auto", padding: "0 20px", animation: "fadeUp .4s ease both" }}>

        {/* هيدر */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0F172A", marginBottom: 4 }}>{t("my_orders")}</h1>
            <p style={{ color: "#64748B", fontSize: 14 }}>{lang === "ar" ? "تتبع حالة جميع طلباتك" : "Track all your orders"}</p>
          </div>
          {!loading && <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "6px 16px", fontSize: 14, fontWeight: 700 }}>{orders.length} طلب</span>}
        </div>

        {loading ? (
          <div style={{ display: "grid", gap: 14 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: "#fff", borderRadius: 20, padding: "20px", border: "1px solid #F1F5F9" }}>
                <div className="skeleton" style={{ height: 16, width: "40%", borderRadius: 6, marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 12, width: "70%", borderRadius: 6 }} />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 24, border: "2px dashed #E2E8F0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📦</div>
            <h3 style={{ fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>{t("no_orders")}</h3>
            <p style={{ color: "#94A3B8", marginBottom: 28 }}>{t("no_orders_desc")}</p>
            <Link to="/home" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", borderRadius: 14, padding: "13px 28px", fontWeight: 800 }}>
              🛍️ تسوّق الآن
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {orders.map((o) => {
              const st = STATUSES[o.status] || STATUSES.NEW;
              const isOpen = expanded === o.docId;
              const steps = timeline(o.status);
              return (
                <div key={o.docId} style={{ background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: "0 2px 12px rgba(0,0,0,.05)", overflow: "hidden", borderRight: `4px solid ${st.col}` }}>

                  {/* رأس الطلب */}
                  <div style={{ padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: "#64748B" }}>{o.id}</span>
                        <span style={{ background: st.bg, color: st.col, borderRadius: 999, padding: "4px 12px", fontSize: 13, fontWeight: 700 }}>
                          {st.icon} {st.label}
                        </span>
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>{fmtDate(o.createdAt, lang)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 900, fontSize: 18, color: "#6366F1" }}>{fmt(o.totals?.grandTotal || 0)}</span>
                        <button onClick={() => setExpanded(isOpen ? null : o.docId)}
                          style={{ background: "#F8FAFC", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                          {isOpen ? (lang === "ar" ? "إخفاء ▲" : "Hide ▲") : (lang === "ar" ? "التفاصيل ▼" : "Details ▼")}
                        </button>
                      </div>
                    </div>

                    {/* Timeline */}
                    {o.status !== "CANCELED" && (
                      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 0 }}>
                        {steps.map((s, i) => (
                          <React.Fragment key={s.key}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "none" }}>
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: s.done ? s.col : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, transition: "background .3s" }}>
                                {s.done ? <span style={{ color: "#fff", fontSize: 12 }}>✓</span> : <span style={{ fontSize: 11 }}>{s.icon}</span>}
                              </div>
                              <span style={{ fontSize: 10, color: s.done ? s.col : "#94A3B8", fontWeight: s.done ? 700 : 400, whiteSpace: "nowrap" }}>{s.label}</span>
                            </div>
                            {i < steps.length - 1 && (
                              <div style={{ flex: 1, height: 3, background: steps[i + 1]?.done ? "#6366F1" : "#E2E8F0", margin: "0 4px", marginBottom: 18, transition: "background .3s" }} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* تفاصيل */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid #F1F5F9", padding: "16px 20px", background: "#F8FAFC", display: "grid", gap: 14 }}>
                      {/* المنتجات */}
                      <div style={{ display: "grid", gap: 8 }}>
                        {(o.items || []).map((it, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 12, padding: "10px 14px", border: "1px solid #F1F5F9" }}>
                            <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", background: "#F1F5F9", flexShrink: 0 }}>
                              <img src={it.image || ""} alt={it.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{it.name}</div>
                              <div style={{ fontSize: 12, color: "#94A3B8" }}>{lang === "ar" ? "الكمية:" : "Qty:"} {it.qty}</div>
                              {it.variantSummary?.length > 0 && (
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                  {it.variantSummary.map((v, j) => (
                                    <span key={j} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#EEF2FF", color: "#4338CA", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                                      {v.hex && <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.hex, display: "inline-block", border: "1px solid rgba(0,0,0,.1)" }} />}
                                      {v.group}: {v.value}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div style={{ fontWeight: 800, color: "#6366F1", fontSize: 14 }}>{fmt((it.price || 0) * (it.qty || 1))}</div>
                          </div>
                        ))}
                      </div>
                      {/* العنوان */}
                      <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #F1F5F9", fontSize: 14, color: "#64748B" }}>
                        <div>📍 {o.customer?.cityLabel || o.customer?.city} — {o.customer?.address}</div>
                        {o.customer?.notes && <div style={{ marginTop: 6 }}>📝 {o.customer.notes}</div>}

                        {/* الموقع */}
                        {o.customer?.location && (
                          <div style={{ marginTop: 10, background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 12, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                            <div style={{ fontWeight: 700, color: "#059669", fontSize: 13 }}>
                              📍 {lang === "ar" ? "موقعك المحدد" : "Your pinned location"}
                            </div>
                            <a
                              href={o.customer.location.mapLink || `https://maps.google.com/?q=${o.customer.location.lat},${o.customer.location.lng}`}
                              target="_blank" rel="noreferrer"
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#059669", color: "#fff", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>
                              🗺️ {lang === "ar" ? "عرض على الخريطة" : "View on Map"}
                            </a>
                          </div>
                        )}
                      </div>
                      {/* طريقة الدفع */}
                      <div style={{ background: "#fff", borderRadius: 12, padding: "10px 16px", border: "1px solid #F1F5F9", fontSize: 13, color: "#64748B", display: "flex", alignItems: "center", gap: 8 }}>
                        {o.payment?.method === "cash" ? t("cart_cash") : t("cart_bank")}
                        <span style={{ marginRight: "auto", fontWeight: 900, fontSize: 16, color: "#6366F1" }}>{fmt(o.totals?.grandTotal || 0)}</span>
                      </div>
                      {/* تواصل */}
                      <a href="https://wa.me/971585446473" target="_blank" rel="noreferrer"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#25D366", color: "#fff", borderRadius: 12, padding: "11px", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
                        💬 {lang === "ar" ? "تواصل معنا بخصوص الطلب" : "Contact us about this order"}
                      </a>
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
