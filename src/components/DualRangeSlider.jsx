import React, { useCallback, useEffect, useRef, useState } from "react";

export default function DualRangeSlider({ min = 0, max = 1000, valueMin, valueMax, onChange }) {
  const [lo, setLo] = useState(Number.isFinite(+valueMin) ? +valueMin : min);
  const [hi, setHi] = useState(Number.isFinite(+valueMax) ? +valueMax : max);
  const trackRef = useRef(null);

  useEffect(() => { setLo(Number.isFinite(+valueMin) ? +valueMin : min); }, [valueMin, min]);
  useEffect(() => { setHi(Number.isFinite(+valueMax) ? +valueMax : max); }, [valueMax, max]);

  const commit = useCallback((l, h) => {
    const nl = Math.max(min, Math.min(l, h));
    const nh = Math.min(max, Math.max(h, l));
    onChange?.(nl, nh);
  }, [min, max, onChange]);

  const onLoChange = (v) => {
    const n = Math.min(Number(v), hi);
    setLo(n);
  };
  const onHiChange = (v) => {
    const n = Math.max(Number(v), lo);
    setHi(n);
  };

  const pctL = max > min ? ((lo - min) / (max - min)) * 100 : 0;
  const pctR = max > min ? ((hi - min) / (max - min)) * 100 : 100;

  return (
    <div style={{ padding: "8px 6px 4px", userSelect: "none" }}>
      <div ref={trackRef} style={{ position: "relative", height: 24 }}>
        <div style={{
          position: "absolute", top: "50%", transform: "translateY(-50%)", left: 0, right: 0,
          height: 4, borderRadius: 4, background: "#E2E8F0",
        }} />
        <div style={{
          position: "absolute", top: "50%", transform: "translateY(-50%)",
          left: `${pctL}%`, right: `${100 - pctR}%`,
          height: 4, borderRadius: 4, background: "linear-gradient(90deg,#6366F1,#8B5CF6)",
        }} />
        <input
          type="range" min={min} max={max} value={lo}
          onChange={e => onLoChange(e.target.value)}
          onMouseUp={() => commit(lo, hi)}
          onTouchEnd={() => commit(lo, hi)}
          style={rangeStyle}
        />
        <input
          type="range" min={min} max={max} value={hi}
          onChange={e => onHiChange(e.target.value)}
          onMouseUp={() => commit(lo, hi)}
          onTouchEnd={() => commit(lo, hi)}
          style={rangeStyle}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#64748B", fontWeight: 700 }}>
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
    </div>
  );
}

const rangeStyle = {
  position: "absolute", top: 0, left: 0, width: "100%", height: 24,
  appearance: "none", WebkitAppearance: "none", background: "transparent",
  pointerEvents: "none",
  margin: 0, padding: 0,
};

// حقن CSS للـ thumbs
if (typeof document !== "undefined" && !document.getElementById("drs-style")) {
  const s = document.createElement("style");
  s.id = "drs-style";
  s.textContent = `
    input[type=range]::-webkit-slider-thumb{
      -webkit-appearance:none;appearance:none;
      width:18px;height:18px;border-radius:50%;
      background:#fff;border:3px solid #6366F1;cursor:pointer;
      pointer-events:auto;box-shadow:0 2px 6px rgba(0,0,0,.2);
      margin-top:0;
    }
    input[type=range]::-moz-range-thumb{
      width:18px;height:18px;border-radius:50%;
      background:#fff;border:3px solid #6366F1;cursor:pointer;
      pointer-events:auto;box-shadow:0 2px 6px rgba(0,0,0,.2);
    }
    input[type=range]::-webkit-slider-runnable-track{background:transparent;height:4px}
    input[type=range]::-moz-range-track{background:transparent;height:4px}
  `;
  document.head.appendChild(s);
}
