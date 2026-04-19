import { useEffect, useState } from "react";
import { apiFetch } from "../api";

export function useRatings(productId) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    if (!productId) return Promise.resolve();
    return apiFetch(`/api/ratings/${productId}`)
      .then((data) => { setRatings(Array.isArray(data) ? data : []); })
      .catch(() => { setRatings([]); });
  };

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [productId]);

  return { ratings, loading, refresh };
}

export async function submitRating(productId, { stars, comment, name }) {
  return apiFetch(`/api/ratings/${productId}`, {
    method: "POST",
    body: { stars, comment, name },
  });
}

export async function deleteRating(productId) {
  return apiFetch(`/api/ratings/${productId}`, { method: "DELETE" });
}

/* ── Admin ── */
export async function fetchPendingRatings() {
  return apiFetch("/api/ratings/admin/pending");
}

export async function fetchAllRatings() {
  return apiFetch("/api/ratings/admin/all");
}

export async function moderateRating(productId, userId, approved) {
  return apiFetch(`/api/ratings/admin/${productId}/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: { approved },
  });
}

export async function adminDeleteRating(productId, userId) {
  return apiFetch(`/api/ratings/admin/${productId}/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}
