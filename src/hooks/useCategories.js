import { useEffect, useState } from "react";
import { apiFetch } from "../api";

function fromCache() {
  try {
    const s = localStorage.getItem("categories");
    const p = s ? JSON.parse(s) : [];
    return Array.isArray(p) ? p.map((c) => (typeof c === "string" ? { name: c } : c)).filter((c) => c?.name) : [];
  } catch { return []; }
}

export function useCategories() {
  const [categories, setCategories] = useState(fromCache);
  const [loading, setLoading] = useState(true);

  const refresh = () =>
    apiFetch("/api/categories")
      .then((data) => { setCategories(data); localStorage.setItem("categories", JSON.stringify(data)); })
      .catch(() => {});

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  return { categories, loading, refresh };
}

export async function addCategory(cat) {
  return apiFetch("/api/categories", { method: "POST", body: cat });
}

export async function updateCategory(id, data) {
  return apiFetch(`/api/categories/${id}`, { method: "PUT", body: data });
}

export async function deleteCategory(id) {
  return apiFetch(`/api/categories/${id}`, { method: "DELETE" });
}
