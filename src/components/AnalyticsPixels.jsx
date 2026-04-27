import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSettings } from "../hooks/useSettings";

// Loads Meta (Facebook) Pixel, Google Analytics, TikTok Pixel when IDs exist.
// Fires a page view on every route change.

function loadFbPixel(id) {
  if (window.fbq || !id) return;
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  window.fbq("init", String(id));
  window.fbq("track", "PageView");
}

function loadGA(id) {
  if (window.gtag || !id) return;
  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s1);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", id);
}

function loadTikTok(id) {
  if (window.ttq || !id) return;
  /* eslint-disable */
  !(function (w, d, t) {
    w.TiktokAnalyticsObject = t;
    var ttq = (w[t] = w[t] || []);
    ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
    ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
    for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (t) { var e = ttq._i[t] || []; for (var n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
    ttq.load = function (e, n) {
      var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r;
      ttq._t = ttq._t || {}; ttq._t[e] = +new Date();
      ttq._o = ttq._o || {}; ttq._o[e] = n || {};
      var o = d.createElement("script"); o.type = "text/javascript"; o.async = !0; o.src = r + "?sdkid=" + e + "&lib=" + t;
      var a = d.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a);
    };
    ttq.load(id);
    ttq.page();
  })(window, document, "ttq");
  /* eslint-enable */
}

// Defer non-critical work until the browser is idle so analytics
// scripts don't compete with first paint / hydration on mobile.
const whenIdle = (fn) => {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) window.requestIdleCallback(fn, { timeout: 4000 });
  else setTimeout(fn, 2000);
};

export default function AnalyticsPixels() {
  const { settings } = useSettings();
  const location = useLocation();

  // Load pixels once the IDs arrive — deferred to idle to avoid blocking LCP
  useEffect(() => {
    whenIdle(() => {
      if (settings?.fbPixelId) loadFbPixel(settings.fbPixelId);
      if (settings?.gaMeasurementId) loadGA(settings.gaMeasurementId);
      if (settings?.tiktokPixelId) loadTikTok(settings.tiktokPixelId);
    });
  }, [settings?.fbPixelId, settings?.gaMeasurementId, settings?.tiktokPixelId]);

  // Fire page view on route change
  useEffect(() => {
    const path = location.pathname + location.search;
    if (window.fbq) try { window.fbq("track", "PageView"); } catch {}
    if (window.gtag && settings?.gaMeasurementId) {
      try { window.gtag("config", settings.gaMeasurementId, { page_path: path }); } catch {}
    }
    if (window.ttq) try { window.ttq.page(); } catch {}
  }, [location.pathname, location.search, settings?.gaMeasurementId]);

  return null;
}

// Optional event helpers to call from pages
export function trackEvent(name, params = {}) {
  try { if (window.fbq) window.fbq("track", name, params); } catch {}
  try { if (window.gtag) window.gtag("event", name, params); } catch {}
  try { if (window.ttq) window.ttq.track(name, params); } catch {}
}
