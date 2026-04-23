import React, { useEffect, useState } from "react";

/**
 * شاشة نجاح الطلب: شاحنة CSS — بتظهر، بتتعبّى بالطرود، بتمشي.
 * الاستخدام:
 *   {showTruck && <TruckSuccess orderId={...} itemsCount={3} onDone={() => setShowTruck(false)} />}
 */
export default function TruckSuccess({ orderId, itemsCount = 3, lang = "ar", onDone, durationMs = 4200 }) {
  const [phase, setPhase] = useState("loading"); // loading → driving → done
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // بعد ما تنتهي حركة التحميل (1.8s) → يمشي
    const t1 = setTimeout(() => setPhase("driving"), 1800);
    const t2 = setTimeout(() => setPhase("done"), durationMs - 400);
    const t3 = setTimeout(() => { setVisible(false); onDone?.(); }, durationMs);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [durationMs, onDone]);

  if (!visible) return null;

  const boxes = Math.min(Math.max(itemsCount, 1), 4);
  const isAr = lang === "ar";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "radial-gradient(ellipse at center, #1E293B 0%, #0F172A 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      animation: phase === "done" ? "tsFadeOut .35s ease forwards" : "tsFadeIn .25s ease",
      fontFamily: "'Tajawal',sans-serif", color: "#fff", overflow: "hidden",
    }}>
      <style>{TRUCK_CSS}</style>

      {/* ✅ علامة النجاح */}
      <div className={`ts-check ${phase === "loading" ? "show" : ""}`}>
        <svg viewBox="0 0 52 52" width="72" height="72">
          <circle cx="26" cy="26" r="25" fill="none" stroke="#10B981" strokeWidth="2" className="ts-check-circle" />
          <path fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M14 27l8 8 16-18" className="ts-check-mark" />
        </svg>
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 900, margin: "18px 0 6px", letterSpacing: 0.5 }}>
        {phase === "driving"
          ? (isAr ? "🚚 طلبك في الطريق!" : "🚚 Your order is on the way!")
          : (isAr ? "✅ تم تأكيد الطلب!" : "✅ Order Confirmed!")}
      </h2>
      {orderId && <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 8 }}>
        {isAr ? "رقم الطلب:" : "Order #"} <b style={{ color: "#C7D2FE" }}>{orderId}</b>
      </div>}

      {/* ════════ مشهد الشاحنة ════════ */}
      <div className="ts-scene">
        <div className={`ts-road ${phase === "driving" ? "moving" : ""}`} />

        {/* الطرود اللي بتطير داخل الشاحنة */}
        {phase === "loading" && Array.from({ length: boxes }).map((_, i) => (
          <div key={i} className="ts-box" style={{ animationDelay: `${i * 0.35}s` }}>
            <span>📦</span>
          </div>
        ))}

        <div className={`ts-truck ${phase === "driving" ? "driving" : "parked"}`}>
          {/* صندوق الشحن */}
          <div className="ts-cargo">
            <div className="ts-cargo-bg" />
            <div className="ts-cargo-slats" />
            {/* طرود مكدّسة بعد التحميل */}
            <div className="ts-packed">
              {Array.from({ length: boxes }).map((_, i) => (
                <span key={i} style={{ animationDelay: `${0.3 + i * 0.35}s` }}>📦</span>
              ))}
            </div>
          </div>

          {/* الكابينة (مقدمة الشاحنة) */}
          <div className="ts-cabin">
            <div className="ts-cabin-top" />
            <div className="ts-window" />
            <div className="ts-door-line" />
            <div className="ts-bumper" />
            <div className="ts-headlight" />
          </div>

          {/* العجلات */}
          <div className="ts-wheel ts-wheel-1"><div className="ts-wheel-rim" /></div>
          <div className="ts-wheel ts-wheel-2"><div className="ts-wheel-rim" /></div>
          <div className="ts-wheel ts-wheel-3"><div className="ts-wheel-rim" /></div>

          {/* عادم */}
          <div className="ts-exhaust" />
          {phase === "driving" && (
            <>
              <div className="ts-smoke" style={{ animationDelay: "0s" }} />
              <div className="ts-smoke" style={{ animationDelay: ".4s" }} />
              <div className="ts-smoke" style={{ animationDelay: ".8s" }} />
            </>
          )}
        </div>
      </div>

      <p style={{ marginTop: 22, fontSize: 13, color: "#94A3B8", maxWidth: 320, textAlign: "center", lineHeight: 1.7 }}>
        {phase === "driving"
          ? (isAr ? "بنتواصل معك قريباً عبر واتساب لتأكيد التوصيل." : "We'll contact you soon via WhatsApp.")
          : (isAr ? `يتم تحميل ${boxes} منتج${boxes > 1 ? "ات" : ""}...` : `Loading ${boxes} item${boxes > 1 ? "s" : ""}...`)}
      </p>
    </div>
  );
}

const TRUCK_CSS = `
@keyframes tsFadeIn { from{opacity:0} to{opacity:1} }
@keyframes tsFadeOut { to{opacity:0; transform: scale(.98)} }

/* ═══ المشهد ═══ */
.ts-scene {
  position: relative;
  width: 420px;
  height: 200px;
  max-width: 92vw;
  margin-top: 10px;
}
.ts-road {
  position: absolute;
  bottom: 8px; left: -20px; right: -20px;
  height: 6px;
  background: repeating-linear-gradient(90deg, #475569 0 26px, transparent 26px 40px);
  border-radius: 3px;
  opacity: .85;
}
.ts-road.moving { animation: tsRoadMove .3s linear infinite; }
@keyframes tsRoadMove { to { background-position: -40px 0; } }

/* ═══ الشاحنة ═══ */
.ts-truck {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 220px;
  height: 120px;
  transition: none;
}
.ts-truck.driving { animation: tsTruckDrive 2.4s cubic-bezier(.55,.05,.75,.2) forwards; }
@keyframes tsTruckDrive {
  0%   { transform: translateX(-50%) translateX(0); }
  15%  { transform: translateX(-50%) translateX(-6px); }
  100% { transform: translateX(-50%) translateX(140vw); }
}
.ts-truck.parked { animation: tsIdle 1.5s ease-in-out infinite; }
@keyframes tsIdle {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-2px); }
}

/* ═══ صندوق الشحن (الكارغو) ═══ */
.ts-cargo {
  position: absolute;
  left: 0; bottom: 18px;
  width: 140px; height: 86px;
}
.ts-cargo-bg {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, #FBBF24 0%, #F59E0B 55%, #D97706 100%);
  border: 2px solid #92400E;
  border-radius: 6px 10px 3px 3px;
  box-shadow: inset 0 -6px 0 rgba(0,0,0,.15), 0 6px 12px rgba(0,0,0,.35);
}
.ts-cargo-slats {
  position: absolute; inset: 8px 6px 10px 6px;
  background:
    repeating-linear-gradient(90deg, transparent 0 18px, rgba(0,0,0,.18) 18px 19px),
    linear-gradient(180deg, rgba(255,255,255,.08), transparent);
  border-radius: 4px;
  border: 1.5px solid #92400E;
}
.ts-packed {
  position: absolute; left: 14px; right: 14px; bottom: 14px;
  display: flex; gap: 4px; align-items: flex-end;
}
.ts-packed span {
  font-size: 22px; opacity: 0;
  animation: tsPackIn .35s cubic-bezier(.22,1.5,.35,1) forwards;
}
@keyframes tsPackIn {
  0%   { opacity: 0; transform: translateY(-40px) rotate(-20deg) scale(.4); }
  70%  { opacity: 1; transform: translateY(4px) rotate(6deg) scale(1.05); }
  100% { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
}

/* ═══ الكابينة ═══ */
.ts-cabin {
  position: absolute;
  right: 0; bottom: 18px;
  width: 80px; height: 74px;
}
.ts-cabin-top {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 40px;
  background: linear-gradient(180deg, #6366F1 0%, #4F46E5 100%);
  border: 2px solid #312E81;
  border-radius: 14px 22px 0 0;
  clip-path: polygon(30% 0, 100% 0, 100% 100%, 0 100%, 0 30%);
  box-shadow: inset -4px -4px 0 rgba(0,0,0,.15);
}
.ts-window {
  position: absolute;
  top: 10px; left: 18px;
  width: 42px; height: 22px;
  background: linear-gradient(135deg, #BAE6FD 0%, #7DD3FC 70%, #38BDF8 100%);
  border: 2px solid #312E81;
  border-radius: 6px 14px 2px 2px;
  clip-path: polygon(20% 0, 100% 0, 100% 100%, 0 100%, 0 30%);
  box-shadow: inset 2px 2px 0 rgba(255,255,255,.4);
}
.ts-cabin::after {
  content: "";
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; height: 40px;
  background: linear-gradient(180deg, #4F46E5 0%, #3730A3 100%);
  border: 2px solid #312E81;
  border-radius: 0 0 4px 10px;
  box-shadow: inset 0 -4px 0 rgba(0,0,0,.2);
}
.ts-door-line {
  position: absolute;
  bottom: 4px; left: 42px;
  width: 2px; height: 32px;
  background: #312E81;
  z-index: 2;
}
.ts-bumper {
  position: absolute;
  bottom: -4px; right: -2px;
  width: 22px; height: 8px;
  background: #1E293B;
  border-radius: 3px;
  z-index: 3;
}
.ts-headlight {
  position: absolute;
  bottom: 8px; right: -2px;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: radial-gradient(circle, #FEF3C7 0%, #F59E0B 100%);
  box-shadow: 0 0 8px #FBBF24, 0 0 16px rgba(251,191,36,.6);
  z-index: 4;
}

/* ═══ العجلات ═══ */
.ts-wheel {
  position: absolute;
  bottom: 0;
  width: 28px; height: 28px;
  background: radial-gradient(circle at 35% 35%, #475569 0%, #1E293B 55%, #0F172A 100%);
  border: 2px solid #0F172A;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0,0,0,.3);
}
.ts-wheel-rim {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 10px; height: 10px;
  background: #94A3B8;
  border-radius: 50%;
  box-shadow: 0 0 0 2px #1E293B;
}
.ts-wheel-1 { left: 12px; }
.ts-wheel-2 { left: 98px; }
.ts-wheel-3 { right: 10px; }
.ts-truck.driving .ts-wheel,
.ts-truck.parked .ts-wheel { animation: tsSpin .35s linear infinite; }
.ts-truck.parked .ts-wheel { animation-play-state: paused; }
@keyframes tsSpin { to { transform: rotate(360deg); } }

/* ═══ العادم + الدخان ═══ */
.ts-exhaust {
  position: absolute;
  right: -6px; bottom: 44px;
  width: 4px; height: 10px;
  background: #334155;
  border: 1px solid #0F172A;
  border-radius: 2px;
}
.ts-smoke {
  position: absolute;
  right: -8px; bottom: 52px;
  width: 10px; height: 10px;
  background: rgba(148,163,184,.6);
  border-radius: 50%;
  animation: tsSmoke 1s ease-out infinite;
  opacity: 0;
}
@keyframes tsSmoke {
  0%   { transform: translate(0,0) scale(.5); opacity: .6; }
  100% { transform: translate(20px,-30px) scale(1.8); opacity: 0; }
}

/* ═══ الطرود اللي بتطير من فوق ═══ */
.ts-box {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  animation: tsBoxDrop 1.6s cubic-bezier(.5,-.2,.3,1) both;
  z-index: 5;
}
.ts-box span { display: inline-block; animation: tsBoxSpin 1.6s linear both; }
@keyframes tsBoxDrop {
  0%   { top: -30px; left: 50%; opacity: 0; }
  15%  { opacity: 1; }
  60%  { top: 80px; left: calc(50% - 60px); }
  100% { top: 100px; left: calc(50% - 50px); opacity: 0; }
}
@keyframes tsBoxSpin {
  from { transform: rotate(0); }
  to   { transform: rotate(540deg); }
}

/* ═══ علامة الصح ═══ */
.ts-check {
  width: 72px; height: 72px;
  opacity: 0; transform: scale(.6);
  transition: opacity .3s, transform .3s;
}
.ts-check.show { opacity: 1; transform: scale(1); }
.ts-check-circle { stroke-dasharray: 166; stroke-dashoffset: 166; animation: tsDraw .7s ease-out forwards; }
.ts-check-mark { stroke-dasharray: 48; stroke-dashoffset: 48; animation: tsDraw .45s .6s ease-out forwards; }
@keyframes tsDraw { to { stroke-dashoffset: 0; } }

@media (max-width: 480px) {
  .ts-scene { width: 340px; height: 170px; }
  .ts-truck { width: 190px; height: 110px; }
  .ts-cargo { width: 120px; height: 74px; }
  .ts-cabin { width: 70px; height: 64px; }
  .ts-window { width: 36px; height: 20px; }
  .ts-wheel { width: 24px; height: 24px; }
  .ts-wheel-2 { left: 84px; }
}
`;
