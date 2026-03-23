const CACHE_NAME = "kitetrip-v3";
const API_CACHE_NAME = "kitetrip-api-v1";
const API_CACHE_MAX_AGE_MS = 3 * 60 * 60 * 1000; // 3 hours

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // API requests: cache-first with 3-hour TTL
  if (url.includes("api.open-meteo.com") || url.includes("marine-api.open-meteo.com")) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          const cachedAt = cached.headers.get("x-sw-cached-at");
          if (cachedAt && Date.now() - Number(cachedAt) < API_CACHE_MAX_AGE_MS) {
            return cached;
          }
        }
        // Fetch fresh, stamp with cache time
        const response = await fetch(event.request);
        if (response.ok) {
          const headers = new Headers(response.headers);
          headers.set("x-sw-cached-at", String(Date.now()));
          const stamped = new Response(await response.clone().blob(), {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
          cache.put(event.request, stamped);
        }
        return response;
      })
    );
    return;
  }

  // App assets: network-first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
