// Lightweight error reporter — no external SDKs, no bundle bloat.
// If VITE_ERROR_WEBHOOK_URL is set (e.g. a Discord/Slack/Make/Zapier webhook),
// errors are POSTed there. Otherwise they only land in the browser console.
// Set VITE_ERROR_WEBHOOK_URL=https://discord.com/api/webhooks/... in your env.

const WEBHOOK = import.meta.env.VITE_ERROR_WEBHOOK_URL || "";

let installed = false;

function buildPayload(error, extra = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    message: err.message?.slice(0, 500) || "unknown",
    stack: err.stack?.split("\n").slice(0, 6).join("\n") || "",
    url: typeof location !== "undefined" ? location.href : "",
    ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : "",
    ts: new Date().toISOString(),
    ...extra,
  };
}

export function reportError(error, extra = {}) {
  const payload = buildPayload(error, extra);
  // Always log locally so devs can see in console
  console.warn("[reportError]", payload);
  if (!WEBHOOK) return;
  try {
    // sendBeacon survives page unload; falls back to fetch
    const body = JSON.stringify({ content: `🐛 ${payload.message}`, payload });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(WEBHOOK, new Blob([body], { type: "application/json" }));
    } else {
      fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {/* never let the reporter itself throw */}
}

export function installGlobalErrorHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    reportError(e.error || e.message, { source: "window.error", filename: e.filename, lineno: e.lineno, colno: e.colno });
  });
  window.addEventListener("unhandledrejection", (e) => {
    reportError(e.reason, { source: "unhandledrejection" });
  });
}
