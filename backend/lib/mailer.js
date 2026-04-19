const nodemailer = require("nodemailer");

/**
 * SMTP env vars (all optional — if any missing, email is silently skipped):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE
 *
 * Example for Gmail app-password:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=465
 *   SMTP_SECURE=true
 *   SMTP_USER=store@gmail.com
 *   SMTP_PASS=xxxx xxxx xxxx xxxx
 *   SMTP_FROM="كشخة <store@gmail.com>"
 */

let _transporter = null;
function getTransporter() {
  if (_transporter) return _transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: String(SMTP_SECURE || "").toLowerCase() === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _transporter;
}

function isConfigured() {
  return !!getTransporter();
}

async function sendMail({ to, subject, html, text }) {
  const tr = getTransporter();
  if (!tr || !to) return { skipped: true };
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  try {
    const info = await tr.sendMail({ from, to, subject, html, text });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    console.error("sendMail error:", e.message);
    return { ok: false, error: e.message };
  }
}

// قالب بسيط لإشعار طلب جديد للعميل
function orderConfirmationHTML(order, storeName = "كشخة") {
  const items = (order.items || [])
    .map(it => `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(it.name)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${Number(it.qty) || 1}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:left">${(Number(it.price) || 0).toFixed(2)} د.إ</td>
    </tr>`)
    .join("");
  const t = order.totals || {};
  const c = order.customer || {};
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8" /><title>تأكيد الطلب</title></head>
<body style="font-family:Tahoma,Arial,sans-serif;background:#F8FAFC;padding:20px;color:#0F172A;margin:0">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0">
    <div style="background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;padding:24px;text-align:center">
      <div style="font-size:22px;font-weight:900">✅ تم استلام طلبك</div>
      <div style="font-size:14px;opacity:.9;margin-top:6px">شكراً لك على الشراء من ${escapeHtml(storeName)}</div>
    </div>
    <div style="padding:24px">
      <div style="background:#F8FAFC;border-radius:10px;padding:14px;margin-bottom:20px">
        <div><b>رقم الطلب:</b> <span style="direction:ltr">${escapeHtml(order.id || "")}</span></div>
        <div><b>الاسم:</b> ${escapeHtml(c.name || "")}</div>
        <div><b>الهاتف:</b> <span style="direction:ltr">${escapeHtml(c.phone || "")}</span></div>
        <div><b>العنوان:</b> ${escapeHtml(c.address || "")}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
        <thead>
          <tr style="background:#6366F1;color:#fff"><th style="padding:8px;text-align:right">المنتج</th><th style="padding:8px">الكمية</th><th style="padding:8px;text-align:left">السعر</th></tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
      <div style="text-align:left;font-weight:900;font-size:18px;color:#6366F1">
        الإجمالي: ${Number(t.grandTotal || 0).toFixed(2)} د.إ
      </div>
      <div style="margin-top:20px;padding:14px;background:#ECFDF5;border-radius:10px;font-size:13px;color:#059669">
        سنتواصل معك قريباً لتأكيد الطلب وموعد التسليم.
      </div>
    </div>
    <div style="padding:16px;text-align:center;font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0">
      ${escapeHtml(storeName)} — شكراً لتسوقك معنا 💜
    </div>
  </div>
</body>
</html>
  `.trim();
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = { sendMail, isConfigured, orderConfirmationHTML };
