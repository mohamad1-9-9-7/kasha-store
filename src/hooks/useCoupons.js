import { useEffect, useState } from "react";
import { apiFetch } from "../api";

export function useCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = () =>
    apiFetch("/api/coupons")
      .then((data) => { setCoupons(data); })
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
