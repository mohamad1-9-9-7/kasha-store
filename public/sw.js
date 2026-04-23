const CACHE_NAME = "kashkha-v2";
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  let url;
  try { url = new URL(event.request.url); } catch { return; }

  // تخطَّ أي شي ليس من نفس الدومين (CDN، via.placeholder، analytics، ...)
  if (url.origin !== self.location.origin) return;

  // تخطَّ بعض المسارات الديناميكية
  if (url.pathname.startsWith("/api/")) return;

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
        .catch(() => cached || makeFallback()); // ⭐ لا يرجع undefined أبداً

      // دايماً نرجّع Response صالح
      return cached || fetchPromise;
    }).catch(() => makeFallback())
  );
});
