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
};

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/settings")
      .then((data) => { setSettings({ ...DEFAULTS, ...data }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}

export async function saveSettings(data) {
  return apiFetch("/api/settings", { method: "PUT", body: data });
}
