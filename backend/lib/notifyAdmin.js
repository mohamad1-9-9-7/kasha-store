/**
 * إشعار الأدمن بأي طلب جديد.
 * يدعم 3 طرق (أي أو كلها حسب الإعدادات):
 *   1) Webhook URL عام (Zapier / Make / n8n / Discord / Slack / …)
 *   2) WhatsApp Cloud API من Meta (مجاني) — بيرسل رسالة مباشرة لرقم الأدمن
 *   3) Telegram Bot (مجاني) — إذا عندك بوت وch at id
 *
 * كلها fire-and-forget: ما تعلّق الـ response للعميل لو فشل أي واحد منها.
 */

const { pool } = require("../db");

function fmtAED(n) {
  const x = Number(n) || 0;
  return `${x.toFixed(2)} AED`;
}

function buildOrderText(order) {
  const lines = [];
  lines.push(`🛍️ *طلب جديد!*`);
  lines.push(`رقم الطلب: ${order.id}`);
  lines.push(`العميل: ${order.customer?.name || "—"}`);
  lines.push(`هاتف: ${order.customer?.phone || "—"}`);
  if (order.customer?.city) lines.push(`المدينة: ${order.customer.city}`);
  if (order.customer?.address) lines.push(`العنوان: ${order.customer.address}`);
  lines.push(``);
  lines.push(`*المنتجات:*`);
  (order.items || []).forEach((it) => {
    const vs = (it.variantSummary || []).map((v) => `${v.group}: ${v.value}`).join(" - ");
    lines.push(`• ${it.name} × ${it.qty}${vs ? ` (${vs})` : ""}`);
  });
  lines.push(``);
  lines.push(`الإجمالي: ${fmtAED(order.totals?.grandTotal || order.totals?.subtotal)}`);
  if (order.payment?.method) {
    lines.push(`الدفع: ${order.payment.method === "cash" ? "كاش عند الاستلام" : "تحويل بنكي"}`);
  }
  if (order.customer?.note) lines.push(`ملاحظات: ${order.customer.note}`);
  return lines.join("\n");
}

/* ═══════════ 1) Webhook عام ═══════════ */
async function sendWebhook(url, order) {
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "order.created",
        text: buildOrderText(order),
        order,
      }),
    });
    if (!res.ok) console.error("Webhook failed:", res.status);
  } catch (e) {
    console.error("Webhook error:", e.message);
  }
}

/* ═══════════ 2) WhatsApp Cloud API (Meta) ═══════════ */
async function sendWhatsApp({ token, phoneNumberId, toPhone }, order) {
  if (!token || !phoneNumberId || !toPhone) return;
  try {
    const normalized = String(toPhone).replace(/\D/g, "").replace(/^0/, "971");
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalized,
        type: "text",
        text: { body: buildOrderText(order) },
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("WhatsApp Cloud API failed:", res.status, err.slice(0, 200));
    }
  } catch (e) {
    console.error("WhatsApp error:", e.message);
  }
}

/* ═══════════ 3) Telegram Bot ═══════════ */
async function sendTelegram({ token, chatId }, order) {
  if (!token || !chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildOrderText(order),
        parse_mode: "Markdown",
      }),
    });
    if (!res.ok) console.error("Telegram failed:", res.status);
  } catch (e) {
    console.error("Telegram error:", e.message);
  }
}

/* ═══════════ المدخل الرئيسي ═══════════ */
async function notifyAdminOfOrder(order) {
  try {
    const { rows } = await pool.query("SELECT data FROM settings WHERE id = 'main'");
    const s = rows[0]?.data || {};

    // كل وحدة بتنشغل بشكل مستقل، ما تعلّق التانية
    const tasks = [];
    if (s.adminWebhookUrl) tasks.push(sendWebhook(s.adminWebhookUrl, order));
    if (s.waCloudToken && s.waCloudPhoneId && s.waAdminPhone) {
      tasks.push(sendWhatsApp({
        token: s.waCloudToken,
        phoneNumberId: s.waCloudPhoneId,
        toPhone: s.waAdminPhone,
      }, order));
    }
    if (s.telegramBotToken && s.telegramChatId) {
      tasks.push(sendTelegram({ token: s.telegramBotToken, chatId: s.telegramChatId }, order));
    }

    await Promise.allSettled(tasks);
  } catch (e) {
    console.error("notifyAdminOfOrder:", e.message);
  }
}

module.exports = { notifyAdminOfOrder, buildOrderText };
