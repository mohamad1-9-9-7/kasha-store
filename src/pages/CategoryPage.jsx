import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { C, shadow, r, slugify, fmt, fmtPrice, catName, prodName } from "../Theme";
import MiniNav from "../components/MiniNav";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";
import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";
import { useRatingsSummary } from "../hooks/useRatings";
import { useWishlist } from "../context/WishlistContext";
import { CartContext } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { ProductSkeleton } from "../components/Skeleton";
import QuickView from "../components/QuickView";
import DualRangeSlider from "../components/DualRangeSlider";
import { getRecentlyViewed, addRecentlyViewed } from "../utils/recentlyViewed";

const PAGE_SIZE = 24;

const FREE_SHIP_THRESHOLD = 200;
const NEW_DAYS = 30;

/* ═══════════ مكوّنات فلاتر قابلة لإعادة الاستخدام ═══════════ */

function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid #F1F5F9", padding: "14px 0" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
          background: "transparent", border: "none", padding: 0, cursor: "pointer",
          fontFamily: "'Tajawal',sans-serif", color: "#0F172A", fontSize: 14, fontWeight: 800,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
          {title}
        </span>
        <span style={{ color: "#94A3B8", fontSize: 14, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
      </button>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

function Checkbox({ checked, onChange, label, count, disabled, swatch }) {
  const isZero = count === 0;
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 10, padding: "6px 2px", cursor: (disabled || isZero) ? "not-allowed" : "pointer",
      opacity: (disabled || isZero) ? 0.45 : 1, userSelect: "none",
    }}>
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled || isZero}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: "#6366F1", cursor: "inherit" }}
      />
      {swatch && (
        <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: "50%", background: swatch, border: "1px solid #E2E8F0" }} />
      )}
      <span style={{ flex: 1, fontSize: 13, color: "#334155", fontWeight: 600, fontFamily: "'Tajawal',sans-serif" }}>{label}</span>
      {typeof count === "number" && (
        <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700 }}>({count})</span>
      )}
    </label>
  );
}

function ShowMoreList({ items, renderItem, initial = 6, lang }) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const t = k => T[lang][k] ?? T.ar[k] ?? k;
  const filtered = query ? items.filter(it => String(it.label || it).toLowerCase().includes(query.toLowerCase())) : items;
  const shown = showAll ? filtered : filtered.slice(0, initial);
  return (
    <>
      {items.length > 10 && (
        <input
          placeholder={t("f_search_in")}
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #E2E8F0",
            fontSize: 12, marginBottom: 8, fontFamily: "'Tajawal',sans-serif", outline: "none", background: "#F8FAFC", boxSizing: "border-box",
          }}
        />
      )}
      <div>
        {shown.map(renderItem)}
        {filtered.length === 0 && (
          <div style={{ fontSize: 12, color: "#94A3B8", padding: "6px 0" }}>{t("f_no_match")}</div>
        )}
      </div>
      {filtered.length > initial && (
        <button
          onClick={() => setShowAll(v => !v)}
          style={{
            marginTop: 6, background: "transparent", border: "none", color: "#6366F1",
            fontSize: 12, fontWeight: 800, cursor: "pointer", padding: 0, fontFamily: "'Tajawal',sans-serif",
          }}
        >
          {showAll ? `− ${t("f_show_less")}` : `+ ${t("f_show_more")} (${filtered.length - initial})`}
        </button>
      )}
    </>
  );
}

/* ═══════════ الصفحة الرئيسية ═══════════ */

export default function CategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = k => T[lang][k] ?? T.ar[k] ?? k;
  const [searchParams, setSearchParams] = useSearchParams();

  const [nowMs, setNowMs] = useState(Date.now());
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ─── حالة الفلاتر (مربوطة مع الـ URL)
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "default");
  const [priceMin, setPriceMin] = useState(searchParams.get("pmin") || "");
  const [priceMax, setPriceMax] = useState(searchParams.get("pmax") || "");
  const [minStars, setMinStars] = useState(Number(searchParams.get("stars") || 0));

  const initArr = (key) => (searchParams.get(key) ? searchParams.get(key).split(",").filter(Boolean) : []);
  const [brands, setBrands] = useState(initArr("brand"));
  const [colors, setColors] = useState(initArr("color"));
  const [sizes, setSizes] = useState(initArr("size"));
  const [ages, setAges] = useState(initArr("age"));
  const [genders, setGenders] = useState(initArr("gender"));
  const [materials, setMaterials] = useState(initArr("mat"));

  const [availability, setAvailability] = useState(searchParams.get("avail") || ""); // "in" | "out" | ""
  const [onSale, setOnSale] = useState(searchParams.get("sale") === "1");
  const [newArrivals, setNewArrivals] = useState(searchParams.get("new") === "1");
  const [freeShip, setFreeShip] = useState(searchParams.get("ship") === "1");
  const [bestsellers, setBestsellers] = useState(searchParams.get("best") === "1");
  const [minDiscount, setMinDiscount] = useState(Number(searchParams.get("disc") || 0));

  const { categories } = useCategories();
  const { products: allProds, loading: loadingProds } = useProducts();
  const ratingsSummary = useRatingsSummary();
  const { isWishlisted, toggle: toggleWish } = useWishlist() || { isWishlisted: () => false, toggle: () => {} };
  const { addToCart } = useContext(CartContext) || { addToCart: () => {} };
  const toast = useToast();
  const [showTop, setShowTop] = useState(false);
  const [quickViewProd, setQuickViewProd] = useState(null);
  const [viewMode, setViewMode] = useState(searchParams.get("view") || "grid"); // "grid" | "list"
  const [gridCols, setGridCols] = useState(Number(searchParams.get("cols") || 0)); // 0=auto, 2, 3, 4
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => { setRecentlyViewed(getRecentlyViewed()); }, [quickViewProd]);

  const openQuickView = (p) => {
    setQuickViewProd(p);
    addRecentlyViewed(p);
  };

  const trackView = (p) => addRecentlyViewed(p);

  const catObj = useMemo(() => {
    return categories
      .map(c => typeof c === "string" ? { name: c } : c)
      .find(c => slugify(c?.name) === categoryId || slugify(c?.nameEn) === categoryId);
  }, [categories, categoryId]);

  const categoryName = useMemo(() => {
    return catObj ? catName(catObj) : categoryId;
  }, [catObj, categoryId, lang]);

  const products = useMemo(() => {
    const slugs = new Set([
      slugify(catObj?.name),
      slugify(catObj?.nameEn),
      categoryId,
    ].filter(Boolean));
    return allProds.filter(p => slugs.has(slugify(p?.category)));
  }, [allProds, categoryId, catObj]);

  const productStars = (pid) => Number(ratingsSummary[String(pid)]?.avg || 0);
  const productRatingCount = (pid) => Number(ratingsSummary[String(pid)]?.count || 0);

  // ─── استخراج القيم المتاحة من منتجات القسم
  const facets = useMemo(() => {
    const brandMap = new Map();
    const colorMap = new Map(); // label → { hex, count }
    const sizeMap = new Map();
    const ageMap = new Map();
    const genderMap = new Map();
    const materialMap = new Map();
    let minP = Infinity, maxP = -Infinity;
    let inStockN = 0, outStockN = 0, onSaleN = 0, newN = 0, shipN = 0, bestN = 0;
    const now = Date.now();

    products.forEach((p) => {
      const price = Number(p.price) || 0;
      if (price < minP) minP = price;
      if (price > maxP) maxP = price;

      const stock = Number(p.stock);
      if (Number.isFinite(stock) && stock <= 0) outStockN++; else inStockN++;

      if (Number(p.oldPrice) > price) onSaleN++;
      if (price >= FREE_SHIP_THRESHOLD) shipN++;
      if (p.featured) bestN++;

      const created = p.createdAt ? new Date(p.createdAt).getTime() : 0;
      if (created && now - created <= NEW_DAYS * 86400000) newN++;

      const bn = (p.brand || "").trim();
      if (bn) brandMap.set(bn, (brandMap.get(bn) || 0) + 1);

      const gn = (p.targetGender || "").trim();
      if (gn) genderMap.set(gn, (genderMap.get(gn) || 0) + 1);

      const mt = (p.material || "").trim();
      if (mt) materialMap.set(mt, (materialMap.get(mt) || 0) + 1);

      const ra = (p.recommendedAge || "").trim();
      if (ra) ageMap.set(ra, (ageMap.get(ra) || 0) + 1);

      const seenColors = new Set(), seenSizes = new Set(), seenAges = new Set();
      (p.variants || []).forEach((g) => {
        (g.options || []).forEach((o) => {
          if (g.type === "color" && o.label && !seenColors.has(o.label)) {
            seenColors.add(o.label);
            const cur = colorMap.get(o.label) || { hex: o.hex || "#94A3B8", count: 0 };
            cur.count++;
            if (o.hex) cur.hex = o.hex;
            colorMap.set(o.label, cur);
          }
          if ((g.type === "size" || g.type === "number") && o.label && !seenSizes.has(o.label)) {
            seenSizes.add(o.label);
            sizeMap.set(o.label, (sizeMap.get(o.label) || 0) + 1);
          }
          if (g.type === "age" && o.label && !seenAges.has(o.label)) {
            seenAges.add(o.label);
            ageMap.set(o.label, (ageMap.get(o.label) || 0) + 1);
          }
        });
      });
    });

    return {
      brands: [...brandMap.entries()].map(([label, count]) => ({ label, count })).sort((a,b) => b.count - a.count),
      colors: [...colorMap.entries()].map(([label, v]) => ({ label, hex: v.hex, count: v.count })),
      sizes: [...sizeMap.entries()].map(([label, count]) => ({ label, count })),
      ages: [...ageMap.entries()].map(([label, count]) => ({ label, count })),
      genders: [...genderMap.entries()].map(([label, count]) => ({ label, count })),
      materials: [...materialMap.entries()].map(([label, count]) => ({ label, count })),
      priceRange: products.length ? { min: Math.floor(minP), max: Math.ceil(maxP) } : { min: 0, max: 1000 },
      counts: { inStock: inStockN, outStock: outStockN, onSale: onSaleN, new: newN, ship: shipN, best: bestN },
    };
  }, [products]);

  // ─── تطبيق الفلاتر
  const filtered = useMemo(() => {
    let arr = [...products];
    const now = Date.now();

    if (search) arr = arr.filter(p => (p.name || p.nameEn || "").toLowerCase().includes(search.toLowerCase()));

    if (availability === "in") arr = arr.filter(p => { const s = Number(p.stock); return !Number.isFinite(s) || s > 0; });
    if (availability === "out") arr = arr.filter(p => { const s = Number(p.stock); return Number.isFinite(s) && s <= 0; });

    if (onSale) arr = arr.filter(p => Number(p.oldPrice) > Number(p.price));
    if (newArrivals) arr = arr.filter(p => {
      const c = p.createdAt ? new Date(p.createdAt).getTime() : 0;
      return c && now - c <= NEW_DAYS * 86400000;
    });
    if (freeShip) arr = arr.filter(p => Number(p.price) >= FREE_SHIP_THRESHOLD);
    if (bestsellers) arr = arr.filter(p => p.featured);

    if (minDiscount > 0) arr = arr.filter(p => {
      const old = Number(p.oldPrice), price = Number(p.price);
      if (!(old > price)) return false;
      const pct = Math.round(100 - (price / old) * 100);
      return pct >= minDiscount;
    });

    if (brands.length) arr = arr.filter(p => brands.includes((p.brand || "").trim()));
    if (genders.length) arr = arr.filter(p => genders.includes((p.targetGender || "").trim()));
    if (materials.length) arr = arr.filter(p => materials.includes((p.material || "").trim()));

    const minN = priceMin === "" ? -Infinity : Number(priceMin);
    const maxN = priceMax === "" ? Infinity : Number(priceMax);
    if (Number.isFinite(minN) || Number.isFinite(maxN)) {
      arr = arr.filter((p) => {
        const pr = Number(p.price) || 0;
        return pr >= minN && pr <= maxN;
      });
    }

    if (colors.length) arr = arr.filter(p =>
      (p.variants || []).some(g => g.type === "color" && (g.options || []).some(o => colors.includes(o.label)))
    );
    if (sizes.length) arr = arr.filter(p =>
      (p.variants || []).some(g => (g.type === "size" || g.type === "number") && (g.options || []).some(o => sizes.includes(o.label)))
    );
    if (ages.length) arr = arr.filter(p => {
      if (ages.includes((p.recommendedAge || "").trim())) return true;
      return (p.variants || []).some(g => g.type === "age" && (g.options || []).some(o => ages.includes(o.label)));
    });

    if (minStars > 0) arr = arr.filter(p => productStars(p.id) >= minStars);

    // الترتيب
    if (sort === "price-asc")  arr.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price-desc") arr.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "rating")     arr.sort((a, b) => productStars(b.id) - productStars(a.id));
    if (sort === "bestselling") arr.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || productStars(b.id) - productStars(a.id));
    if (sort === "discount") arr.sort((a, b) => {
      const da = Number(a.oldPrice) > Number(a.price) ? (1 - Number(a.price) / Number(a.oldPrice)) : 0;
      const db = Number(b.oldPrice) > Number(b.price) ? (1 - Number(b.price) / Number(b.oldPrice)) : 0;
      return db - da;
    });
    if (sort === "default" || sort === "newest") {
      arr.sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()));
    }

    return arr;
  }, [products, search, sort, brands, genders, materials, priceMin, priceMax, colors, sizes, ages, minStars, availability, onSale, newArrivals, freeShip, bestsellers, minDiscount, ratingsSummary]);

  // ─── حفظ الفلاتر في URL
  useEffect(() => {
    const p = {};
    if (search) p.q = search;
    if (sort && sort !== "default") p.sort = sort;
    if (priceMin) p.pmin = priceMin;
    if (priceMax) p.pmax = priceMax;
    if (minStars) p.stars = minStars;
    if (brands.length) p.brand = brands.join(",");
    if (colors.length) p.color = colors.join(",");
    if (sizes.length) p.size = sizes.join(",");
    if (ages.length) p.age = ages.join(",");
    if (genders.length) p.gender = genders.join(",");
    if (materials.length) p.mat = materials.join(",");
    if (availability) p.avail = availability;
    if (onSale) p.sale = "1";
    if (newArrivals) p.new = "1";
    if (freeShip) p.ship = "1";
    if (bestsellers) p.best = "1";
    if (minDiscount) p.disc = minDiscount;
    if (viewMode !== "grid") p.view = viewMode;
    if (gridCols) p.cols = gridCols;
    setSearchParams(p, { replace: true });
  }, [search, sort, priceMin, priceMax, minStars, brands, colors, sizes, ages, genders, materials, availability, onSale, newArrivals, freeShip, bestsellers, minDiscount, viewMode, gridCols]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // إعادة تعيين المعروض عند تغيير الفلاتر
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, sort, brands, colors, sizes, ages, genders, materials, priceMin, priceMax, minStars, availability, onSale, newArrivals, freeShip, bestsellers, minDiscount]);

  const handleQuickAdd = (e, p) => {
    e.preventDefault();
    e.stopPropagation();
    const stock = Number(p.stock);
    if (Number.isFinite(stock) && stock <= 0) {
      toast?.(lang === "ar" ? "نفد المخزون" : "Out of stock", "error");
      return;
    }
    if ((p.variants || []).length > 0) {
      navigate(`/product/${p.id}`);
      return;
    }
    addToCart(p, 1);
    toast?.(lang === "ar" ? "✅ أُضيف للسلة" : "✅ Added to cart", "success");
  };

  const handleWishToggle = (e, p) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWish(p);
    const nowWish = !isWishlisted(p.id);
    toast?.(
      nowWish ? (lang === "ar" ? "❤️ أُضيف للمفضلة" : "❤️ Added to wishlist") : (lang === "ar" ? "أُزيل من المفضلة" : "Removed"),
      nowWish ? "success" : "info"
    );
  };

  const countdown = (endIso) => {
    if (!endIso) return null;
    const left = new Date(endIso) - nowMs;
    if (left <= 0) return null;
    const h = Math.floor(left / 3600000), m = Math.floor(left / 60000) % 60, s = Math.floor(left / 1000) % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // ─── عدّاد الفلاتر المفعّلة + قائمة chips
  const activeChips = useMemo(() => {
    const chips = [];
    if (availability === "in") chips.push({ key: "avail", label: t("f_in_stock"), clear: () => setAvailability("") });
    if (availability === "out") chips.push({ key: "avail", label: t("f_out_of_stock"), clear: () => setAvailability("") });
    if (onSale) chips.push({ key: "sale", label: t("f_on_sale"), clear: () => setOnSale(false) });
    if (newArrivals) chips.push({ key: "new", label: t("f_new_arrivals"), clear: () => setNewArrivals(false) });
    if (freeShip) chips.push({ key: "ship", label: t("f_free_shipping"), clear: () => setFreeShip(false) });
    if (bestsellers) chips.push({ key: "best", label: t("f_bestsellers"), clear: () => setBestsellers(false) });
    if (minDiscount) chips.push({ key: "disc", label: `${minDiscount}%+`, clear: () => setMinDiscount(0) });
    if (priceMin || priceMax) chips.push({ key: "price", label: `${priceMin || 0} – ${priceMax || "∞"}`, clear: () => { setPriceMin(""); setPriceMax(""); } });
    if (minStars) chips.push({ key: "stars", label: `★ ${minStars}+`, clear: () => setMinStars(0) });
    brands.forEach(b => chips.push({ key: `b-${b}`, label: b, clear: () => setBrands(arr => arr.filter(x => x !== b)) }));
    colors.forEach(c => chips.push({ key: `c-${c}`, label: c, clear: () => setColors(arr => arr.filter(x => x !== c)) }));
    sizes.forEach(s => chips.push({ key: `s-${s}`, label: s, clear: () => setSizes(arr => arr.filter(x => x !== s)) }));
    ages.forEach(a => chips.push({ key: `a-${a}`, label: a, clear: () => setAges(arr => arr.filter(x => x !== a)) }));
    genders.forEach(g => chips.push({ key: `g-${g}`, label: g, clear: () => setGenders(arr => arr.filter(x => x !== g)) }));
    materials.forEach(m => chips.push({ key: `m-${m}`, label: m, clear: () => setMaterials(arr => arr.filter(x => x !== m)) }));
    return chips;
  }, [availability, onSale, newArrivals, freeShip, bestsellers, minDiscount, priceMin, priceMax, minStars, brands, colors, sizes, ages, genders, materials, lang]);

  const clearAll = () => {
    setSearch(""); setPriceMin(""); setPriceMax("");
    setBrands([]); setColors([]); setSizes([]); setAges([]); setGenders([]); setMaterials([]);
    setAvailability(""); setOnSale(false); setNewArrivals(false); setFreeShip(false); setBestsellers(false);
    setMinDiscount(0); setMinStars(0);
  };

  const toggleIn = (arr, setter, value) => {
    if (arr.includes(value)) setter(arr.filter(x => x !== value));
    else setter([...arr, value]);
  };

  /* ═══════════ الشريط الجانبي (نفس المحتوى للديسكتوب والدراوَر) ═══════════ */
  const SidebarContent = (
    <>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingBottom: 10, borderBottom: "2px solid #F1F5F9",
        position: "sticky", top: -16, background: "#fff", zIndex: 5, marginInline: -18, marginTop: -16,
        padding: "16px 18px 10px", borderTopLeftRadius: 16, borderTopRightRadius: 16,
      }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#0F172A" }}>
          {t("f_filters")}
          {activeChips.length > 0 && (
            <span style={{ marginInlineStart: 8, background: "#6366F1", color: "#fff", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 800 }}>
              {activeChips.length}
            </span>
          )}
        </h3>
        {activeChips.length > 0 && (
          <button onClick={clearAll} style={{
            background: "#FEF2F2", border: "1px solid #FECACA", color: "#EF4444", fontSize: 11, fontWeight: 800,
            cursor: "pointer", fontFamily: "'Tajawal',sans-serif", borderRadius: 999, padding: "4px 10px",
          }}>
            🧹 {t("f_clear_all")}
          </button>
        )}
      </div>

      {/* العروض */}
      <Section title={t("f_offers")} icon="🔥">
        <Checkbox label={t("f_on_sale")} count={facets.counts.onSale} checked={onSale} onChange={setOnSale} />
        <Checkbox label={t("f_new_arrivals")} count={facets.counts.new} checked={newArrivals} onChange={setNewArrivals} />
        <Checkbox label={t("f_free_shipping")} count={facets.counts.ship} checked={freeShip} onChange={setFreeShip} />
        <Checkbox label={t("f_bestsellers")} count={facets.counts.best} checked={bestsellers} onChange={setBestsellers} />
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {[20, 50].map(v => (
            <button key={v} onClick={() => setMinDiscount(minDiscount === v ? 0 : v)} style={{
              background: minDiscount === v ? "#FEE2E2" : "#F1F5F9", color: minDiscount === v ? "#B91C1C" : "#334155",
              border: `1.5px solid ${minDiscount === v ? "#EF4444" : "transparent"}`, borderRadius: 999,
              padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Tajawal',sans-serif",
            }}>
              {v}%+
            </button>
          ))}
        </div>
      </Section>

      {/* التوفر */}
      <Section title={t("f_availability")} icon="📦">
        <Checkbox label={t("f_in_stock")} count={facets.counts.inStock} checked={availability === "in"} onChange={v => setAvailability(v ? "in" : "")} />
        <Checkbox label={t("f_out_of_stock")} count={facets.counts.outStock} checked={availability === "out"} onChange={v => setAvailability(v ? "out" : "")} />
      </Section>

      {/* السعر */}
      <Section title={t("f_price")} icon="💰">
        <DualRangeSlider
          min={facets.priceRange.min}
          max={facets.priceRange.max}
          valueMin={priceMin === "" ? facets.priceRange.min : Number(priceMin)}
          valueMax={priceMax === "" ? facets.priceRange.max : Number(priceMax)}
          onChange={(lo, hi) => {
            setPriceMin(lo === facets.priceRange.min ? "" : String(lo));
            setPriceMax(hi === facets.priceRange.max ? "" : String(hi));
          }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, marginBottom: 8 }}>
          <input type="number" placeholder={`${t("f_price_from")}`} value={priceMin} onChange={e => setPriceMin(e.target.value)}
            style={{ flex: 1, padding: "6px 8px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'Tajawal',sans-serif", outline: "none", background: "#F8FAFC", minWidth: 0, boxSizing: "border-box" }} />
          <span style={{ color: "#94A3B8" }}>—</span>
          <input type="number" placeholder={`${t("f_price_to")}`} value={priceMax} onChange={e => setPriceMax(e.target.value)}
            style={{ flex: 1, padding: "6px 8px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "'Tajawal',sans-serif", outline: "none", background: "#F8FAFC", minWidth: 0, boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[{ l: "< 50", min: "", max: 50 }, { l: "50-150", min: 50, max: 150 }, { l: "150-500", min: 150, max: 500 }, { l: "> 500", min: 500, max: "" }].map((x) => (
            <button key={x.l} onClick={() => { setPriceMin(String(x.min)); setPriceMax(String(x.max)); }}
              style={{ background: "#F1F5F9", color: "#334155", border: "none", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
              {x.l}
            </button>
          ))}
        </div>
      </Section>

      {/* التقييم */}
      <Section title={t("f_rating")} icon="⭐">
        {[4.5, 4, 3].map(v => (
          <Checkbox key={v}
            label={`${v}+ ${t("f_stars_plus")}`}
            checked={minStars === v}
            onChange={(on) => setMinStars(on ? v : 0)}
          />
        ))}
      </Section>

      {/* الماركات */}
      {facets.brands.length > 0 && (
        <Section title={t("f_brand")} icon="🏷️">
          <ShowMoreList
            items={facets.brands}
            lang={lang}
            renderItem={(b) => (
              <Checkbox
                key={b.label}
                label={b.label}
                count={b.count}
                checked={brands.includes(b.label)}
                onChange={() => toggleIn(brands, setBrands, b.label)}
              />
            )}
          />
        </Section>
      )}

      {/* اللون */}
      {facets.colors.length > 0 && (
        <Section title={t("f_color")} icon="🎨">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {facets.colors.map((c) => {
              const active = colors.includes(c.label);
              return (
                <button key={c.label}
                  title={`${c.label} (${c.count})`}
                  onClick={() => toggleIn(colors, setColors, c.label)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "3px 9px 3px 3px",
                    background: active ? "#EEF2FF" : "#F8FAFC",
                    border: `1.5px solid ${active ? "#6366F1" : "#E2E8F0"}`, borderRadius: 999,
                    cursor: "pointer", fontFamily: "'Tajawal',sans-serif", fontSize: 11, fontWeight: 700, color: "#334155",
                  }}>
                  <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: "50%", background: c.hex, border: "1.5px solid #fff", boxShadow: "0 0 0 1px #E2E8F0" }} />
                  {c.label}
                  <span style={{ color: "#94A3B8", fontSize: 10 }}>({c.count})</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* المقاس */}
      {facets.sizes.length > 0 && (
        <Section title={t("f_size")} icon="📏">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {facets.sizes.map((s) => {
              const active = sizes.includes(s.label);
              return (
                <button key={s.label} onClick={() => toggleIn(sizes, setSizes, s.label)}
                  style={{
                    minWidth: 40, padding: "6px 10px", background: active ? "#6366F1" : "#fff",
                    color: active ? "#fff" : "#334155", border: `1.5px solid ${active ? "#6366F1" : "#E2E8F0"}`,
                    borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "'Tajawal',sans-serif",
                  }}>
                  {s.label} <span style={{ fontSize: 10, opacity: .7 }}>({s.count})</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* العمر */}
      {facets.ages.length > 0 && (
        <Section title={t("f_age")} icon="🎂">
          <ShowMoreList
            items={facets.ages}
            lang={lang}
            renderItem={(a) => (
              <Checkbox
                key={a.label}
                label={a.label}
                count={a.count}
                checked={ages.includes(a.label)}
                onChange={() => toggleIn(ages, setAges, a.label)}
              />
            )}
          />
        </Section>
      )}

      {/* الجنس */}
      {facets.genders.length > 0 && (
        <Section title={t("f_gender")} icon="👶">
          {facets.genders.map((g) => (
            <Checkbox
              key={g.label}
              label={g.label}
              count={g.count}
              checked={genders.includes(g.label)}
              onChange={() => toggleIn(genders, setGenders, g.label)}
            />
          ))}
        </Section>
      )}

      {/* المادة */}
      {facets.materials.length > 0 && (
        <Section title={t("f_material")} icon="🧵">
          <ShowMoreList
            items={facets.materials}
            lang={lang}
            renderItem={(m) => (
              <Checkbox
                key={m.label}
                label={m.label}
                count={m.count}
                checked={materials.includes(m.label)}
                onChange={() => toggleIn(materials, setMaterials, m.label)}
              />
            )}
          />
        </Section>
      )}
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Tajawal',sans-serif", direction: lang === "ar" ? "rtl" : "ltr" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes pulse-scale { 0%{transform:scale(1)} 50%{transform:scale(1.08)} 100%{transform:scale(1)} }
        .prod-card { transition: transform .22s ease, box-shadow .22s ease; }
        .prod-card:hover { transform: translateY(-6px); box-shadow: 0 20px 44px rgba(0,0,0,.12)!important; }
        .prod-card:hover .prod-img-main { transform: scale(1.06); }
        .prod-card:hover .prod-img-hover { opacity: 1; }
        .skeleton { background: linear-gradient(90deg,#F1F5F9 0%,#E2E8F0 50%,#F1F5F9 100%); background-size: 200% 100%; animation: shim 1.3s ease infinite; }
        @keyframes shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .scroll-top-btn:hover { transform: translateY(-3px) scale(1.05); }

        /* عرض القائمة */
        .cat-grid.list-mode .prod-card {
          display: grid;
          grid-template-columns: 180px 1fr;
          align-items: stretch;
        }
        .cat-grid.list-mode .prod-card .prod-img-wrap {
          height: 100% !important;
          min-height: 160px;
        }
        .cat-grid.list-mode .prod-card > div:last-child {
          padding: 16px 20px !important;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        @media(max-width:600px){
          .cat-grid.list-mode .prod-card { grid-template-columns: 120px 1fr; }
        }
        .cat-body { display:grid; grid-template-columns: 260px 1fr; gap: 24px; align-items: start; }
        .cat-sidebar { position: sticky; top: 20px; max-height: calc(100vh - 40px); overflow-y: auto; }
        .cat-filter-btn { display: none; }
        .cat-drawer { display: none; }
        @media(max-width:900px){
          .cat-body { grid-template-columns: 1fr; }
          .cat-sidebar { display: none; }
          .cat-filter-btn { display: inline-flex !important; }
          .cat-drawer.open { display: block; }
        }
        @media(max-width:768px){
          .cat-grid { grid-template-columns: repeat(2,1fr) !important; gap: 14px !important; }
          .cat-header { padding: 24px 16px !important; }
        }
        @media(max-width:480px){
          .cat-grid { grid-template-columns: repeat(2,1fr) !important; gap: 10px !important; }
        }
        .cat-sidebar::-webkit-scrollbar { width: 6px; }
        .cat-sidebar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 3px; }
      `}</style>

      <MiniNav title={categoryName} backTo="/home" />

      {/* فتات الخبز Breadcrumbs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #F1F5F9", padding: "10px 20px" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", fontSize: 12, color: "#64748B", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Link to="/home" style={{ color: "#6366F1", textDecoration: "none", fontWeight: 700 }}>
            {lang === "ar" ? "🏠 الرئيسية" : "🏠 Home"}
          </Link>
          <span style={{ color: "#CBD5E1" }}>{lang === "ar" ? "/" : "/"}</span>
          <Link to="/home" style={{ color: "#6366F1", textDecoration: "none", fontWeight: 700 }}>
            {lang === "ar" ? "الأقسام" : "Categories"}
          </Link>
          <span style={{ color: "#CBD5E1" }}>/</span>
          <span style={{ color: "#0F172A", fontWeight: 800 }}>{categoryName}</span>
        </div>
      </div>

      {/* هيدر القسم */}
      <div className="cat-header" style={{ background: "linear-gradient(135deg,#0F172A,#1E1B4B)", padding: "36px 24px", color: "#fff" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ color: "#818CF8", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{lang === "ar" ? "تسوّق من قسم" : "Shop from"}</p>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: 0 }}>{categoryName}</h1>
          </div>
          <div style={{ background: "rgba(255,255,255,.1)", borderRadius: 12, padding: "10px 20px", border: "1px solid rgba(255,255,255,.15)", fontSize: 14, color: "#C7D2FE", fontWeight: 700 }}>
            {products.length} {t("cat_products")}
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1600, margin: "0 auto", padding: "24px 20px" }}>

        {/* شريط الأدوات */}
        {products.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: shadow.sm, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
              <input
                placeholder={t("cat_search_ph")}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", padding: "9px 36px 9px 12px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 13, outline: "none", background: "#F8FAFC", boxSizing: "border-box", fontFamily: "'Tajawal',sans-serif" }}
              />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 14, pointerEvents: "none" }}>🔍</span>
            </div>

            <button onClick={() => setDrawerOpen(true)} className="cat-filter-btn"
              style={{ padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${activeChips.length ? "#6366F1" : "#E2E8F0"}`, background: activeChips.length ? "#EEF2FF" : "#F8FAFC", color: activeChips.length ? "#6366F1" : "#334155", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", alignItems: "center", gap: 6 }}>
              🎛️ {t("f_filters")} {activeChips.length > 0 && <span style={{ background: "#6366F1", color: "#fff", borderRadius: 999, padding: "1px 7px", fontSize: 11 }}>{activeChips.length}</span>}
            </button>

            <div style={{ color: "#64748B", fontSize: 13, fontWeight: 700 }}>
              <strong style={{ color: "#0F172A" }}>{filtered.length}</strong> {t("f_results_count")}
            </div>

            <select value={sort} onChange={e => setSort(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 13, background: "#F8FAFC", color: "#334155", fontWeight: 700, fontFamily: "'Tajawal',sans-serif", cursor: "pointer", outline: "none" }}>
              <option value="default">{t("cat_sort_new")}</option>
              <option value="bestselling">{t("cat_sort_bestselling")}</option>
              <option value="price-asc">{t("cat_sort_price_asc")}</option>
              <option value="price-desc">{t("cat_sort_price_desc")}</option>
              <option value="rating">⭐ {lang === "ar" ? "الأعلى تقييماً" : "Top Rated"}</option>
              <option value="discount">{t("cat_sort_discount")}</option>
            </select>

            {/* تبديل العرض */}
            <div style={{ display: "inline-flex", background: "#F1F5F9", borderRadius: 10, padding: 3, gap: 2 }}>
              <button onClick={() => setViewMode("grid")} title={lang === "ar" ? "شبكة" : "Grid"}
                style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: viewMode === "grid" ? "#fff" : "transparent", color: viewMode === "grid" ? "#6366F1" : "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 800, boxShadow: viewMode === "grid" ? shadow.sm : "none" }}>
                ▦
              </button>
              <button onClick={() => setViewMode("list")} title={lang === "ar" ? "قائمة" : "List"}
                style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: viewMode === "list" ? "#fff" : "transparent", color: viewMode === "list" ? "#6366F1" : "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 800, boxShadow: viewMode === "list" ? shadow.sm : "none" }}>
                ☰
              </button>
            </div>

            {/* كثافة الشبكة */}
            {viewMode === "grid" && (
              <div className="cat-density" style={{ display: "inline-flex", background: "#F1F5F9", borderRadius: 10, padding: 3, gap: 2 }}>
                {[{ n: 2, l: "2" }, { n: 3, l: "3" }, { n: 4, l: "4" }].map(x => (
                  <button key={x.n} onClick={() => setGridCols(gridCols === x.n ? 0 : x.n)} title={`${x.n} cols`}
                    style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: gridCols === x.n ? "#fff" : "transparent", color: gridCols === x.n ? "#6366F1" : "#64748B", cursor: "pointer", fontSize: 12, fontWeight: 800, boxShadow: gridCols === x.n ? shadow.sm : "none" }}>
                    {x.l}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* رقائق الفلاتر المفعّلة */}
        {activeChips.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>{activeChips.length} {t("f_active")}:</span>
            {activeChips.map(c => (
              <button key={c.key} onClick={c.clear} style={{
                background: "#EEF2FF", color: "#6366F1", border: "1px solid #C7D2FE", borderRadius: 999,
                padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif",
                display: "inline-flex", alignItems: "center", gap: 5,
              }}>
                {c.label}
                <span style={{ fontSize: 13, lineHeight: 1 }}>×</span>
              </button>
            ))}
            <button onClick={clearAll} style={{
              background: "transparent", color: "#EF4444", border: "none", fontSize: 12, fontWeight: 800,
              cursor: "pointer", fontFamily: "'Tajawal',sans-serif", padding: "4px 8px",
            }}>
              🧹 {t("f_clear_all")}
            </button>
          </div>
        )}

        <div className="cat-body">
          {/* الشريط الجانبي (ديسكتوب) */}
          <aside className="cat-sidebar" style={{
            background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0",
            boxShadow: shadow.sm, padding: "16px 18px",
          }}>
            {SidebarContent}
          </aside>

          {/* المنتجات */}
          <div>
            {loadingProds ? (
              <div className="cat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
                {[1,2,3,4,5,6,7,8].map(i => <ProductSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 24, border: "2px dashed #E2E8F0" }}>
                <div style={{ fontSize: 56, marginBottom: 14 }}>📦</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>
                  {search || activeChips.length ? (lang === "ar" ? "لا توجد نتائج" : "No results") : (lang === "ar" ? "لا توجد منتجات" : "No products yet")}
                </h3>
                <p style={{ color: "#94A3B8", marginBottom: 24 }}>
                  {search || activeChips.length ? (lang === "ar" ? "جرّب تعديل الفلاتر" : "Try adjusting filters") : (lang === "ar" ? "عد لاحقاً" : "Check back later")}
                </p>
                {activeChips.length > 0 ? (
                  <button onClick={clearAll} style={{
                    background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", borderRadius: 12,
                    padding: "11px 22px", fontWeight: 800, fontFamily: "'Tajawal',sans-serif", cursor: "pointer",
                    boxShadow: "0 6px 18px rgba(99,102,241,.35)",
                  }}>
                    🧹 {t("f_clear_all")}
                  </button>
                ) : (
                  <Link to="/home" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", borderRadius: 12, padding: "11px 22px", fontWeight: 700, boxShadow: "0 6px 18px rgba(99,102,241,.35)" }}>
                    ← {lang === "ar" ? "الأقسام" : "Categories"}
                  </Link>
                )}
              </div>
            ) : (
              <>
              <div className={`cat-grid${viewMode === "list" ? " list-mode" : ""}`} style={{
                display: "grid",
                gridTemplateColumns: viewMode === "list" ? "1fr" : (gridCols > 0 ? `repeat(${gridCols}, 1fr)` : "repeat(auto-fill, minmax(220px, 1fr))"),
                gap: viewMode === "list" ? 12 : 18,
              }}>
                {filtered.slice(0, visibleCount).map((p, idx) => {
                  const price = Number(p.price), old = Number(p.oldPrice);
                  const pct = (Number.isFinite(old) && old > price) ? Math.round(100 - (price / old) * 100) : null;
                  const stock = Number.isFinite(Number(p.stock)) ? Number(p.stock) : null;
                  const timer = countdown(p.saleEnd);
                  const soldOut = stock === 0;
                  const low = stock !== null && stock > 0 && stock <= (p.lowStockThreshold || 5);
                  const isNew = (() => {
                    const c = p.createdAt ? new Date(p.createdAt).getTime() : 0;
                    return c && Date.now() - c <= NEW_DAYS * 86400000;
                  })();
                  const imgs = [p.image, ...(Array.isArray(p.images) ? p.images.filter(x => x && x !== p.image) : [])].filter(Boolean);
                  const PLACEHOLDER = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23F1F5F9' width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' font-size='80' text-anchor='middle' dy='.3em'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E";
                  const mainImg = imgs[0] || PLACEHOLDER;
                  const hoverImg = imgs[1];
                  const wished = isWishlisted(p.id);
                  const hasVariants = (p.variants || []).length > 0;

                  return (
                    <article key={p.id} className="prod-card"
                      style={{ background: "#fff", borderRadius: 20, border: "1px solid #F1F5F9", boxShadow: shadow.sm, overflow: "hidden", animation: `fadeUp .4s ${idx * 0.03}s both`, position: "relative" }}>

                      <Link to={`/product/${p.id}`} onClick={() => trackView(p)} style={{ display: "block", position: "relative" }}>
                        <div className="prod-img-wrap" style={{ position: "relative", overflow: "hidden", height: 200, background: "#F8FAFC" }}>
                          <img src={mainImg}
                            alt={prodName(p)} className="prod-img-main"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity .3s ease, transform .4s ease" }}
                            onError={e => { if (e.currentTarget.src !== PLACEHOLDER) e.currentTarget.src = PLACEHOLDER; }} />
                          {hoverImg && (
                            <img src={hoverImg} alt="" className="prod-img-hover"
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0, transition: "opacity .3s ease" }}
                              onError={e => { e.currentTarget.style.display = "none"; }} />
                          )}

                          {/* شارات متراكمة */}
                          <div style={{ position: "absolute", top: 8, insetInlineEnd: 8, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                            {pct && <span style={{ background: "#EF4444", color: "#fff", borderRadius: 999, padding: "3px 9px", fontWeight: 800, fontSize: 11 }}>-{pct}%</span>}
                            {isNew && <span style={{ background: "#10B981", color: "#fff", borderRadius: 999, padding: "3px 9px", fontWeight: 800, fontSize: 11 }}>✨ {t("f_new_arrivals")}</span>}
                            {low && <span style={{ background: "#F59E0B", color: "#fff", borderRadius: 999, padding: "3px 9px", fontWeight: 800, fontSize: 11 }}>🔥 {lang === "ar" ? `بقي ${stock}` : `${stock} left`}</span>}
                          </div>
                          <div style={{ position: "absolute", top: 8, insetInlineStart: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                            {p.featured && <span style={{ background: "#F59E0B", color: "#fff", borderRadius: 999, padding: "3px 9px", fontWeight: 800, fontSize: 11 }}>⭐ {lang === "ar" ? "مميّز" : "Featured"}</span>}
                          </div>

                          {/* زر القلب */}
                          <button onClick={e => handleWishToggle(e, p)} title={lang === "ar" ? "المفضلة" : "Wishlist"}
                            style={{
                              position: "absolute", bottom: 8, insetInlineEnd: 8, width: 34, height: 34, borderRadius: "50%",
                              background: wished ? "#EF4444" : "rgba(255,255,255,.92)", border: "none", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                              boxShadow: "0 4px 12px rgba(0,0,0,.15)", transition: "transform .15s, background .15s",
                            }}
                            onMouseDown={e => e.currentTarget.style.transform = "scale(.85)"}
                            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                          >
                            <span style={{ filter: wished ? "none" : "grayscale(.3)" }}>{wished ? "❤️" : "🤍"}</span>
                          </button>

                          {soldOut && (
                            <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ background: "#fff", color: "#0F172A", borderRadius: 10, padding: "7px 14px", fontWeight: 800, fontSize: 13 }}>{t("prod_sold_out")}</span>
                            </div>
                          )}
                        </div>
                      </Link>

                      <div style={{ padding: "14px" }}>
                        {p.brand && <div style={{ fontSize: 10, fontWeight: 700, color: "#16A34A", marginBottom: 4, textTransform: "uppercase" }}>{p.brand}</div>}
                        <Link to={`/product/${p.id}`} style={{ display: "block", fontWeight: 800, fontSize: 14, color: "#0F172A", marginBottom: 6, lineHeight: 1.4, textDecoration: "none", minHeight: 38 }}>{prodName(p)}</Link>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 900, fontSize: 16, color: "#6366F1" }}>{fmtPrice(price)}</span>
                          {pct && <span style={{ textDecoration: "line-through", fontSize: 12, color: "#94A3B8" }}>{fmtPrice(old)}</span>}
                        </div>
                        {productRatingCount(p.id) > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, fontSize: 11, color: "#F59E0B", fontWeight: 700 }}>
                            <span>★ {productStars(p.id).toFixed(1)}</span>
                            <span style={{ color: "#94A3B8", fontWeight: 600 }}>({productRatingCount(p.id)})</span>
                          </div>
                        )}

                        {timer && <div style={{ fontSize: 11, color: "#EC4899", fontWeight: 700, marginBottom: 6 }}>⏰ {timer}</div>}

                        {/* أزرار إجراء سريع */}
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={e => handleQuickAdd(e, p)}
                            disabled={soldOut}
                            title={hasVariants ? (lang === "ar" ? "اختر المقاس" : "Choose options") : (lang === "ar" ? "أضف للسلة" : "Add to cart")}
                            style={{
                              flex: 1, background: soldOut ? "#F1F5F9" : "linear-gradient(135deg,#6366F1,#8B5CF6)",
                              color: soldOut ? "#94A3B8" : "#fff", border: "none", borderRadius: 10, padding: "9px",
                              fontWeight: 800, fontSize: 12, cursor: soldOut ? "not-allowed" : "pointer",
                              fontFamily: "'Tajawal',sans-serif",
                              boxShadow: soldOut ? "none" : "0 4px 14px rgba(99,102,241,.35)",
                            }}>
                            {soldOut ? t("prod_unavailable") : (hasVariants ? `🎯 ${lang === "ar" ? "اختر" : "Options"}` : `🛒 ${lang === "ar" ? "أضف للسلة" : "Add"}`)}
                          </button>
                          <button onClick={e => { e.preventDefault(); e.stopPropagation(); openQuickView(p); }}
                            title={lang === "ar" ? "نظرة سريعة" : "Quick View"}
                            style={{
                              background: "#F1F5F9", color: "#334155", border: "none", borderRadius: 10,
                              padding: "9px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer",
                              display: "inline-flex", alignItems: "center",
                            }}>
                            👁️
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* تحميل المزيد */}
              {filtered.length > visibleCount && (
                <div style={{ textAlign: "center", marginTop: 24 }}>
                  <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                    style={{
                      padding: "12px 28px", borderRadius: 12, border: "1.5px solid #6366F1",
                      background: "#fff", color: "#6366F1", fontWeight: 800, fontSize: 14,
                      cursor: "pointer", fontFamily: "'Tajawal',sans-serif",
                      boxShadow: "0 6px 18px rgba(99,102,241,.15)",
                    }}>
                    ↓ {lang === "ar" ? `عرض المزيد (${filtered.length - visibleCount})` : `Load More (${filtered.length - visibleCount})`}
                  </button>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 8, fontWeight: 700 }}>
                    {lang === "ar" ? `${Math.min(visibleCount, filtered.length)} من ${filtered.length}` : `${Math.min(visibleCount, filtered.length)} of ${filtered.length}`}
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        </div>

        {/* شوهد مؤخراً */}
        {recentlyViewed.length > 0 && (
          <section style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#0F172A" }}>
                👁️ {lang === "ar" ? "شوهد مؤخراً" : "Recently Viewed"}
              </h3>
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>
                {recentlyViewed.length} {lang === "ar" ? "منتج" : "items"}
              </span>
            </div>
            <div style={{
              display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8,
              scrollbarWidth: "thin",
            }}>
              {recentlyViewed.map((p) => {
                const price = Number(p.price), old = Number(p.oldPrice);
                const pct = (Number.isFinite(old) && old > price) ? Math.round(100 - (price / old) * 100) : null;
                return (
                  <Link key={p.id} to={`/product/${p.id}`}
                    style={{
                      flexShrink: 0, width: 160, background: "#fff", borderRadius: 14,
                      border: "1px solid #F1F5F9", overflow: "hidden", textDecoration: "none",
                      boxShadow: shadow.sm, transition: "transform .2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    <div style={{ height: 120, overflow: "hidden", background: "#F8FAFC" }}>
                      <img src={p.image || "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23F1F5F9' width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' font-size='60' text-anchor='middle' dy='.3em'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E"} alt={prodName(p)}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { e.currentTarget.onerror = null; e.currentTarget.style.display = "none"; }} />
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A", marginBottom: 4, lineHeight: 1.3, minHeight: 32, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {prodName(p)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 900, fontSize: 13, color: "#6366F1" }}>{fmtPrice(price)}</span>
                        {pct && <span style={{ textDecoration: "line-through", fontSize: 10, color: "#94A3B8" }}>{fmtPrice(old)}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* درج الجوال */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 998,
          }} />
          <div style={{
            position: "fixed", top: 0, insetInlineEnd: 0, bottom: 0, width: "min(340px, 90vw)",
            background: "#fff", zIndex: 999, animation: "slideIn .25s ease", overflowY: "auto",
            boxShadow: "-12px 0 32px rgba(0,0,0,.18)", padding: "16px 18px",
            direction: lang === "ar" ? "rtl" : "ltr",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>
                {filtered.length} {t("f_results_count")}
              </span>
              <button onClick={() => setDrawerOpen(false)} style={{
                background: "#F1F5F9", border: "none", borderRadius: 999, width: 32, height: 32,
                fontSize: 18, cursor: "pointer", color: "#334155", fontWeight: 800,
              }}>
                ×
              </button>
            </div>
            {SidebarContent}
            <button onClick={() => setDrawerOpen(false)} style={{
              position: "sticky", bottom: 0, marginTop: 18, width: "100%",
              background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none",
              borderRadius: 12, padding: "12px", fontWeight: 800, fontSize: 14, cursor: "pointer",
              fontFamily: "'Tajawal',sans-serif", boxShadow: "0 8px 20px rgba(99,102,241,.35)",
            }}>
              ✓ {t("f_apply")} ({filtered.length})
            </button>
          </div>
        </>
      )}

      {/* النظرة السريعة */}
      {quickViewProd && <QuickView product={quickViewProd} onClose={() => setQuickViewProd(null)} />}

      {/* زر الصعود للأعلى */}
      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="scroll-top-btn"
          aria-label={lang === "ar" ? "إلى الأعلى" : "Scroll to top"}
          style={{
            position: "fixed", bottom: 20, insetInlineEnd: 20, width: 46, height: 46, borderRadius: "50%",
            background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none",
            cursor: "pointer", fontSize: 20, fontWeight: 800, zIndex: 900,
            boxShadow: "0 10px 24px rgba(99,102,241,.45)", transition: "transform .15s",
            animation: "fadeUp .3s both",
          }}>
          ↑
        </button>
      )}
    </div>
  );
}
