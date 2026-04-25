const CACHE_NAME = "kashkha-v4";
const STATIC_ASSETS = [
  "/",
  "/home",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// استجابة fallback صغيرة عشان ما يطلع Undefined
function makeFallback() {
  return new Response("", { status: 503, statusText: "Offline" });
}

// نحدد نوع الملف: HTML/JS/CSS = network-first (عشان التحديثات تبين فوراً)
// باقي الأصول (صور، خطوط) = cache-first (للسرعة)
const isAppShell = (url) => {
  const p = url.pathname;
  if (p === "/" || p === "/home" || p.endsWith(".html")) return true;
  if (p.endsWith(".js") || p.endsWith(".css")) return true;
  return false;
};

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  let url;
  try { url = new URL(event.request.url); } catch { return; }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Network-first للـ HTML/JS/CSS — التحديثات تبين فوراً بعد كل deploy
  if (isAppShell(url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== "opaque") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || makeFallback()))
    );
    return;
  }

  // Cache-first لباقي الأصول (صور، خطوط) — سرعة
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== "opaque") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached || makeFallback());
      return cached || fetchPromise;
    }).catch(() => makeFallback())
  );
});
