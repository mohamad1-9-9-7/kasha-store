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
};

function fromCache() {
  try {
    const s = localStorage.getItem("storeSettings") || localStorage.getItem("settings");
    return s ? { ...DEFAULTS, ...JSON.parse(s) } : DEFAULTS;
  } catch { return DEFAULTS; }
}

export function useSettings() {
  const [settings, setSettings] = useState(fromCache);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/settings")
      .then((data) => {
        const merged = { ...DEFAULTS, ...data };
        setSettings(merged);
        localStorage.setItem("storeSettings", JSON.stringify(merged));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}

export async function saveSettings(data) {
  const updated = await apiFetch("/api/settings", { method: "PUT", body: data });
  localStorage.setItem("storeSettings", JSON.stringify(updated));
  return updated;
}
