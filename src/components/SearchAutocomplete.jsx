import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "../hooks/useProducts";
import { fuzzySearch, normalize } from "../utils/fuzzySearch";
import { fmt, fmtPrice, prodName } from "../Theme";
import { useLang } from "../context/LanguageContext";

const RECENT_KEY = "recentSearches";
const MAX_RECENT = 5;

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function pushRecent(q) {
  const cur = getRecent().filter((x) => normalize(x) !== normalize(q));
  const next = [q, ...cur].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function SearchAutocomplete({ placeholder, style, onClose }) {
  const { products } = useProducts();
  const { lang } = useLang();
  const isAr = lang === "ar";
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const suggestions = useMemo(() => {
    const res = fuzzySearch(products || [], q, 8);
    return res;
  }, [products, q]);

  const recent = useMemo(() => getRecent(), [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const go = (query) => {
    const term = String(query || "").trim();
    if (!term) return;
    pushRecent(term);
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
    onClose?.();
  };

  const openProduct = (p) => {
    pushRecent(prodName(p));
    setOpen(false);
    navigate(`/product/${p.id}`);
    onClose?.();
  };

  const onKey = (e) => {
    if (!open) return;
    const total = suggestions.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(total - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(-1, i - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) openProduct(suggestions[activeIdx]);
      else go(q);
    } else if (e.key === "Escape") setOpen(false);
  };

  const showRecent = open && !q.trim() && recent.length > 0;
  const showResults = open && q.trim() && suggestions.length > 0;
  const showNoMatch = open && q.trim().length >= 2 && suggestions.length === 0;

  return (
    <div ref={wrapRef} style={{ position: "relative", ...style }}>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); setActiveIdx(-1); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={placeholder || (isAr ? "🔍 ابحث عن منتج..." : "🔍 Search products...")}
        style={{
          width: "100%",
          padding: "10px 44px 10px 16px",
          borderRadius: 12,
          border: "1.5px solid #E2E8F0",
          fontSize: 14,
          outline: "none",
          background: "#F8FAFC",
          boxSizing: "border-box",
          fontFamily: "'Tajawal',sans-serif",
          transition: "border-color .2s, box-shadow .2s",
        }}
      />
      <button
        type="button"
        onClick={() => go(q)}
        style={{
          position: "absolute",
          [isAr ? "left" : "right"]: 8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 17,
          color: "#94A3B8",
          padding: 4,
        }}
      >
        🔍
      </button>

      {(showRecent || showResults || showNoMatch) && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 14,
            boxShadow: "0 20px 50px rgba(15,23,42,.14)",
            overflow: "hidden",
            zIndex: 1200,
            maxHeight: 420,
            overflowY: "auto",
            animation: "fadeUp .15s ease both",
          }}
        >
          <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {showRecent && (
            <div>
              <div style={{ padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1 }}>
                {isAr ? "عمليات البحث الأخيرة" : "Recent searches"}
              </div>
              {recent.map((r) => (
                <button
                  key={r}
                  onClick={() => { setQ(r); go(r); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 14px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    color: "#334155",
                    fontFamily: "'Tajawal',sans-serif",
                    textAlign: isAr ? "right" : "left",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: 14, color: "#94A3B8" }}>🕘</span>
                  <span>{r}</span>
                </button>
              ))}
            </div>
          )}

          {showResults && suggestions.map((p, i) => (
            <button
              key={p.id}
              onClick={() => openProduct(p)}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "10px 14px",
                background: activeIdx === i ? "#EEF2FF" : "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "'Tajawal',sans-serif",
                textAlign: isAr ? "right" : "left",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", background: "#F1F5F9", flexShrink: 0 }}>
                {p.image ? (
                  <img src={p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prodName(p)}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{p.category}{p.brand ? ` · ${p.brand}` : ""}</div>
              </div>
              <div style={{ fontWeight: 900, color: "#6366F1", fontSize: 14, flexShrink: 0 }}>{fmtPrice(p.price)}</div>
            </button>
          ))}

          {showResults && (
            <button
              onClick={() => go(q)}
              style={{
                display: "block",
                width: "100%",
                padding: "12px 14px",
                background: "#F8FAFC",
                border: "none",
                borderTop: "1px solid #F1F5F9",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 13,
                color: "#6366F1",
                fontFamily: "'Tajawal',sans-serif",
                textAlign: "center",
              }}
            >
              {isAr ? `عرض كل النتائج لـ "${q}" ←` : `See all results for "${q}" →`}
            </button>
          )}

          {showNoMatch && (
            <div style={{ padding: "20px 14px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>😕</div>
              {isAr ? `لا توجد نتائج لـ "${q}"` : `No matches for "${q}"`}
              <div style={{ fontSize: 11, marginTop: 4 }}>{isAr ? "جرّب كتابة أخرى" : "Try different wording"}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
