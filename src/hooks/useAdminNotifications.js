import { useEffect, useRef } from "react";
import { apiFetch } from "../api";

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

export function useAdminNotifications(enabled = true) {
  const knownIds = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    if (localStorage.getItem("isAdmin") !== "true") return;

    const check = async () => {
      try {
        const orders = await apiFetch("/api/orders");
        const ids = new Set(orders.map((o) => o.id));

        if (knownIds.current === null) {
          knownIds.current = ids;
          return;
        }

        for (const order of orders) {
          if (!knownIds.current.has(order.id)) {
            playBeep();
            if (Notification.permission === "granted") {
              new Notification("🛍️ طلب جديد!", {
                body: `${order.customer?.name || "عميل"} — ${order.id}`,
                icon: "/icon-192.png",
              });
            } else if (Notification.permission !== "denied") {
              Notification.requestPermission().then((p) => {
                if (p === "granted") {
                  new Notification("🛍️ طلب جديد!", {
                    body: `${order.customer?.name || "عميل"} — ${order.id}`,
                    icon: "/icon-192.png",
                  });
                }
              });
            }
          }
        }

        knownIds.current = ids;
      } catch {}
    };

    check();
    const interval = setInterval(check, 30000); // كل 30 ثانية
    return () => clearInterval(interval);
  }, [enabled]);
}
