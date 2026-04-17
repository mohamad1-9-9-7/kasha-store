import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { fmt } from "../Theme";

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

const fmtDate = (ts) => { try { return new Date(ts).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

export default function AdminNotificationBell() {
  const [open, setOpen]           = useState(false);
  const [newOrders, setNewOrders] = useState([]);
  const [unread, setUnread]       = useState(0);
  const knownIds = useRef(null);
  const ref = useRef(null);

  useEffect(() => {
    if (localStorage.getItem("isAdmin") !== "true") return;

    const check = async () => {
      try {
        const orders = await apiFetch("/api/orders");
        const ids = new Set(orders.map((o) => o.id));

        if (knownIds.current === null) {
          knownIds.current = ids;
          return;
        }

        const fresh = orders.filter((o) => !knownIds.current.has(o.id));
        if (fresh.length > 0) {
          playBeep();
          setNewOrders((prev) => [...fresh, ...prev].slice(0, 15));
          setUnread((u) => u + fresh.length);
          if (Notification.permission === "granted") {
            fresh.forEach((o) => new Notification("🛍️ طلب جديد!", { body: `${o.customer?.name || "عميل"} — ${fmt(o.totals?.grandTotal || 0)}`, icon: "/icon-192.png" }));
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
          }
        }
        knownIds.current = ids;
      } catch {}
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => { setOpen((o) => !o); setUnread(0); };

  if (localStorage.getItem("isAdmin") !== "true") return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={handleOpen} style={{ position: "relative", background: "rgba(255,255,255,.08)", border: "none", borderRadius: 12, width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
        🔔
        {unread > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, background: "#EF4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, width: 320, background: "#fff", borderRadius: 18, boxShadow: "0 16px 48px rgba(0,0,0,.18)", border: "1px solid #F1F5F9", zIndex: 9999, overflow: "hidden", fontFamily: "'Tajawal',sans-serif" }}>
          <div style={{ padding: "14px 16px", background: "linear-gradient(135deg,#0F172A,#1E1B4B)", color: "#fff" }}>
            <div style={{ fontWeight: 900, fontSize: 15 }}>🔔 الإشعارات</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 2 }}>تتحدث كل 30 ثانية</div>
          </div>
          {newOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "#94A3B8" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
              <div style={{ fontSize: 14 }}>لا توجد إشعارات جديدة</div>
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {newOrders.map((o, i) => (
                <div key={o.id || i} style={{ padding: "12px 16px", borderBottom: "1px solid #F8FAFC", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🛍️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>طلب جديد: {o.id}</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{o.customer?.name} — {fmt(o.totals?.grandTotal || 0)}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{fmtDate(o.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #F1F5F9" }}>
            <a href="/admin-orders" style={{ display: "block", textAlign: "center", color: "#6366F1", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              عرض كل الطلبات ←
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
