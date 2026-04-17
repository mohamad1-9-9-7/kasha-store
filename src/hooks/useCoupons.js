import { useEffect, useState } from "react";
import { apiFetch } from "../api";

function fromCache() {
  try {
    const s = localStorage.getItem("coupons");
    const p = s ? JSON.parse(s) : [];
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

export function useCoupons() {
  const [coupons, setCoupons] = useState(fromCache);
  const [loading, setLoading] = useState(true);

  const refresh = () =>
    apiFetch("/api/coupons")
      .then((data) => { setCoupons(data); localStorage.setItem("coupons", JSON.stringify(data)); })
      .catch(() => {});

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  return { coupons, loading, refresh };
}

export async function saveCoupon(coupon) {
  return apiFetch("/api/coupons", { method: "POST", body: coupon });
}

export async function updateCoupon(code, data) {
  return apiFetch(`/api/coupons/${code}`, { method: "PUT", body: data });
}

export async function deleteCoupon(code) {
  return apiFetch(`/api/coupons/${code}`, { method: "DELETE" });
}

export async function incrementCouponUses(code) {
  return apiFetch(`/api/coupons/${code}/use`, { method: "POST" });
}
