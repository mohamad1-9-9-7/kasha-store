// Generate a printable Waybill (PDF) using jsPDF
// Opens a new browser tab with a printable page as fallback.

export async function printWaybill(order, storeSettings) {
  const htmlWindow = window.open("", "_blank");
  if (!htmlWindow) {
    alert("⚠️ تم منع فتح النافذة. اسمح بالنوافذ المنبثقة.");
    return;
  }
  const c = order.customer || {};
  const t = order.totals || {};
  const storeName = storeSettings?.storeName || "كشخة";
  const waPhone = storeSettings?.whatsapp || "";
  const addr = storeSettings?.storeAddress || "";

  const items = (order.items || [])
    .map((it) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${escape(it.name)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${Number(it.qty) || 1}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${it.weight ? `${Number(it.weight).toFixed(2)} كغ` : "—"}</td>
      </tr>`)
    .join("");

  const totalWeight = (order.items || []).reduce(
    (s, it) => s + (Number(it.weight) || 0) * (Number(it.qty) || 1), 0
  );

  const waybillNo = `WB-${String(order.id || "").replace(/\D+/g, "").slice(-8) || Date.now().toString().slice(-8)}`;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<title>بوليصة شحن ${escape(order.id || "")}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Tahoma', Arial, sans-serif; background: #F8FAFC; padding: 20px; color: #0F172A; }
  .waybill { max-width: 800px; margin: 0 auto; background: #fff; border: 2px solid #0F172A; border-radius: 8px; overflow: hidden; }
  .header { background: #0F172A; color: #fff; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 24px; }
  .header .wb-no { background: #fff; color: #0F172A; padding: 6px 14px; border-radius: 6px; font-weight: 900; font-size: 16px; font-family: monospace; direction: ltr; }
  .body { padding: 20px 24px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .box { border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 12px 14px; }
  .box h3 { font-size: 12px; color: #64748B; margin-bottom: 8px; font-weight: 700; text-transform: uppercase; }
  .box .lines div { font-size: 13px; line-height: 1.9; }
  .box .lines b { color: #0F172A; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0 16px; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; }
  thead tr { background: #0F172A; color: #fff; }
  th { padding: 8px; text-align: right; font-size: 12px; }
  .totals { display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; padding: 12px 16px; border-radius: 8px; border: 1.5px solid #E2E8F0; margin-bottom: 14px; }
  .totals .grand { font-size: 20px; font-weight: 900; color: #0F172A; }
  .sig { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; }
  .sig div { border-top: 1.5px solid #CBD5E1; padding-top: 6px; text-align: center; font-size: 12px; color: #64748B; }
  .footer { padding: 14px 24px; background: #F1F5F9; font-size: 11px; color: #64748B; text-align: center; border-top: 1px solid #E2E8F0; }
  .barcode { font-family: monospace; font-size: 28px; letter-spacing: 3px; text-align: center; padding: 12px; background: #fff; border: 1.5px dashed #CBD5E1; border-radius: 8px; margin-bottom: 14px; direction: ltr; }
  .cod-badge { display: inline-block; background: #FEF2F2; color: #EF4444; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; margin-right: 6px; }
  @media print {
    body { padding: 0; background: #fff; }
    .waybill { border: 2px solid #000; max-width: 100%; }
    .no-print { display: none; }
  }
  .print-btn { position: fixed; top: 20px; left: 20px; background: #6366F1; color: #fff; border: none; border-radius: 10px; padding: 12px 22px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: 'Tahoma', sans-serif; box-shadow: 0 6px 20px rgba(99,102,241,.4); z-index: 1000; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨️ طباعة البوليصة</button>
<div class="waybill">
  <div class="header">
    <h1>📦 بوليصة شحن</h1>
    <div class="wb-no">${waybillNo}</div>
  </div>

  <div class="body">
    <div class="barcode">* ${waybillNo} *</div>

    <div class="grid">
      <div class="box">
        <h3>من (المرسل)</h3>
        <div class="lines">
          <div><b>${escape(storeName)}</b></div>
          <div>${escape(addr || "—")}</div>
          <div>📞 ${escape(waPhone || "—")}</div>
        </div>
      </div>
      <div class="box">
        <h3>إلى (المستلم)</h3>
        <div class="lines">
          <div><b>${escape(c.name || "—")}</b></div>
          <div>${escape(c.address || "")}</div>
          <div>${escape(c.cityLabel || c.city || "")}</div>
          <div>📞 ${escape(c.phone || "—")}</div>
          ${c.notes ? `<div style="color:#B45309">📝 ${escape(c.notes)}</div>` : ""}
        </div>
      </div>
    </div>

    <table>
      <thead><tr><th>المنتج</th><th style="text-align:center">الكمية</th><th style="text-align:center">الوزن</th></tr></thead>
      <tbody>${items}</tbody>
    </table>

    <div class="grid" style="grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px;">
      <div class="box" style="text-align:center">
        <h3>عدد القطع</h3>
        <div style="font-size: 20px; font-weight: 900;">${(order.items || []).reduce((s, it) => s + (Number(it.qty) || 1), 0)}</div>
      </div>
      <div class="box" style="text-align:center">
        <h3>الوزن الكلي</h3>
        <div style="font-size: 20px; font-weight: 900;">${totalWeight.toFixed(2)} كغ</div>
      </div>
      <div class="box" style="text-align:center">
        <h3>المنطقة</h3>
        <div style="font-size: 14px; font-weight: 700;">${escape(t.shippingZone || c.cityLabel || c.city || "—")}</div>
      </div>
    </div>

    <div class="totals">
      <div>
        <div style="font-size: 12px; color: #64748B;">طريقة الدفع</div>
        <div style="font-weight: 800; font-size: 15px; margin-top: 4px;">
          ${order.payment?.method === "cash" ? "💵 دفع عند الاستلام <span class='cod-badge'>COD</span>" : "🏦 تحويل بنكي (مدفوع)"}
        </div>
      </div>
      <div style="text-align:left">
        <div style="font-size: 12px; color: #64748B;">المبلغ الإجمالي</div>
        <div class="grand">${Number(t.grandTotal || 0).toFixed(2)} د.إ</div>
      </div>
    </div>

    <div class="sig">
      <div>توقيع عامل التوصيل</div>
      <div>توقيع العميل</div>
    </div>
  </div>

  <div class="footer">
    ${escape(storeName)} — شكراً لاختياركم. لأي استفسار: ${escape(waPhone || "—")}
  </div>
</div>
<script>setTimeout(() => { try { window.print(); } catch {} }, 350);</script>
</body>
</html>`;

  htmlWindow.document.write(html);
  htmlWindow.document.close();
}

function escape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
