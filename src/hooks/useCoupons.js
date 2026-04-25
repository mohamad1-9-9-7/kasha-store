import { useEffect, useState } from "react";
import { apiFetch } from "../api";

// useCoupons() now requires an admin token — GET /api/coupons is admin-only
// to prevent leaking private/VIP coupon codes. Storefront callers should use
// validateCouponCode() against POST /api/coupons/validate instead.
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

// Public coupon validation — server returns { code, type, value, minOrder } if
// the code is valid (active, not expired, not maxed out). Throws on failure
// with the server's error message.
export async function validateCouponCode(code) {
  if (!code) throw new Error("رمز الكوبون مطلوب");
  return apiFetch("/api/coupons/validate", {
    method: "POST",
    body: { code },
  });
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
