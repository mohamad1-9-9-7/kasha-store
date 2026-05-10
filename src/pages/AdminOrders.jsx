import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { shadow, r, fmt } from "../Theme";
import { printWaybill } from "../utils/waybill";
import { useSettings } from "../hooks/useSettings";
import AdminLayout, { Card, Stat, ADMIN } from "../components/AdminLayout";
import {
  IconReceipt, IconWallet, IconAlert, IconDownload, IconTrash,
  IconChevDown, IconTruck, IconClose, IconCheckCircle,
} from "../components/Icons";

const STATUSES = [
  { val: "NEW",        label: "جديد",          bg: "#EEF2FF", col: "#6366F1" },
  { val: "PROCESSING", label: "قيد المعالجة",  bg: "#FDF4FF", col: "#A855F7" },
  { val: "SHIPPED",    label: "تم الشحن",       bg: "#FFFBEB", col: "#F59E0B" },
  { val: "DELIVERED",  label: "تم التسليم",     bg: "#ECFDF5", col: "#10B981" },
  { val: "CANCELED",   label: "ملغي",           bg: "#FEF2F2", col: "#EF4444" },
];

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
    // Optimistic update + rollback. Keep the previous status so we can undo if
    // the server rejects (whitelist mismatch, transition error, lost network).
    let previousStatus = null;
    setOrders(prev => prev.map(o => {
      if (o.docId === docId) { previousStatus = o.status; return { ...o, status }; }
      return o;
    }));
    try {
      await apiFetch(`/api/orders/${docId}`, { method: "PUT", body: { status } });
    } catch (e) {
      // Roll back so the UI reflects reality.
      setOrders(prev => prev.map(o => o.docId === docId ? { ...o, status: previousStatus } : o));
      alert("❌ فشل تحديث الحالة: " + (e?.message || ""));
    }
  };

  const updatePaymentStatus = async (docId, paymentStatus) => {
    let previousPayment = null;
    setOrders(prev => prev.map(o => {
      if (o.docId === docId) { previousPayment = o.payment; return { ...o, payment: { ...(o.payment || {}), status: paymentStatus } }; }
      return o;
    }));
    try {
      await apiFetch(`/api/orders/${docId}`, { method: "PUT", body: { paymentStatus } });
    } catch (e) {
      setOrders(prev => prev.map(o => o.docId === docId ? { ...o, payment: previousPayment } : o));
      alert("❌ فشل تحديث حالة الدفع: " + (e?.message || ""));
    }
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
    <AdminLayout
      title="الطلبات"
      subtitle={`${orders.length} طلب · ${stats.newOrders} جديد`}
      search={search}
      onSearch={setSearch}
      badges={{ newOrders: stats.newOrders }}
    >

        {/* إحصاءات */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
          <Stat icon={IconReceipt} tone="default" label="إجمالي الطلبات" value={stats.total} />
          <Stat icon={IconAlert}   tone="pink"    label="طلبات جديدة"   value={stats.newOrders} />
          <Stat icon={IconWallet}  tone="success" label="إيرادات مسلّمة" value={fmt(stats.revenue)} />
        </div>

        {/* فلاتر */}
        <Card style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "12px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[{ val: "", label: "الكل" }, ...STATUSES].map(s => {
              const active = statusFilter === s.val;
              return (
                <button key={s.val} onClick={() => setStatusFilter(s.val)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontWeight: 600, fontSize: 12,
                    cursor: "pointer", border: "none",
                    background: active ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : "#FAFBFC",
                    color: active ? "#fff" : ADMIN.textMuted,
                    fontFamily: "'Tajawal',sans-serif",
                    boxShadow: active ? "0 4px 10px rgba(99,102,241,.25)" : "none",
                  }}>
                  {s.label}
                </button>
              );
            })}
          </div>
          <button onClick={exportCSV} disabled={filtered.length === 0}
            style={{
              padding: "7px 12px", borderRadius: 8, fontWeight: 600, fontSize: 12,
              cursor: filtered.length ? "pointer" : "not-allowed",
              background: "#ECFDF5", color: "#10B981", border: "1px solid #A7F3D0",
              fontFamily: "'Tajawal',sans-serif", opacity: filtered.length ? 1 : .5,
              marginInlineStart: "auto",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
            <IconDownload size={13} /> تصدير CSV
          </button>
        </Card>

        {/* الطلبات */}
        {loading ? (
          <Card><div style={{ textAlign: "center", padding: 24, color: ADMIN.textMuted, fontSize: 13 }}>جاري التحميل...</div></Card>
        ) : filtered.length === 0 ? (
          <Card>
            <div style={{ textAlign: "center", padding: 36, color: ADMIN.textSubtle }}>
              <IconReceipt size={36} style={{ color: ADMIN.textSubtle, marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>لا توجد طلبات {search || statusFilter ? "مطابقة" : "بعد"}</div>
            </div>
          </Card>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((o, idx) => {
              const st = STATUSES.find(s => s.val === o.status) || STATUSES[0];
              const isOpen = expanded === o.docId;
              return (
                <Card key={o.docId} padded={false} style={{ overflow: "hidden", borderInlineStart: `3px solid ${st.col}` }}>

                  {/* رأس الطلب */}
                  <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: ADMIN.text, fontFamily: "monospace" }}>{String(o.id || "").slice(0, 12)}</span>
                        <span style={{ background: st.bg, color: st.col, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{st.label}</span>
                        <span style={{
                          background: o.payment?.method === "cash" ? "#FFFBEB" : "#EFF6FF",
                          color: o.payment?.method === "cash" ? "#B45309" : ADMIN.accent,
                          borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 600,
                        }}>
                          {o.payment?.method === "cash" ? "كاش" : "تحويل"}
                        </span>
                        <span style={{ fontSize: 11, color: ADMIN.textSubtle }}>{fmtDate(o.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: ADMIN.textMuted }}>
                        <span style={{ fontWeight: 600, color: ADMIN.text }}>{o.customer?.name}</span>
                        <span style={{ margin: "0 8px", color: ADMIN.textSubtle }}>·</span>
                        <span dir="ltr" style={{ fontFamily: "monospace" }}>{o.customer?.phone}</span>
                        <span style={{ margin: "0 8px", color: ADMIN.textSubtle }}>·</span>
                        <span>{o.customer?.cityLabel || o.customer?.city}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: ADMIN.text }}>{fmt(o.totals?.grandTotal || 0)}</span>
                      <button onClick={() => setExpanded(isOpen ? null : o.docId)}
                        style={{
                          background: "#FAFBFC", color: ADMIN.textMuted,
                          border: `1px solid ${ADMIN.border}`, borderRadius: 8,
                          padding: "6px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer",
                          fontFamily: "'Tajawal',sans-serif",
                          display: "inline-flex", alignItems: "center", gap: 6,
                        }}>
                        تفاصيل
                        <IconChevDown size={13} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
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

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: 12, color: ADMIN.textMuted, marginInlineEnd: 4 }}>الحالة:</span>
                        {STATUSES.map(s => (
                          <button key={s.val} onClick={() => updateStatus(o.docId, s.val)}
                            style={{
                              padding: "5px 11px", borderRadius: 6, fontWeight: 600, fontSize: 11,
                              cursor: "pointer", border: "none",
                              background: o.status === s.val ? s.col : s.bg,
                              color: o.status === s.val ? "#fff" : s.col,
                              fontFamily: "'Tajawal',sans-serif",
                            }}>
                            {s.label}
                          </button>
                        ))}
                        {/* Payment status — particularly for bank transfer orders so admin
                            can mark a confirmed transfer as PAID without DB editing. */}
                        <span style={{ fontWeight: 600, fontSize: 12, color: ADMIN.textMuted, marginInlineStart: 8, marginInlineEnd: 4 }}>الدفع:</span>
                        <select
                          value={o.payment?.status || ""}
                          onChange={(e) => updatePaymentStatus(o.docId, e.target.value)}
                          style={{
                            padding: "5px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                            border: `1px solid ${ADMIN.border}`, background: "#fff",
                            color: ADMIN.text, fontFamily: "'Tajawal',sans-serif", cursor: "pointer",
                          }}
                        >
                          <option value="COD_PENDING">بانتظار الدفع (كاش)</option>
                          <option value="BANK_PENDING">بانتظار التحويل</option>
                          <option value="PAID">مدفوع</option>
                          <option value="REFUNDED">مُستردّ</option>
                          <option value="FAILED">فشل</option>
                        </select>
                        <button onClick={() => printWaybill(o, storeSettings)}
                          style={{
                            background: ADMIN.accentBg, color: ADMIN.accent, border: "none", borderRadius: 6,
                            padding: "5px 11px", fontWeight: 600, fontSize: 11, cursor: "pointer",
                            fontFamily: "'Tajawal',sans-serif",
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}>
                          <IconTruck size={12} /> بوليصة شحن
                        </button>
                        <button onClick={() => deleteOrder(o.docId)}
                          style={{
                            marginInlineStart: "auto",
                            background: "#FEF2F2", color: "#EF4444", border: "none", borderRadius: 6,
                            padding: "5px 11px", fontWeight: 600, fontSize: 11, cursor: "pointer",
                            fontFamily: "'Tajawal',sans-serif",
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}>
                          <IconTrash size={12} /> حذف
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
    </AdminLayout>
  );
}
