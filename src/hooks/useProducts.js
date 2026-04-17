import { useEffect, useState } from "react";
import { apiFetch } from "../api";

function fromCache() {
  try {
    const s = localStorage.getItem("products");
    const p = s ? JSON.parse(s) : [];
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

export function useProducts() {
  const [products, setProducts] = useState(fromCache);
  const [loading, setLoading] = useState(true);

  const refresh = () =>
    apiFetch("/api/products")
      .then((data) => { setProducts(data); localStorage.setItem("products", JSON.stringify(data)); })
      .catch(() => {});

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  return { products, loading, refresh };
}

export async function saveProduct(product) {
  return apiFetch("/api/products", { method: "POST", body: product });
}

export async function updateProduct(id, data) {
  return apiFetch(`/api/products/${id}`, { method: "PUT", body: data });
}

export async function replaceProduct(product) {
  return apiFetch(`/api/products/${product.id}`, { method: "PUT", body: product });
}

export async function deleteProduct(id) {
  return apiFetch(`/api/products/${id}`, { method: "DELETE" });
}
