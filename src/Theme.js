// ===== نظام التصميم الموحد لمتجر كشخة =====

export const C = {
  primary: "#6366F1",
  primaryDark: "#4F46E5",
  primaryLight: "#EEF2FF",
  accent: "#F59E0B",
  accentLight: "#FFFBEB",
  success: "#10B981",
  successLight: "#ECFDF5",
  danger: "#EF4444",
  dangerLight: "#FEF2F2",
  pink: "#EC4899",
  pinkLight: "#FDF2F8",
  text: "#1E293B",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  bg: "#F8FAFC",
  bgCard: "#FFFFFF",
  border: "#E2E8F0",
  borderFocus: "#6366F1",
};

export const grad = {
  primary: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
  accent: "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
  pink: "linear-gradient(135deg, #EC4899 0%, #F97316 100%)",
  hero: "linear-gradient(135deg, #6366F1 0%, #EC4899 50%, #F59E0B 100%)",
};

export const shadow = {
  sm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  md: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  lg: "0 10px 30px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)",
  primary: "0 8px 20px rgba(99,102,241,0.30)",
  accent: "0 8px 20px rgba(245,158,11,0.30)",
};

export const r = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const card = {
  background: "#FFFFFF",
  borderRadius: 16,
  border: "1px solid #E2E8F0",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  padding: "20px",
};

export const inputBase = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1.5px solid #E2E8F0",
  fontSize: 15,
  color: "#1E293B",
  background: "#FFFFFF",
  outline: "none",
  transition: "border-color 0.18s, box-shadow 0.18s",
  boxSizing: "border-box",
};

export const btnPrimary = {
  background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
  color: "#FFFFFF",
  border: "none",
  borderRadius: 12,
  padding: "12px 20px",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(99,102,241,0.30)",
  transition: "transform 0.15s, box-shadow 0.15s",
  fontFamily: "'Tajawal', sans-serif",
};

export const btnSecondary = {
  background: "#EEF2FF",
  color: "#6366F1",
  border: "1.5px solid #6366F1",
  borderRadius: 12,
  padding: "11px 20px",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  transition: "background 0.15s",
  fontFamily: "'Tajawal', sans-serif",
};

export const btnDanger = {
  background: "#FEF2F2",
  color: "#EF4444",
  border: "1.5px solid #EF4444",
  borderRadius: 12,
  padding: "10px 16px",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "'Tajawal', sans-serif",
};

export const navbarStyle = {
  background: "#FFFFFF",
  borderBottom: "1px solid #E2E8F0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  padding: "14px 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  position: "sticky",
  top: 0,
  zIndex: 100,
};

export const logoStyle = {
  fontSize: 22,
  fontWeight: 900,
  background: "linear-gradient(135deg, #6366F1 0%, #EC4899 50%, #F59E0B 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

export const safeParse = (k, fb = null) => {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fb; }
  catch { return fb; }
};

export const fmt = (n) => {
  if (!Number.isFinite(+n)) return "—";
  const lang = localStorage.getItem("lang") || "ar";
  return lang === "ar" ? `${(+n).toFixed(2)} درهم` : `${(+n).toFixed(2)} AED`;
};

export const slugify = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "-");

// اسم القسم حسب اللغة
export const catName = (cat) => {
  if (!cat) return "";
  const lang = localStorage.getItem("lang") || "ar";
  if (lang === "en" && cat.nameEn) return cat.nameEn;
  return cat.name || "";
};

// اسم المنتج حسب اللغة
export const prodName = (p) => {
  if (!p) return "";
  const lang = localStorage.getItem("lang") || "ar";
  if (lang === "en" && p.nameEn) return p.nameEn;
  return p.name || "";
};

// وصف المنتج حسب اللغة
export const prodDesc = (p) => {
  if (!p) return "";
  const lang = localStorage.getItem("lang") || "ar";
  if (lang === "en" && p.descriptionEn) return p.descriptionEn;
  return p.description || "";
};

export const focusIn = (e) => {
  e.target.style.borderColor = "#6366F1";
  e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)";
};

export const focusOut = (e) => {
  e.target.style.borderColor = "#E2E8F0";
  e.target.style.boxShadow = "none";
};
