const KEY = "kashkha_recently_viewed";
const MAX = 12;

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addRecentlyViewed(product) {
  if (!product?.id) return;
  const slim = {
    id: product.id,
    name: product.name,
    nameEn: product.nameEn,
    price: product.price,
    oldPrice: product.oldPrice,
    image: product.image,
    category: product.category,
  };
  try {
    const cur = getRecentlyViewed().filter(p => String(p.id) !== String(product.id));
    const next = [slim, ...cur].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch { return []; }
}

export function clearRecentlyViewed() {
  try { localStorage.removeItem(KEY); } catch {}
}
