/* Service worker del Portal.
 *
 * Solo cachea recursos estáticos e inmutables (JS/CSS con hash de Next, iconos y logos).
 * NO cachea navegaciones, RSC, API ni nada con sesión de Supabase: así nunca se sirven
 * datos autenticados de otra sesión. La caché y deduplicación de lecturas se hará más
 * adelante con una estrategia de invalidación explícita (updateTag).
 *
 * Sin red, las navegaciones muestran /offline.html (página estática, sin datos).
 */
const STATIC_CACHE = "cvo-static-v2";
const OFFLINE_URL = "/offline.html";
const STATIC_PREFIXES = ["/_next/static/", "/icons/", "/logo/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("cvo-") && k !== STATIC_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()),
    );
    return;
  }
  if (!STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      const res = await fetch(request);
      if (res.ok) cache.put(request, res.clone());
      return res;
    })(),
  );
});
