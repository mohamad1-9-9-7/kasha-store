import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { safeParse, slugify, fmt, fmtPrice, catName, prodName } from "../Theme";
import { useLang } from "../context/LanguageContext";
import { T } from "../i18n";
import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";
import LangToggle from "../components/LangToggle";
import SearchAutocomplete from "../components/SearchAutocomplete";

/* ─── أيقونات السوشيال ─── */
const TikTokIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#010101" />
    <path d="M16.6 5.82a4.49 4.49 0 0 1-2.91-2.8h-2.28v11.4c0 1.22-.99 2.2-2.22 2.2a2.21 2.21 0 0 1-2.21-2.2 2.21 2.21 0 0 1 2.21-2.21c.22 0 .43.03.63.09V9.97a4.5 4.5 0 0 0-.63-.04 4.5 4.5 0 0 0-4.5 4.5 4.5 4.5 0 0 0 4.5 4.5 4.5 4.5 0 0 0 4.5-4.5V9.61a6.77 6.77 0 0 0 3.97 1.27V8.62a4.5 4.5 0 0 1-1.06-.8z" fill="white" />
    <path d="M16.6 5.82a4.49 4.49 0 0 1-2.91-2.8h-2.28v11.4c0 1.22-.99 2.2-2.22 2.2a2.21 2.21 0 0 1-2.21-2.2 2.21 2.21 0 0 1 2.21-2.21c.22 0 .43.03.63.09V9.97a4.5 4.5 0 0 0-.63-.04 4.5 4.5 0 0 0-4.5 4.5 4.5 4.5 0 0 0 4.5 4.5 4.5 4.5 0 0 0 4.5-4.5V9.61a6.77 6.77 0 0 0 3.97 1.27V8.62a4.5 4.5 0 0 1-1.06-.8z" fill="#69C9D0" opacity="0.5" />
  </svg>
);
const InstagramIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <radialGradient id="ig1" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497" />
        <stop offset="45%" stopColor="#fd5949" />
        <stop offset="60%" stopColor="#d6249f" />
        <stop offset="90%" stopColor="#285AEB" />
      </radialGradient>
    </defs>
    <rect width="24" height="24" rx="6" fill="url(#ig1)" />
    <rect x="6" y="6" width="12" height="12" rx="3.5" stroke="white" strokeWidth="1.5" fill="none" />
    <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.5" fill="none" />
    <circle cx="16.2" cy="7.8" r="0.9" fill="white" />
  </svg>
);
const FacebookIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#1877F2" />
    <path d="M13.5 21v-7.5h2.25l.375-2.625H13.5V9.75c0-.75.375-1.5 1.5-1.5h1.5V5.625S15.375 5.25 14.25 5.25c-2.25 0-3.75 1.5-3.75 3.75v1.875H8.25V13.5H10.5V21" fill="white" />
  </svg>
);
const TwitterXIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#000" />
    <path d="M17.5 5h-2.7L12 8.8 9.5 5H5l4.8 6.8L5 19h2.7l2.9-4.1L13.5 19H18l-5-7z" fill="white" />
  </svg>
);
const WhatsAppIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#25D366" />
    <path d="M12 4.5a7.5 7.5 0 0 0-6.5 11.22L4.5 19.5l3.9-1.02A7.5 7.5 0 1 0 12 4.5zm3.3 9.9c-.18-.09-1.06-.52-1.22-.58-.17-.06-.29-.09-.41.09-.12.18-.46.58-.57.7-.1.12-.21.13-.39.04a4.87 4.87 0 0 1-2.44-2.13c-.18-.32.18-.3.51-.96.06-.12.03-.22-.02-.31-.04-.09-.41-1-.56-1.37-.15-.36-.3-.31-.41-.31h-.35c-.12 0-.31.04-.47.22-.16.18-.62.6-.62 1.47s.63 1.7.72 1.82c.09.12 1.24 1.9 3 2.66.42.18.74.29 1 .37.42.13.8.11 1.1.07.34-.05 1.04-.43 1.19-.84.14-.41.14-.76.1-.84-.05-.09-.17-.13-.35-.22z" fill="white" />
  </svg>
);

const SOCIAL = [
  { name: "إنستغرام", Icon: InstagramIcon, href: "https://instagram.com/kashkha" },
  { name: "تيك توك",  Icon: TikTokIcon,    href: "https://tiktok.com/@kashkha" },
  { name: "فيسبوك",   Icon: FacebookIcon,  href: "https://facebook.com/kashkha" },
  { name: "تويتر",    Icon: TwitterXIcon,  href: "https://x.com/kashkha" },
];

const GRAD = [
  "135deg, #6366F1, #8B5CF6",
  "135deg, #EC4899, #F97316",
  "135deg, #F59E0B, #EF4444",
  "135deg, #10B981, #3B82F6",
  "135deg, #3B82F6, #6366F1",
  "135deg, #F97316, #EC4899",
];

const ICON_MAP = {
  "إلكتر": "💻", "جوال": "📱", "ساعة": "⌚", "سيار": "🚗",
  "عطر": "🌹", "ألعاب": "🧸", "ملاب": "👗", "منزل": "🏠",
  "رياض": "⚽", "هدا": "🎁", "اكسسوار": "💍",
};
const iconFor = n => {
  const s = (n || "").toLowerCase();
  for (const [k, v] of Object.entries(ICON_MAP)) if (s.includes(k)) return v;
  return "📦";
};

const FEATURES_AR = [
  { icon: "🚀", title: "شحن سريع", desc: "توصيل لكل الإمارات" },
  { icon: "💎", title: "جودة مضمونة", desc: "منتجات أصلية 100%" },
  { icon: "🔄", title: "إرجاع مجاني", desc: "خلال 7 أيام" },
  { icon: "🛡️", title: "دفع آمن", desc: "حماية كاملة لبياناتك" },
];
const FEATURES_EN = [
  { icon: "🚀", title: "Fast Shipping", desc: "Delivery across UAE" },
  { icon: "💎", title: "Quality Guaranteed", desc: "100% Original Products" },
  { icon: "🔄", title: "Free Returns", desc: "Within 7 days" },
  { icon: "🛡️", title: "Secure Payment", desc: "Full data protection" },
];

export default function HomePage() {
  const navigate  = useNavigate();
  const { lang }  = useLang();
  const t         = k => T[lang][k] ?? T.ar[k] ?? k;
  const isRtl     = lang === "ar";
  const user      = safeParse("user");
  const isAdmin   = localStorage.getItem("isAdmin") === "true";
  const { categories: rawCats } = useCategories();
  const cats = rawCats.filter(c => c?.name && !c.hidden);
  const { products: allProds } = useProducts();
  const [scrolled, setScrolled] = useState(false);
  const [searchQ, setSearchQ]   = useState("");

  const visibleProds   = allProds.filter(p => !p.hidden);
  const featuredProds  = visibleProds.filter(p => p.featured || (p.badges || []).some(b => /جديد|مميز|featured/i.test(b))).slice(0, 8);
  const saleProds      = visibleProds.filter(p => Number(p.oldPrice) > Number(p.price)).slice(0, 8);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("isAdmin");
    navigate("/user-login", { replace: true });
  };

  return (
    <div style={{ fontFamily: "'Tajawal',sans-serif", direction: isRtl ? "rtl" : "ltr", background: "#F8FAFC", minHeight: "100vh", color: "#1E293B" }}>
      <style>{`
        @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ticker   { from{transform:translateX(0)} to{transform:translateX(50%)} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.6} }
        @keyframes shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
        .fade-up { animation: fadeUp .5s ease both; }
        .fade-up-1 { animation: fadeUp .5s .1s ease both; }
        .fade-up-2 { animation: fadeUp .5s .2s ease both; }
        .fade-up-3 { animation: fadeUp .5s .3s ease both; }
        .cat-card  { transition: transform .22s ease, box-shadow .22s ease; text-decoration:none; }
        .cat-card:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 20px 44px rgba(0,0,0,.13)!important; }
        .feat-card { transition: transform .2s ease, box-shadow .2s ease; }
        .feat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(99,102,241,.15)!important; }
        .social-icon { transition: transform .15s ease; display:flex; }
        .social-icon:hover { transform: scale(1.2); }
        .nav-btn { transition: all .15s ease; }
        .nav-btn:hover { opacity:.85; transform:translateY(-1px); }
        .shimmer-text {
          background: linear-gradient(90deg, #0EA5E9, #6366F1, #EC4899, #0EA5E9);
          background-size: 300% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmer 4s linear infinite;
        }
        .hero-dot { position:absolute; border-radius:50%; pointer-events:none; }
        /* ── Responsive ── */
        @media (max-width: 768px) {
          .nav-social   { display: none !important; }
          .nav-search   { display: none !important; }
          .nav-admin    { display: none !important; }
          .hero-grid    { grid-template-columns: 1fr !important; }
          .hero-cards   { display: none !important; }
          .features-grid{ grid-template-columns: 1fr 1fr !important; }
          .feat-border  { border-left: none !important; border-bottom: 1px solid #F1F5F9; }
          .footer-top   { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .footer-bot   { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .prod-grid    { grid-template-columns: repeat(2,1fr) !important; }
          .cats-grid    { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 480px) {
          .prod-grid  { grid-template-columns: 1fr 1fr !important; }
          .cats-grid  { grid-template-columns: 1fr 1fr !important; }
          .hero-title { font-size: 26px !important; }
          .hero-btns  { flex-direction: column !important; }
          .hero-btns a, .hero-btns button { width: 100% !important; justify-content: center !important; }
        }
      `}</style>

      {/* ── شريط الإعلانات ── */}
      <div style={{ background: "linear-gradient(90deg,#0C4A6E,#1E40AF,#4F46E5)", color: "#fff", padding: "8px 0", overflow: "hidden", fontSize: 13, fontWeight: 700 }}>
        <div style={{ display: "flex", gap: 60, whiteSpace: "nowrap", animation: "ticker 18s linear infinite", paddingRight: "100%" }}>
          {(isRtl
            ? ["🚀 شحن مجاني لجميع طلبات الإمارات 🇦🇪", "💬 تواصل معنا عبر واتساب", "🔥 عروض حصرية يومياً", "💎 جودة مضمونة أو استرداد كامل", "⚡ توصيل خلال 24 ساعة"]
            : ["🚀 Free shipping across UAE 🇦🇪", "💬 Contact us via WhatsApp", "🔥 Exclusive daily deals", "💎 Quality guaranteed or full refund", "⚡ Delivery within 24 hours"]
          ).map((txt, i) => (
            <span key={i}>{txt}</span>
          ))}
        </div>
      </div>

      {/* ── ناف بار ── */}
      <header style={{
        background: "#fff",
        borderBottom: scrolled ? "1px solid #E2E8F0" : "1px solid transparent",
        boxShadow: scrolled ? "0 4px 20px rgba(0,0,0,.06)" : "none",
        position: "sticky", top: 0, zIndex: 400,
        transition: "box-shadow .3s ease, border-color .3s ease",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 70, display: "flex", alignItems: "center", gap: 16 }}>

          {/* لوغو */}
          <Link to="/home" style={{ fontSize: 26, fontWeight: 900, flexShrink: 0, lineHeight: 1 }}>
            <span className="shimmer-text">{t("store_name")}</span>
            <span style={{ marginRight: 4 }}>✨</span>
          </Link>

          {/* سيرش مع Autocomplete */}
          <div className="nav-search" style={{ flex: 1, maxWidth: 420 }}>
            <SearchAutocomplete placeholder={t("nav_search_ph")} />
          </div>

          {/* أيقونات يمين */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto" }}>
            <div className="nav-social" style={{ display: "flex", gap: 6 }}>
              {SOCIAL.map(s => (
                <a key={s.name} href={s.href} target="_blank" rel="noreferrer" title={s.name} className="social-icon">
                  <s.Icon size={26} />
                </a>
              ))}
            </div>
            <div className="nav-social" style={{ width: 1, height: 28, background: "#E2E8F0" }} />
            {isAdmin && (
              <Link to="/admin-dashboard" className="nav-btn nav-admin" style={{ background: "#FFFBEB", color: "#D97706", border: "1.5px solid #FDE68A", borderRadius: 10, padding: "7px 13px", fontWeight: 700, fontSize: 13 }}>{t("nav_admin")}</Link>
            )}
            <Link to="/cart" className="nav-btn" style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", borderRadius: 12, padding: "9px 18px", fontWeight: 800, fontSize: 14, boxShadow: "0 4px 14px rgba(99,102,241,.4)" }}>
              {t("cart_btn")}
            </Link>
            <LangToggle style={{ background: "#F8FAFC", color: "#334155", border: "1.5px solid #E2E8F0" }} />
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Link to="/wishlist" title={lang === "ar" ? "المفضلة" : "Wishlist"} style={{ width: 36, height: 36, borderRadius: "50%", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, textDecoration: "none" }}>❤️</Link>
                <Link to="/profile" style={{ textDecoration: "none" }}>
                  <div title={user.name || t("nav_profile")} style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#EC4899)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 15, flexShrink: 0, cursor: "pointer" }}>
                    {(user.name || user.phone || "م").charAt(0)}
                  </div>
                </Link>
                <button onClick={logout} className="nav-btn" style={{ background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 10, padding: "7px 13px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>{t("nav_logout")}</button>
              </div>
            ) : (
              <Link to="/user-login" className="nav-btn" style={{ background: "#F8FAFC", color: "#334155", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13 }}>👤 {lang === "ar" ? "دخول" : "Sign In"}</Link>
            )}
          </div>
        </div>

        {/* شريط الأقسام */}
        {cats.length > 0 && (
          <div style={{ borderTop: "1px solid #F1F5F9", background: "#fff" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", overflowX: "auto", gap: 2 }}>
              {cats.map((cat, i) => {
                const icon = cat.icon || iconFor(cat.name);
                return (
                  <Link key={i} to={`/category/${slugify(cat.name)}`}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 14px", color: "#475569", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", borderBottom: "2px solid transparent", transition: "all .15s", flexShrink: 0 }}
                    onMouseOver={e => { e.currentTarget.style.color = "#6366F1"; e.currentTarget.style.borderBottomColor = "#6366F1"; }}
                    onMouseOut={e => { e.currentTarget.style.color = "#475569"; e.currentTarget.style.borderBottomColor = "transparent"; }}>
                    <span style={{ fontSize: 14 }}>{icon}</span>
                    {catName(cat)}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* ── هيرو ── */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0C4A6E 100%)", padding: "80px 24px 90px" }}>
        {/* دوائر زخرفية */}
        <div className="hero-dot" style={{ width: 400, height: 400, background: "rgba(99,102,241,.15)", top: -120, right: -100, filter: "blur(60px)" }} />
        <div className="hero-dot" style={{ width: 300, height: 300, background: "rgba(236,72,153,.12)", bottom: -80, left: -60, filter: "blur(60px)" }} />
        <div className="hero-dot" style={{ width: 200, height: 200, background: "rgba(14,165,233,.18)", top: "30%", left: "40%", filter: "blur(50px)" }} />

        <div className="hero-grid" style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          {/* نص يمين */}
          <div style={{ textAlign: isRtl ? "right" : "left" }}>
            <div className="fade-up" style={{ display: "inline-block", background: "rgba(99,102,241,.25)", border: "1px solid rgba(99,102,241,.4)", borderRadius: 999, padding: "6px 16px", fontSize: 13, color: "#A5B4FC", fontWeight: 700, marginBottom: 20 }}>
              🛍️ {isRtl ? "متجرك الإلكتروني في الإمارات" : "Your online store in the UAE"}
            </div>
            <h1 className="fade-up-1" style={{ fontSize: "clamp(28px,4vw,52px)", fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 16 }}>
              {user?.name ? (
                <>{lang === "ar" ? "أهلاً" : "Welcome"} <span style={{ color: "#818CF8" }}>{user.name}</span>!<br />{lang === "ar" ? "يلا نتسوق 🛒" : "Let's shop 🛒"}</>
              ) : (
                <>{t("hero_title")}</>
              )}
            </h1>
            <p className="fade-up-2" style={{ color: "#94A3B8", fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
              {t("hero_sub")} {t("hero_ship")}
            </p>
            <div className="fade-up-3 hero-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to={cats[0] ? `/category/${slugify(cats[0].name)}` : "/home"}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", borderRadius: 14, padding: "13px 28px", fontWeight: 900, fontSize: 15, boxShadow: "0 8px 24px rgba(99,102,241,.45)", transition: "transform .2s, box-shadow .2s" }}
                onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(99,102,241,.55)"; }}
                onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(99,102,241,.45)"; }}>
                {t("btn_shop")} ←
              </Link>
              <a href="https://wa.me/971585446473" target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.08)", color: "#fff", border: "1.5px solid rgba(255,255,255,.15)", borderRadius: 14, padding: "13px 24px", fontWeight: 700, fontSize: 14, backdropFilter: "blur(8px)", transition: "background .2s" }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,.14)"}
                onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,.08)"}>
                <WhatsAppIcon size={20} /> {isRtl ? "واتساب" : "WhatsApp"}
              </a>
            </div>
          </div>

          {/* كروت يسار */}
          <div className="hero-cards" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(isRtl ? [
              { emoji: "🔥", label: "عروض حصرية", sub: "خصومات يومية", color: "#EF4444" },
              { emoji: "📦", label: "منتجات جديدة", sub: "تحديث مستمر", color: "#6366F1" },
              { emoji: "⚡", label: "توصيل سريع", sub: "خلال 24 ساعة", color: "#F59E0B" },
              { emoji: "💎", label: "جودة عالية", sub: "ضمان الأصالة", color: "#10B981" },
            ] : [
              { emoji: "🔥", label: "Exclusive Deals", sub: "Daily discounts", color: "#EF4444" },
              { emoji: "📦", label: "New Products", sub: "Constantly updated", color: "#6366F1" },
              { emoji: "⚡", label: "Fast Delivery", sub: "Within 24 hours", color: "#F59E0B" },
              { emoji: "💎", label: "Premium Quality", sub: "Authenticity guaranteed", color: "#10B981" },
            ]).map((c, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: "20px 16px", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", gap: 8, transition: "background .2s" }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}
                onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,.06)"}>
                <span style={{ fontSize: 28 }}>{c.emoji}</span>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>{c.label}</div>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── شريط المميزات ── */}
      <section style={{ background: "#fff", borderBottom: "1px solid #F1F5F9" }}>
        <div className="features-grid" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
          {(isRtl ? FEATURES_AR : FEATURES_EN).map((f, i) => (
            <div key={i} className={`feat-card${i < 3 ? " feat-border" : ""}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: "22px 16px", borderLeft: i < 3 ? "1px solid #F1F5F9" : "none" }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: "linear-gradient(135deg,#EEF2FF,#F5F3FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B" }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── باندل بيلدر بانر ── */}
      <section style={{ background: "#fff", padding: "32px 24px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <Link to="/bundle" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "linear-gradient(135deg, #6366F1 0%, #EC4899 55%, #F59E0B 100%)",
            borderRadius: 24, padding: "28px 36px", textDecoration: "none",
            boxShadow: "0 12px 40px rgba(99,102,241,.3)", position: "relative", overflow: "hidden",
            flexWrap: "wrap", gap: 16, transition: "transform .2s, box-shadow .2s"
          }}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 18px 50px rgba(99,102,241,.4)"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(99,102,241,.3)"; }}>
            <div style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
            <div style={{ position: "absolute", bottom: -40, left: 100, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 36 }}>📦</span>
                <div>
                  <div style={{ color: "#fff", fontWeight: 900, fontSize: 22, lineHeight: 1.2 }}>
                    {isRtl ? "اصنع باندلك الخاص" : "Build Your Bundle"}
                  </div>
                  <div style={{ color: "rgba(255,255,255,.8)", fontSize: 14, marginTop: 4 }}>
                    {isRtl ? "اختر منتجات متعددة واحصل على خصم يصل لـ 20%" : "Pick multiple products & get up to 20% off"}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {[
                { n: isRtl ? "2 منتجات" : "2 items", p: "10%", e: "🔥" },
                { n: isRtl ? "3 منتجات" : "3 items", p: "15%", e: "💎" },
                { n: isRtl ? "4+ منتجات" : "4+ items", p: "20%", e: "🚀" },
              ].map((b, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.18)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(255,255,255,.2)" }}>
                  <span>{b.e}</span>
                  <div style={{ lineHeight: 1.2 }}>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>{b.n}</div>
                    <div style={{ color: "rgba(255,255,255,.85)", fontSize: 11 }}>{b.p} OFF</div>
                  </div>
                </div>
              ))}
              <div style={{ background: "rgba(255,255,255,.9)", color: "#6366F1", borderRadius: 12, padding: "11px 22px", fontWeight: 900, fontSize: 14, whiteSpace: "nowrap" }}>
                {isRtl ? "ابدأ الآن ←" : "Start Now →"}
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── شبكة الأقسام ── */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "52px 24px 72px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#6366F1", marginBottom: 6, letterSpacing: ".5px" }}>CATEGORIES</p>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", lineHeight: 1 }}>{t("section_cats")}</h2>
          </div>
          <span style={{ background: "#EEF2FF", color: "#6366F1", borderRadius: 999, padding: "5px 14px", fontSize: 13, fontWeight: 700 }}>{cats.length} {isRtl ? "قسم" : "categories"}</span>
        </div>

        {cats.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 24, border: "2px dashed #E2E8F0" }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🛍️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1E293B", marginBottom: 8 }}>{isRtl ? "لا توجد أقسام بعد" : "No categories yet"}</h3>
            <p style={{ color: "#94A3B8" }}>{isRtl ? "قم بإضافة أقسام من لوحة التحكم" : "Add categories from the dashboard"}</p>
          </div>
        ) : (
          <div className="cats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 20 }}>
            {cats.map((cat, i) => {
              const grad = GRAD[i % GRAD.length];
              const icon = cat.icon || iconFor(cat.name);
              return (
                <Link key={i} to={`/category/${slugify(cat.name)}`} className="cat-card"
                  style={{ display: "block", borderRadius: 20, overflow: "hidden", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,.06)", border: "1px solid #F1F5F9" }}>
                  <div style={{ aspectRatio: "1/1", background: cat.image ? "#F8FAFC" : `linear-gradient(${grad})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      <>
                        <div style={{ position: "absolute", width: "150%", height: "150%", background: "radial-gradient(circle at 70% 70%, rgba(255,255,255,.15), transparent 60%)" }} />
                        <span style={{ fontSize: 56, position: "relative", zIndex: 1, filter: "drop-shadow(0 4px 8px rgba(0,0,0,.2))" }}>{icon}</span>
                      </>
                    )}
                  </div>
                  <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B" }}>{catName(cat)}</div>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(${grad})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 900 }}>←</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* ── منتجات التخفيض ── */}
      {saleProds.length > 0 && (
        <section style={{ background: "#fff", borderTop: "1px solid #F1F5F9", padding: "52px 24px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", marginBottom: 6, letterSpacing: ".5px" }}>🔥 SALE</p>
                <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", lineHeight: 1 }}>{t("section_sale")}</h2>
              </div>
              <Link to="/search?q=تخفيض" style={{ color: "#6366F1", fontWeight: 700, fontSize: 13 }}>{t("view_all")}</Link>
            </div>
            <div className="prod-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 18 }}>
              {saleProds.map((p, i) => {
                const price = Number(p.price), old = Number(p.oldPrice);
                const pct = Math.round(100 - (price / old) * 100);
                return (
                  <Link key={p.id || i} to={`/product/${p.id}`}
                    style={{ display: "block", background: "#fff", borderRadius: 18, border: "1px solid #F1F5F9", boxShadow: "0 2px 10px rgba(0,0,0,.05)", overflow: "hidden", textDecoration: "none", transition: "transform .2s, box-shadow .2s" }}
                    onMouseOver={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "0 16px 36px rgba(0,0,0,.1)"; }}
                    onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,.05)"; }}>
                    <div style={{ position: "relative", height: 180, overflow: "hidden", background: "#F8FAFC" }}>
                      <img src={p.image || ""} alt={prodName(p)} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} />
                      <span style={{ position: "absolute", top: 8, right: 8, background: "#EF4444", color: "#fff", borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 800 }}>{t("save_pct")} {pct}%</span>
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#0F172A", marginBottom: 6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{prodName(p)}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 900, fontSize: 16, color: "#6366F1" }}>{fmtPrice(price)}</span>
                        <span style={{ textDecoration: "line-through", fontSize: 12, color: "#94A3B8" }}>{fmtPrice(old)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── المنتجات المميزة ── */}
      {featuredProds.length > 0 && (
        <section style={{ padding: "52px 24px", background: "#F8FAFC" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#6366F1", marginBottom: 6, letterSpacing: ".5px" }}>⭐ FEATURED</p>
                <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", lineHeight: 1 }}>{t("section_featured")}</h2>
              </div>
              <Link to="/search?q=" style={{ color: "#6366F1", fontWeight: 700, fontSize: 13 }}>{t("view_all")}</Link>
            </div>
            <div className="prod-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 18 }}>
              {featuredProds.map((p, i) => (
                <Link key={p.id || i} to={`/product/${p.id}`}
                  style={{ display: "block", background: "#fff", borderRadius: 18, border: "1px solid #F1F5F9", boxShadow: "0 2px 10px rgba(0,0,0,.05)", overflow: "hidden", textDecoration: "none", transition: "transform .2s, box-shadow .2s" }}
                  onMouseOver={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "0 16px 36px rgba(0,0,0,.1)"; }}
                  onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,.05)"; }}>
                  <div style={{ height: 180, overflow: "hidden", background: "#F8FAFC" }}>
                    <img src={p.image || ""} alt={prodName(p)} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.currentTarget.style.display = "none"} />
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: "#6366F1", fontWeight: 700, marginBottom: 4 }}>{p.category}</div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#0F172A", marginBottom: 6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{prodName(p)}</div>
                    <span style={{ fontWeight: 900, fontSize: 16, color: "#6366F1" }}>{fmtPrice(Number(p.price))}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── بانر واتساب ── */}
      <section style={{ background: "linear-gradient(135deg,#064E3B,#065F46)", margin: "0 0 0 0", padding: "48px 24px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 10 }}>{isRtl ? "تواصل معنا عبر واتساب" : "Contact us via WhatsApp"}</h3>
          <p style={{ color: "#6EE7B7", fontSize: 14, marginBottom: 28 }}>{isRtl ? "فريق خدمة العملاء متاح 24/7 للإجابة على استفساراتك" : "Our customer service team is available 24/7"}</p>
          <a href="https://wa.me/971585446473" target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#25D366", color: "#fff", borderRadius: 14, padding: "13px 28px", fontWeight: 900, fontSize: 15, boxShadow: "0 8px 24px rgba(37,211,102,.4)", transition: "transform .2s, box-shadow .2s" }}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(37,211,102,.55)"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,211,102,.4)"; }}>
            <WhatsAppIcon size={22} /> {isRtl ? "ابدأ المحادثة" : "Start Chat"}
          </a>
        </div>
      </section>

      {/* ── فوتر ── */}
      <footer style={{ background: "#0F172A", padding: "40px 24px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="footer-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
                <span className="shimmer-text">{t("store_name")}</span>
                <span style={{ color: "#fff" }}> ✨</span>
              </div>
              <p style={{ color: "#64748B", fontSize: 13 }}>{isRtl ? "متجرك الإلكتروني المفضل في الإمارات 🇦🇪" : "Your favorite online store in the UAE 🇦🇪"}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {SOCIAL.map(s => (
                <a key={s.name} href={s.href} target="_blank" rel="noreferrer" title={s.name} className="social-icon" style={{ opacity: .7, transition: "opacity .15s, transform .15s" }}
                  onMouseOver={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1.2)"; }}
                  onMouseOut={e => { e.currentTarget.style.opacity = ".7"; e.currentTarget.style.transform = "scale(1)"; }}>
                  <s.Icon size={30} />
                </a>
              ))}
            </div>
          </div>
          <div className="footer-bot" style={{ borderTop: "1px solid #1E293B", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ color: "#334155", fontSize: 12 }}>{t("footer_rights")}</p>
            <div style={{ display: "flex", gap: 16 }}>
              {(lang === "ar" ? ["سياسة الخصوصية", "شروط الاستخدام", "تواصل معنا"] : ["Privacy Policy", "Terms of Use", "Contact Us"]).map((l, i) => (
                <span key={i} style={{ color: "#475569", fontSize: 12, cursor: "pointer", transition: "color .15s" }}
                  onMouseOver={e => e.currentTarget.style.color = "#818CF8"}
                  onMouseOut={e => e.currentTarget.style.color = "#475569"}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
