import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  IconHome, IconBox, IconFolder, IconStar, IconCart, IconSettings,
  IconReceipt, IconUsers, IconPlus, IconUpload,
  IconBell, IconStore, IconChevDown, IconLogout, IconMenu, IconClose,
  IconSearch,
} from "./Icons";
import { clearAuth } from "../api";

// ───── design tokens ─────
export const ADMIN = {
  topbarBg:    "#0F172A",
  topbarBorder:"rgba(255,255,255,.08)",
  navItem:     "rgba(255,255,255,.65)",
  navItemActive: "#FFFFFF",
  navItemActiveBg: "rgba(99,102,241,.18)",
  navItemHoverBg:  "rgba(255,255,255,.06)",
  pageBg:    "#F6F7FB",
  text:      "#0F172A",
  textMuted: "#64748B",
  textSubtle:"#94A3B8",
  accent:    "#6366F1",
  accentBg:  "#EEF2FF",
  border:    "#EEF0F4",
  cardBorder:"#F1F5F9",
  cardBg:    "#FFFFFF",
};

// Single unified tab strip — every destination appears exactly once.
// `to`     : full pathname (+ optional ?tab=x) the link navigates to
// `match`  : function that decides if the tab is currently active
const MAIN_TABS = [
  {
    label: "نظرة عامة", to: "/admin-dashboard", icon: IconHome,
    match: (p, s) => p === "/admin-dashboard" && !s.has("tab"),
  },
  {
    label: "الطلبات", to: "/admin-orders", icon: IconReceipt, badgeKey: "newOrders",
    match: (p) => p === "/admin-orders" || p.startsWith("/admin-orders/"),
  },
  {
    label: "المنتجات", to: "/admin-dashboard?tab=products", icon: IconBox,
    match: (p, s) => p === "/admin-dashboard" && s.get("tab") === "products",
  },
  {
    label: "الأقسام", to: "/admin-dashboard?tab=cats", icon: IconFolder,
    match: (p, s) => p === "/admin-dashboard" && s.get("tab") === "cats",
  },
  {
    label: "إضافة منتج", to: "/add-product", icon: IconPlus,
    match: (p) => p === "/add-product",
  },
  {
    label: "استيراد جماعي", to: "/bulk-import", icon: IconUpload,
    match: (p) => p === "/bulk-import",
  },
  {
    label: "العملاء", to: "/customers", icon: IconUsers,
    match: (p) => p === "/customers",
  },
  {
    label: "التقييمات", to: "/admin-dashboard?tab=ratings", icon: IconStar,
    match: (p, s) => p === "/admin-dashboard" && s.get("tab") === "ratings",
  },
  {
    label: "سلات مهجورة", to: "/admin-dashboard?tab=abandoned", icon: IconCart,
    match: (p, s) => p === "/admin-dashboard" && s.get("tab") === "abandoned",
  },
  {
    label: "الإعدادات", to: "/admin-dashboard?tab=settings", icon: IconSettings,
    match: (p, s) => p === "/admin-dashboard" && s.get("tab") === "settings",
  },
];

function NavTab({ item, badge, pathname, search }) {
  const Icon = item.icon;
  const active = item.match(pathname, search);
  return (
    <Link
      to={item.to}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "8px 13px", borderRadius: 9,
        color: active ? "#fff" : ADMIN.navItem,
        background: active ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : "transparent",
        boxShadow: active ? "0 4px 10px rgba(99,102,241,.35)" : "none",
        textDecoration: "none",
        fontWeight: active ? 700 : 500,
        fontSize: 13, whiteSpace: "nowrap",
        position: "relative",
        transition: "background .15s, color .15s",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = ADMIN.navItemHoverBg; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Icon size={14} />
      <span>{item.label}</span>
      {badge > 0 && (
        <span style={{
          background: active ? "rgba(255,255,255,.25)" : "#EF4444",
          color: "#fff", fontSize: 10, fontWeight: 800,
          borderRadius: 999, minWidth: 17, height: 17, padding: "0 5px",
          display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
        }}>{badge}</span>
      )}
    </Link>
  );
}

// ───── Top bar (brand + nav + page header + actions) ─────
export default function AdminLayout({
  title, subtitle, actions, search, onSearch, badges = {}, children,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
  const searchParams = new URLSearchParams(location.search);
  const [openMenu, setOpenMenu]   = useState(false); // user dropdown
  const [mobileNav, setMobileNav] = useState(false); // mobile nav drawer

  // Close mobile drawer on route change
  useEffect(() => { setMobileNav(false); }, [pathname, location.search]);

  const onLogout = () => {
    clearAuth();
    navigate("/user-login");
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh", background: ADMIN.pageBg,
        fontFamily: "'Tajawal',sans-serif", color: ADMIN.text,
      }}
    >
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:none; } }
        .adm-card { animation: fadeUp .35s ease both; }
        .adm-mobile-toggle { display: none; }
        /* Hide scrollbars on horizontally-scrolling chrome (still scrollable) */
        .adm-noscrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .adm-noscrollbar::-webkit-scrollbar { width: 0; height: 0; display: none; }
        @media (max-width: 900px) {
          .adm-nav-links { display: none !important; }
          .adm-mobile-toggle { display: inline-flex !important; }
          .adm-search { display: none !important; }
          .adm-mobile-drawer { display: block !important; }
        }
        @media (max-width: 600px) {
          .adm-user-name { display: none; }
          .adm-page-subtitle { display: none; }
        }
      `}</style>

      {/* ─── Brand + nav row ─── */}
      <div style={{
        background: ADMIN.topbarBg,
        borderBottom: `1px solid ${ADMIN.topbarBorder}`,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: "0 24px", height: 60,
        }}>
          {/* Brand */}
          <Link to="/admin-dashboard" style={{
            display: "flex", alignItems: "center", gap: 10,
            textDecoration: "none", flexShrink: 0,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 900, color: "#fff",
              boxShadow: "0 4px 10px rgba(99,102,241,.4)",
            }}>ك</div>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>كشخة</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }} className="adm-brand-sub">/ لوحة التحكم</span>
          </Link>

          {/* Unified pill-tab nav */}
          <nav className="adm-nav-links adm-noscrollbar" style={{
            display: "flex", alignItems: "center", gap: 3,
            flex: 1, minWidth: 0, overflowX: "auto",
          }}>
            {MAIN_TABS.map((item) => (
              <NavTab
                key={item.label}
                item={item}
                pathname={pathname}
                search={searchParams}
                badge={item.badgeKey ? (badges[item.badgeKey] || 0) : 0}
              />
            ))}
          </nav>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileNav(!mobileNav)}
            className="adm-mobile-toggle"
            aria-label="فتح القائمة"
            style={{
              background: "rgba(255,255,255,.08)", border: "none",
              color: "#fff", borderRadius: 8, width: 36, height: 36,
              alignItems: "center", justifyContent: "center", cursor: "pointer",
              flexShrink: 0,
            }}
          >{mobileNav ? <IconClose size={18} /> : <IconMenu size={18} />}</button>

          {/* Notifications + user */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Link to="/admin-orders" title="الطلبات الجديدة" style={{
              position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 9,
              color: "#fff", background: "rgba(255,255,255,.08)", textDecoration: "none",
            }}>
              <IconBell size={16} />
              {badges.newOrders > 0 && (
                <span style={{
                  position: "absolute", top: -3, insetInlineEnd: -3,
                  background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 800,
                  borderRadius: 999, minWidth: 16, height: 16, padding: "0 4px",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                }}>{badges.newOrders}</span>
              )}
            </Link>

            <div style={{ position: "relative" }}>
              <button
                onClick={() => setOpenMenu(!openMenu)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,.08)", border: "none",
                  borderRadius: 9, padding: "5px 8px 5px 5px", cursor: "pointer",
                  fontFamily: "'Tajawal',sans-serif",
                }}
              >
                <span style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                  color: "#fff", fontWeight: 800, fontSize: 11,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>A</span>
                <span className="adm-user-name" style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>الأدمن</span>
                <IconChevDown size={13} style={{ color: "rgba(255,255,255,.6)" }} />
              </button>
              {openMenu && (
                <>
                  <div onClick={() => setOpenMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", insetInlineEnd: 0,
                    background: "#fff", border: `1px solid ${ADMIN.border}`,
                    borderRadius: 10, boxShadow: "0 12px 32px rgba(15,23,42,.16)",
                    padding: 5, minWidth: 200, zIndex: 70,
                  }}>
                    <Link to="/home" onClick={() => setOpenMenu(false)} style={dropItem}>
                      <IconStore size={16} /><span>عودة للمتجر</span>
                    </Link>
                    <Link to="/profile" onClick={() => setOpenMenu(false)} style={dropItem}>
                      <IconUsers size={16} /><span>الملف الشخصي</span>
                    </Link>
                    <div style={{ height: 1, background: ADMIN.border, margin: "4px 0" }} />
                    <button onClick={onLogout} style={{ ...dropItem, color: "#EF4444", width: "100%", border: "none", background: "transparent", cursor: "pointer", textAlign: "inherit" }}>
                      <IconLogout size={16} /><span>تسجيل الخروج</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileNav && (
          <div style={{
            background: ADMIN.topbarBg,
            borderTop: `1px solid ${ADMIN.topbarBorder}`,
            padding: "8px 12px 14px",
            display: "grid", gap: 4,
          }}>
            {MAIN_TABS.map((item) => (
              <NavTab
                key={item.label}
                item={item}
                pathname={pathname}
                search={searchParams}
                badge={item.badgeKey ? (badges[item.badgeKey] || 0) : 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Page header (title + actions + search) ─── */}
      <div style={{
        background: "#fff",
        borderBottom: `1px solid ${ADMIN.border}`,
        padding: "14px 24px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            margin: 0, fontSize: 17, fontWeight: 800, color: ADMIN.text,
            lineHeight: 1.2, fontFamily: "'Tajawal',sans-serif",
          }}>{title}</h1>
          {subtitle && (
            <div className="adm-page-subtitle" style={{ fontSize: 12, color: ADMIN.textMuted, marginTop: 3 }}>{subtitle}</div>
          )}
        </div>

        {onSearch && (
          <div className="adm-search" style={{ position: "relative", flex: "0 1 320px", minWidth: 0 }}>
            <IconSearch size={15} style={{
              position: "absolute", insetInlineStart: 11, top: "50%",
              transform: "translateY(-50%)", color: ADMIN.textSubtle, pointerEvents: "none",
            }} />
            <input
              value={search || ""}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="ابحث..."
              style={{
                width: "100%",
                padding: "8px 36px 8px 12px",
                border: `1px solid ${ADMIN.border}`, borderRadius: 9,
                background: "#F6F7FB", fontSize: 13, color: ADMIN.text,
                fontFamily: "'Tajawal',sans-serif", outline: "none",
              }}
              onFocus={(e) => { e.target.style.background = "#fff"; e.target.style.borderColor = ADMIN.accent; }}
              onBlur={(e)  => { e.target.style.background = "#F6F7FB"; e.target.style.borderColor = ADMIN.border; }}
            />
          </div>
        )}

        {actions && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>}
      </div>

      {/* ─── Main ─── */}
      <main style={{ padding: "24px", maxWidth: 1400, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {children}
      </main>
    </div>
  );
}

const dropItem = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "8px 12px", borderRadius: 7,
  color: ADMIN.text, textDecoration: "none",
  fontSize: 13, fontWeight: 600, fontFamily: "'Tajawal',sans-serif",
};

// ───── Reusable card ─────
export function Card({ children, padded = true, style, className, ...props }) {
  return (
    <div
      className={`adm-card ${className || ""}`}
      style={{
        background: ADMIN.cardBg,
        border: `1px solid ${ADMIN.cardBorder}`,
        borderRadius: 14,
        padding: padded ? 20 : 0,
        boxShadow: "0 1px 2px rgba(15,23,42,.04)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// ───── Stat card ─────
export function Stat({ icon: Icon, label, value, hint, tone = "default", trend }) {
  const tones = {
    default: { iconBg: "#EEF2FF", iconColor: "#6366F1" },
    success: { iconBg: "#ECFDF5", iconColor: "#10B981" },
    danger:  { iconBg: "#FEF2F2", iconColor: "#EF4444" },
    warn:    { iconBg: "#FFFBEB", iconColor: "#F59E0B" },
    pink:    { iconBg: "#FDF2F8", iconColor: "#EC4899" },
    sky:     { iconBg: "#F0F9FF", iconColor: "#0EA5E9" },
  };
  const t = tones[tone] || tones.default;
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: ADMIN.textMuted, fontWeight: 600, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: ADMIN.text, lineHeight: 1.1, letterSpacing: "-.02em" }}>{value}</div>
          {hint && (
            <div style={{ fontSize: 11, color: ADMIN.textSubtle, marginTop: 6 }}>
              {trend != null && (
                <span style={{
                  color: trend > 0 ? "#10B981" : trend < 0 ? "#EF4444" : ADMIN.textSubtle,
                  fontWeight: 700, marginInlineEnd: 6,
                }}>
                  {trend > 0 ? "▲" : trend < 0 ? "▼" : "•"} {Math.abs(trend).toFixed(0)}%
                </span>
              )}
              {hint}
            </div>
          )}
        </div>
        {Icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: t.iconBg, color: t.iconColor,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </Card>
  );
}

// ───── Section header ─────
export function SectionHeader({ title, hint, action }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      gap: 12, marginBottom: 12,
    }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: ADMIN.text }}>{title}</h2>
        {hint && <div style={{ fontSize: 12, color: ADMIN.textMuted, marginTop: 4 }}>{hint}</div>}
      </div>
      {action}
    </div>
  );
}
