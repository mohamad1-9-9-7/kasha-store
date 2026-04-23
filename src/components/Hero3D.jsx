import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fmtPrice, prodName } from "../Theme";

/**
 * شبكة منتجات 3D خفيفة — بدون Three.js.
 * - منظور perspective + rotate3d للبطاقات
 * - حركة عائمة (floating) لكل بطاقة
 * - Parallax خفيف يتبع الماوس
 * - Hover: البطاقة تطلع لقدام وتستوي
 */
export default function Hero3D({ products = [], lang = "ar" }) {
  const wrapRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / r.width;
      const dy = (e.clientY - cy) / r.height;
      // تأثير خفيف (10 درجات كحد أقصى)
      setTilt({ x: -dy * 12, y: dx * 12 });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // خُذ أول 6 منتجات
  const items = (products || []).slice(0, 6);

  // إذا ما في منتجات، استخدم placeholders
  const fillers = [
    { id: "p1", image: "", placeholder: "🎮", label: lang === "ar" ? "ألعاب" : "Toys" },
    { id: "p2", image: "", placeholder: "🍼", label: lang === "ar" ? "رضاعات" : "Bottles" },
    { id: "p3", image: "", placeholder: "🧸", label: lang === "ar" ? "دُمى" : "Plush" },
    { id: "p4", image: "", placeholder: "🛝", label: lang === "ar" ? "زحاليق" : "Slides" },
    { id: "p5", image: "", placeholder: "🎨", label: lang === "ar" ? "تلوين" : "Art" },
    { id: "p6", image: "", placeholder: "🚗", label: lang === "ar" ? "سيارات" : "Cars" },
  ];
  const list = items.length ? items : fillers;

  return (
    <div ref={wrapRef} className="h3d-wrap" style={{
      perspective: "1200px",
      perspectiveOrigin: "center center",
      padding: "20px 0",
    }}>
      <style>{HERO3D_CSS}</style>

      <div className="h3d-grid" style={{
        transform: `rotateX(${12 + tilt.x}deg) rotateY(${-6 + tilt.y}deg) rotateZ(-2deg)`,
        transition: "transform .3s ease-out",
      }}>
        {list.map((p, i) => {
          const imgSrc = p.image || "";
          return p.id && products.length ? (
            <Link key={p.id} to={`/product/${p.id}`} className="h3d-card" style={{ animationDelay: `${i * 0.2}s` }}>
              <div className="h3d-img">
                {imgSrc
                  ? <img src={imgSrc} alt={prodName(p)} onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling.style.display = "flex"; }} />
                  : null}
                <div className="h3d-ph" style={{ display: imgSrc ? "none" : "flex" }}>
                  <span>📦</span>
                </div>
              </div>
              <div className="h3d-info">
                <div className="h3d-name">{prodName(p)}</div>
                <div className="h3d-price">{fmtPrice(p.price)}</div>
              </div>
            </Link>
          ) : (
            <div key={p.id || i} className="h3d-card" style={{ animationDelay: `${i * 0.2}s` }}>
              <div className="h3d-img">
                <div className="h3d-ph">
                  <span style={{ fontSize: 40 }}>{p.placeholder || "📦"}</span>
                </div>
              </div>
              <div className="h3d-info">
                <div className="h3d-name">{p.label}</div>
                <div className="h3d-price" style={{ opacity: .6 }}>✨</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ظلال/أضواء خلف الشبكة */}
      <div className="h3d-glow h3d-glow-1" />
      <div className="h3d-glow h3d-glow-2" />
    </div>
  );
}

const HERO3D_CSS = `
.h3d-wrap {
  position: relative;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  transform-style: preserve-3d;
}

.h3d-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  transform-style: preserve-3d;
  will-change: transform;
}

.h3d-card {
  background: linear-gradient(145deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,.04) 100%);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 18px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-decoration: none;
  color: inherit;
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 40px rgba(0,0,0,.35);
  animation: h3dFloat 4s ease-in-out infinite;
  transform-style: preserve-3d;
  transition: transform .3s cubic-bezier(.25,.9,.3,1), box-shadow .3s, border-color .3s;
  cursor: pointer;
}
.h3d-card:nth-child(3n+1) { animation-duration: 4.3s; }
.h3d-card:nth-child(3n+2) { animation-duration: 4.7s; }
.h3d-card:nth-child(3n+3) { animation-duration: 5.2s; }
.h3d-card:nth-child(2) { animation-delay: .4s; }
.h3d-card:nth-child(4) { animation-delay: .8s; }
.h3d-card:nth-child(6) { animation-delay: 1.2s; }

.h3d-card:hover {
  transform: translateZ(40px) scale(1.05);
  box-shadow: 0 30px 60px rgba(99,102,241,.45);
  border-color: rgba(99,102,241,.6);
  z-index: 2;
}

@keyframes h3dFloat {
  0%, 100% { transform: translateY(0px) translateZ(0); }
  50%      { transform: translateY(-10px) translateZ(8px); }
}

.h3d-img {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #1E293B, #0F172A);
  box-shadow: inset 0 0 20px rgba(0,0,0,.4);
}
.h3d-img img {
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform .4s;
}
.h3d-card:hover .h3d-img img { transform: scale(1.1); }

.h3d-ph {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 32px;
  background: linear-gradient(135deg, rgba(99,102,241,.15), rgba(236,72,153,.1));
}

.h3d-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 0 2px;
}
.h3d-name {
  font-size: 11px;
  font-weight: 800;
  color: rgba(255,255,255,.95);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  line-height: 1.3;
}
.h3d-price {
  font-size: 11px;
  font-weight: 700;
  color: #A5B4FC;
}

/* أضواء خلفية */
.h3d-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(60px);
  z-index: -1;
}
.h3d-glow-1 {
  width: 280px; height: 280px;
  top: 40%; left: -40px;
  background: radial-gradient(circle, rgba(99,102,241,.4) 0%, transparent 70%);
  animation: h3dGlow1 6s ease-in-out infinite;
}
.h3d-glow-2 {
  width: 240px; height: 240px;
  bottom: 10%; right: -30px;
  background: radial-gradient(circle, rgba(236,72,153,.35) 0%, transparent 70%);
  animation: h3dGlow2 7s ease-in-out infinite;
}
@keyframes h3dGlow1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(20px,-20px); } }
@keyframes h3dGlow2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-15px,15px); } }

@media (max-width: 480px) {
  .h3d-wrap { max-width: 380px; }
  .h3d-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .h3d-card { padding: 8px; border-radius: 14px; }
  .h3d-name, .h3d-price { font-size: 10px; }
}
`;
