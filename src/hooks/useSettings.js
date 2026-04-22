import { useEffect, useState } from "react";
import { apiFetch } from "../api";

const DEFAULTS = {
  storeName: "كشخة",
  whatsapp: "971585446473",
  announcement: "🚚 توصيل مجاني للطلبات فوق 200 درهم",
  instagram: "",
  tiktok: "",
  facebook: "",
  twitter: "",
  storeEmail: "",
  storeAddress: "",
  // نظام النقط
  pointsEnabled:     true,
  pointsPerAED:      1,    // كم نقطة لكل درهم
  pointsRedeemRate:  100,  // كم نقطة مطلوبة للاستبدال
  pointsRedeemValue: 10,   // قيمة الخصم (درهم) لكل مجموعة نقط
  // الشحن والطلب
  freeShipThreshold: 200,  // حد الشحن المجاني (درهم)
  minOrderAmount:    0,    // الحد الأدنى للطلب (درهم)
  shippingFee:       15,   // رسوم التوصيل (درهم)
  // ضريبة القيمة المضافة
  vatEnabled:        true, // تفعيل حساب الضريبة
  vatPercent:        5,    // نسبة الضريبة (%)
  vatIncluded:       true, // true = السعر شامل الضريبة، false = تُضاف فوق السعر
};

// Cached on every load so non-hook helpers (fmt, priceVat) can read VAT config synchronously.
const CACHE_KEY = "kashkha_settings_cache";

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null") || null; }
  catch { return null; }
}

export function useSettings() {
  const [settings, setSettings] = useState(() => ({ ...DEFAULTS, ...(readCache() || {}) }));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/settings")
      .then((data) => {
        const merged = { ...DEFAULTS, ...data };
        setSettings(merged);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(merged)); } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}

export async function saveSettings(data) {
  return apiFetch("/api/settings", { method: "PUT", body: data });
}
