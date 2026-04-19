import React, { useRef, useState } from "react";
import { fmt } from "../Theme";

/**
 * InvoiceModal — عرض فاتورة بعد إتمام الطلب
 * props:
 *   order: { id, createdAt, customer, items, totals, payment, ... }
 *   store: { storeName, whatsapp, storeEmail, storeAddress }
 *   onClose: () => void
 */
export default function InvoiceModal({ order, store, onClose }) {
  const invoiceRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  if (!order) return null;

  const date = new Date(order.createdAt || Date.now());
  const dateStr = date.toLocaleDateString("ar-AE", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const c = order.customer || {};
  const t = order.totals || {};
  const items = order.items || [];

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${order.id}.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
      alert("فشل تنزيل الفاتورة، جرب الطباعة بدلاً من ذلك");
    } finally {
      setDownloading(false);
    }
  };

  const printInvoice = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>فاتورة ${order.id}</title>
          <style>
            body { font-family: 'Tajawal', Arial, sans-serif; margin: 0; padding: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${invoiceRef.current.outerHTML}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, padding: 16, overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, maxWidth: 720, width: "100%",
          maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.3)",
        }}
      >
        {/* أزرار التحكم */}
        <div style={{
          position: "sticky", top: 0, background: "#fff", padding: "14px 20px",
          borderBottom: "1px solid #E2E8F0", display: "flex", gap: 10, alignItems: "center",
          justifyContent: "space-between", zIndex: 2,
        }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: "#0F172A" }}>
            🧾 فاتورة الطلب
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={downloadPDF}
              disabled={downloading}
              style={{
                background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff",
                border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 800,
                fontSize: 13, cursor: downloading ? "wait" : "pointer",
                fontFamily: "'Tajawal',sans-serif",
              }}
            >
              {downloading ? "⏳ جاري التنزيل..." : "📥 تنزيل PDF"}
            </button>
            <button
              onClick={printInvoice}
              style={{
                background: "#F1F5F9", color: "#334155",
                border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 800,
                fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif",
              }}
            >
              🖨️ طباعة
            </button>
            <button
              onClick={onClose}
              style={{
                background: "#FEF2F2", color: "#EF4444",
                border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 800,
                fontSize: 16, cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* محتوى الفاتورة */}
        <div
          ref={invoiceRef}
          style={{
            padding: "32px 28px", fontFamily: "'Tajawal',Arial,sans-serif",
            direction: "rtl", color: "#0F172A", background: "#fff",
          }}
        >
          {/* رأس الفاتورة */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            borderBottom: "3px solid #6366F1", paddingBottom: 20, marginBottom: 20,
          }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#6366F1", marginBottom: 4 }}>
                {store?.storeName || "كشخة"}
              </div>
              {store?.storeAddress && (
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>📍 {store.storeAddress}</div>
              )}
              {store?.whatsapp && (
                <div style={{ fontSize: 12, color: "#64748B", direction: "ltr", textAlign: "right" }}>📱 {store.whatsapp}</div>
              )}
              {store?.storeEmail && (
                <div style={{ fontSize: 12, color: "#64748B", direction: "ltr", textAlign: "right" }}>✉️ {store.storeEmail}</div>
              )}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0F172A" }}>فاتورة</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>رقم الطلب</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#6366F1", direction: "ltr" }}>{order.id}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 8 }}>التاريخ</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{dateStr}</div>
            </div>
          </div>

          {/* بيانات العميل */}
          <div style={{
            background: "#F8FAFC", borderRadius: 12, padding: "16px 20px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#6366F1", marginBottom: 10 }}>
              بيانات العميل
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
              <div><b>الاسم:</b> {c.name || "—"}</div>
              <div><b>الهاتف:</b> <span style={{ direction: "ltr" }}>{c.phone || "—"}</span></div>
              <div><b>المدينة:</b> {c.cityLabel || c.city || "—"}</div>
              <div><b>العنوان:</b> {c.address || "—"}</div>
            </div>
          </div>

          {/* جدول المنتجات */}
          <table style={{
            width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 13,
          }}>
            <thead>
              <tr style={{ background: "#6366F1", color: "#fff" }}>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>المنتج</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, width: 60 }}>الكمية</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, width: 90 }}>السعر</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, width: 100 }}>المجموع</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const qty = Number(it.qty) || 1;
                const price = Number(it.price) || 0;
                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #E2E8F0" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 700 }}>{it.name}</div>
                      {it.variantSummary?.length > 0 && (
                        <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                          {it.variantSummary.map(v => `${v.group}: ${v.value}`).join(" - ")}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>{qty}</td>
                    <td style={{ padding: "10px 12px", textAlign: "left" }}>{fmt(price)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>{fmt(price * qty)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* الإجماليات */}
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 20 }}>
            <div style={{ minWidth: 280, fontSize: 13 }}>
              {t.subtotal !== undefined && (
                <div style={row}><span>المجموع الفرعي</span><span>{fmt(t.subtotal)}</span></div>
              )}
              {t.couponDiscount > 0 && (
                <div style={{ ...row, color: "#10B981" }}>
                  <span>خصم الكوبون {t.couponCode ? `(${t.couponCode})` : ""}</span>
                  <span>-{fmt(t.couponDiscount)}</span>
                </div>
              )}
              {t.pointsDiscount > 0 && (
                <div style={{ ...row, color: "#A855F7" }}>
                  <span>خصم النقاط</span>
                  <span>-{fmt(t.pointsDiscount)}</span>
                </div>
              )}
              {t.bundleDiscount > 0 && (
                <div style={{ ...row, color: "#10B981" }}>
                  <span>خصم الباندل ({t.bundleTier}%)</span>
                  <span>-{fmt(t.bundleDiscount)}</span>
                </div>
              )}
              {t.shippingFee !== undefined && (
                <div style={row}>
                  <span>التوصيل</span>
                  <span>{t.shippingFee > 0 ? fmt(t.shippingFee) : "مجاني"}</span>
                </div>
              )}
              {t.vatAmount > 0 && (
                <div style={row}>
                  <span>ضريبة القيمة المضافة ({t.vatPercent}%){t.vatIncluded ? " شاملة" : ""}</span>
                  <span>{fmt(t.vatAmount)}</span>
                </div>
              )}
              <div style={{
                ...row, fontSize: 17, fontWeight: 900, color: "#6366F1",
                borderTop: "2px solid #6366F1", paddingTop: 10, marginTop: 6,
              }}>
                <span>الإجمالي</span>
                <span>{fmt(t.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* طريقة الدفع */}
          {order.payment && (
            <div style={{
              background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 10,
              padding: "10px 14px", fontSize: 12, color: "#92400E",
            }}>
              <b>طريقة الدفع:</b> {order.payment.method === "cash" ? "الدفع عند الاستلام" : "تحويل بنكي"}
              {order.payment.transferRef && <span> — مرجع: <span style={{ direction: "ltr" }}>{order.payment.transferRef}</span></span>}
            </div>
          )}

          {/* تذييل */}
          <div style={{
            marginTop: 28, paddingTop: 16, borderTop: "1px dashed #E2E8F0",
            textAlign: "center", fontSize: 12, color: "#94A3B8",
          }}>
            شكراً لتسوقك من {store?.storeName || "كشخة"} 💜
          </div>
        </div>
      </div>
    </div>
  );
}

const row = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 8,
};
