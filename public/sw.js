const SW_VERSION = "camverse-pwa-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SW_VERSION)
      .then((cache) => cache.addAll(["/"]))
      .finally(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(SW_VERSION);
        const cached = await cache.match("/");
        return cached || Response.error();
      }),
    );
  }
});
