import React, { useEffect, useRef, useState } from "react";
import { useLang } from "../context/LanguageContext";

/**
 * Product image gallery:
 *  - Vertical thumbnails on desktop, horizontal on mobile
 *  - Click main image → opens lightbox with zoom in/out + drag to pan
 *  - Lightbox keyboard: ← →, Esc, +/- to zoom
 */
const PLACEHOLDER_IMG = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Crect fill='%23F1F5F9' width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' font-size='140' text-anchor='middle' dy='.3em'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E";

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.5;

export default function ProductGallery({ images = [], alt = "", children, badge }) {
  const list = (images || []).filter(Boolean).length ? images.filter(Boolean) : [PLACEHOLDER_IMG];
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState({});
  const [lightbox, setLightbox] = useState(false);

  // Lightbox zoom + pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // dragRef: stable starting coords for the in-flight drag (no re-render needed).
  // isDragging state: drives cursor + transition CSS (which DO need a re-render).
  const dragRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const { lang } = useLang() || { lang: "en" };
  const isAr = lang === "ar";
  const t = (ar, en) => (isAr ? ar : en);

  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const next = () => { setIdx(i => (i + 1) % list.length); resetZoom(); };
  const prev = () => { setIdx(i => (i - 1 + list.length) % list.length); resetZoom(); };

  const zoomIn  = () => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom(z => {
    const n = Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2));
    if (n === 1) setPan({ x: 0, y: 0 });
    return n;
  });

  // Keyboard + body scroll lock while lightbox is open
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-" || e.key === "_") zoomOut();
      else if (e.key === "0") resetZoom();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, list.length]);

  // Reset zoom + pan whenever the lightbox opens AND whenever the active
  // image changes. Without this an open lightbox stuck at 200% zoom could
  // carry over its pan offset to a totally different image.
  useEffect(() => { resetZoom(); }, [lightbox, idx]);

  // Drag to pan when zoomed in
  const onPanStart = (e) => {
    if (zoom <= 1) return;
    const point = e.touches ? e.touches[0] : e;
    dragRef.current = { startX: point.clientX, startY: point.clientY, baseX: pan.x, baseY: pan.y };
    setIsDragging(true);
  };
  const onPanMove = (e) => {
    if (!dragRef.current || zoom <= 1) return;
    const point = e.touches ? e.touches[0] : e;
    setPan({
      x: dragRef.current.baseX + (point.clientX - dragRef.current.startX),
      y: dragRef.current.baseY + (point.clientY - dragRef.current.startY),
    });
  };
  const onPanEnd = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  // Wheel = zoom inside lightbox
  const onWheel = (e) => {
    if (!lightbox) return;
    e.preventDefault();
    if (e.deltaY < 0) zoomIn(); else zoomOut();
  };

  return (
    <div className="pg-wrap">
      <style>{GALLERY_CSS}</style>

      <div className="pg-main-layout">
        {list.length > 1 && (
          <div className="pg-thumbs">
            {list.map((src, i) => (
              <button
                key={i}
                className={`pg-thumb ${i === idx ? "active" : ""}`}
                onClick={() => setIdx(i)}
                onMouseEnter={() => setIdx(i)}
              >
                <img src={src} alt={`${alt} ${i + 1}`}
                  onError={e => e.currentTarget.style.display = "none"} />
              </button>
            ))}
          </div>
        )}

        <div className="pg-main">
          <div className="pg-image-box" onClick={() => setLightbox(true)}>
            {list.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`${alt} ${i + 1}`}
                className={`pg-img ${i === idx ? "show" : ""}`}
                onLoad={() => setLoaded(l => ({ ...l, [i]: true }))}
                onError={e => { if (e.currentTarget.src !== PLACEHOLDER_IMG) { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMG; } }}
              />
            ))}

            {!loaded[idx] && <div className="pg-skeleton" />}

            {badge && <div className="pg-badge">{badge}</div>}

            <div className="pg-zoom-hint">
              🔍 {t("اضغط للتكبير", "Click to enlarge")}
            </div>

            {list.length > 1 && (
              <>
                <button className="pg-arrow pg-arrow-prev" onClick={e => { e.stopPropagation(); prev(); }} aria-label="Previous">‹</button>
                <button className="pg-arrow pg-arrow-next" onClick={e => { e.stopPropagation(); next(); }} aria-label="Next">›</button>
              </>
            )}

            {list.length > 1 && (
              <div className="pg-counter">{idx + 1} / {list.length}</div>
            )}

            {children}
          </div>
        </div>
      </div>

      {/* ══════════ Lightbox ══════════ */}
      {lightbox && (
        <div
          className="pg-lightbox"
          onClick={() => setLightbox(false)}
          onWheel={onWheel}
        >
          <button className="pg-lb-close" onClick={() => setLightbox(false)} aria-label="Close">×</button>

          {/* Zoom controls */}
          <div className="pg-lb-controls" onClick={e => e.stopPropagation()}>
            <button onClick={zoomOut} disabled={zoom <= ZOOM_MIN} title={t("تصغير", "Zoom out") + " (-)"}>−</button>
            <span className="pg-lb-zoom-level">{Math.round(zoom * 100)}%</span>
            <button onClick={zoomIn} disabled={zoom >= ZOOM_MAX} title={t("تكبير", "Zoom in") + " (+)"}>+</button>
            <button onClick={resetZoom} disabled={zoom === 1} title={t("إعادة", "Reset") + " (0)"}>⟲</button>
          </div>

          <div
            className="pg-lb-image-wrap"
            onClick={e => e.stopPropagation()}
            onMouseDown={onPanStart}
            onMouseMove={onPanMove}
            onMouseUp={onPanEnd}
            onMouseLeave={onPanEnd}
            onTouchStart={onPanStart}
            onTouchMove={onPanMove}
            onTouchEnd={onPanEnd}
            style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
          >
            <img
              src={list[idx]}
              alt={alt}
              className="pg-lb-img"
              draggable={false}
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: isDragging ? "none" : "transform .15s ease-out" }}
            />
          </div>

          {list.length > 1 && (
            <>
              <button className="pg-lb-arrow pg-lb-prev" onClick={e => { e.stopPropagation(); prev(); }}>‹</button>
              <button className="pg-lb-arrow pg-lb-next" onClick={e => { e.stopPropagation(); next(); }}>›</button>
              <div className="pg-lb-counter">{idx + 1} / {list.length}</div>
              <div className="pg-lb-thumbs" onClick={e => e.stopPropagation()}>
                {list.map((src, i) => (
                  <button key={i} className={`pg-lb-thumb ${i === idx ? "active" : ""}`} onClick={() => { setIdx(i); resetZoom(); }}>
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════ CSS ══════════ */
const GALLERY_CSS = `
.pg-wrap { position: relative; }

.pg-main-layout {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 12px;
  padding: 12px;
  background: #fff;
}
[dir="rtl"] .pg-main-layout { direction: rtl; }

/* Thumbnails */
.pg-thumbs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 480px;
  overflow-y: auto;
  padding: 2px;
}
.pg-thumbs::-webkit-scrollbar { width: 4px; }
.pg-thumbs::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 2px; }

.pg-thumb {
  width: 62px;
  height: 62px;
  border: 2px solid #E2E8F0;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  background: #F8FAFC;
  transition: border-color .2s, transform .15s;
  flex-shrink: 0;
}
.pg-thumb:hover { transform: translateY(-2px); }
.pg-thumb.active {
  border-color: #6366F1;
  box-shadow: 0 0 0 2px rgba(99,102,241,.2);
}
.pg-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Main image */
.pg-main { position: relative; }
.pg-image-box {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #F8FAFC;
  border-radius: 14px;
  overflow: hidden;
  cursor: zoom-in;
  min-height: 380px;
}
.pg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity .3s ease;
}
.pg-img.show { opacity: 1; }

.pg-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #F1F5F9 0%, #E2E8F0 50%, #F1F5F9 100%);
  background-size: 200% 100%;
  animation: pgShim 1.4s ease-in-out infinite;
}
@keyframes pgShim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

.pg-badge {
  position: absolute;
  top: 14px;
  inset-inline-start: 14px;
  background: #EF4444;
  color: #fff;
  border-radius: 999px;
  padding: 6px 14px;
  font-weight: 900;
  font-size: 13px;
  z-index: 3;
  box-shadow: 0 4px 12px rgba(239,68,68,.35);
}

.pg-zoom-hint {
  position: absolute;
  top: 14px;
  inset-inline-end: 14px;
  background: rgba(15,23,42,.75);
  backdrop-filter: blur(6px);
  color: #fff;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 700;
  z-index: 3;
  opacity: 0;
  transition: opacity .2s;
  font-family: 'Tajawal',sans-serif;
  pointer-events: none;
}
.pg-image-box:hover .pg-zoom-hint { opacity: 1; }

.pg-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px; height: 40px;
  background: rgba(255,255,255,.95);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 22px;
  font-weight: 900;
  color: #0F172A;
  box-shadow: 0 4px 14px rgba(0,0,0,.18);
  z-index: 3;
  opacity: 0;
  transition: opacity .2s, transform .15s, background .15s;
  display: flex; align-items: center; justify-content: center;
  padding: 0;
  line-height: 1;
}
.pg-image-box:hover .pg-arrow { opacity: 1; }
.pg-arrow:hover { background: #fff; transform: translateY(-50%) scale(1.12); }
.pg-arrow-prev { inset-inline-start: 12px; }
.pg-arrow-next { inset-inline-end: 12px; }
[dir="rtl"] .pg-arrow-prev { transform: translateY(-50%) rotate(180deg); }
[dir="rtl"] .pg-arrow-next { transform: translateY(-50%) rotate(180deg); }
[dir="rtl"] .pg-arrow-prev:hover { transform: translateY(-50%) rotate(180deg) scale(1.12); }
[dir="rtl"] .pg-arrow-next:hover { transform: translateY(-50%) rotate(180deg) scale(1.12); }

.pg-counter {
  position: absolute;
  bottom: 14px;
  inset-inline-start: 14px;
  background: rgba(15,23,42,.75);
  backdrop-filter: blur(6px);
  color: #fff;
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 800;
  z-index: 3;
  font-family: 'Tajawal',sans-serif;
}

/* ══ Lightbox ══ */
.pg-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.94);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pgFadeIn .2s ease;
}
@keyframes pgFadeIn { from{opacity:0} to{opacity:1} }

.pg-lb-image-wrap {
  width: 92vw;
  height: 78vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}
.pg-lb-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
  animation: pgLbIn .3s ease;
  will-change: transform;
  pointer-events: none;
}
@keyframes pgLbIn { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }

/* Zoom controls */
.pg-lb-controls {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,.12);
  backdrop-filter: blur(8px);
  border-radius: 999px;
  padding: 6px;
  z-index: 5;
}
.pg-lb-controls button {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,.15);
  color: #fff; border: none; cursor: pointer;
  font-size: 20px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s, transform .15s;
  padding: 0;
  line-height: 1;
}
.pg-lb-controls button:hover:not(:disabled) { background: rgba(255,255,255,.3); transform: scale(1.08); }
.pg-lb-controls button:disabled { opacity: .35; cursor: not-allowed; }
.pg-lb-zoom-level {
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  min-width: 52px;
  text-align: center;
  font-family: 'Tajawal',sans-serif;
}

.pg-lb-close {
  position: absolute;
  top: 18px; right: 18px;
  width: 44px; height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,.15);
  color: #fff; border: none; cursor: pointer;
  font-size: 26px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(8px);
  transition: background .15s;
  line-height: 1;
  z-index: 5;
}
.pg-lb-close:hover { background: rgba(255,255,255,.28); }

.pg-lb-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 52px; height: 52px;
  border-radius: 50%;
  background: rgba(255,255,255,.15);
  color: #fff; border: none; cursor: pointer;
  font-size: 30px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(8px);
  transition: background .15s, transform .15s;
  padding: 0;
  line-height: 1;
  z-index: 5;
}
.pg-lb-arrow:hover { background: rgba(255,255,255,.28); transform: translateY(-50%) scale(1.1); }
.pg-lb-prev { left: 24px; }
.pg-lb-next { right: 24px; }

.pg-lb-counter {
  position: absolute;
  top: 24px; left: 24px;
  color: #fff; font-size: 14px; font-weight: 700;
  background: rgba(255,255,255,.1);
  backdrop-filter: blur(8px);
  border-radius: 999px;
  padding: 6px 16px;
  font-family: 'Tajawal',sans-serif;
  z-index: 5;
}

.pg-lb-thumbs {
  position: absolute;
  bottom: 24px;
  left: 50%; transform: translateX(-50%);
  display: flex; gap: 6px;
  max-width: 92vw;
  overflow-x: auto;
  padding: 6px;
  background: rgba(255,255,255,.08);
  backdrop-filter: blur(8px);
  border-radius: 14px;
  z-index: 5;
}
.pg-lb-thumb {
  width: 56px; height: 56px;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  padding: 0; background: #000;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color .2s, transform .15s;
}
.pg-lb-thumb:hover { transform: translateY(-3px); }
.pg-lb-thumb.active { border-color: #fff; }
.pg-lb-thumb img { width: 100%; height: 100%; object-fit: cover; }

@media (max-width: 640px) {
  .pg-main-layout {
    grid-template-columns: 1fr;
    padding: 8px;
  }
  .pg-thumbs {
    order: 2;
    flex-direction: row;
    max-height: none;
    overflow-x: auto;
    overflow-y: hidden;
  }
  .pg-thumb { width: 56px; height: 56px; }
  .pg-zoom-hint, .pg-arrow { opacity: 1; }
  .pg-arrow { width: 36px; height: 36px; font-size: 20px; }
  .pg-lb-arrow { width: 42px; height: 42px; font-size: 24px; }
  .pg-lb-image-wrap { height: 70vh; }
  .pg-lb-controls { top: 70px; }
}
`;
