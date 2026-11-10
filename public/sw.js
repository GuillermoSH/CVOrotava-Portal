/* Service worker del Portal (fase 1).
 *
 * Solo cachea recursos estáticos e inmutables (JS/CSS con hash de Next, iconos y logos).
 * NO cachea navegaciones, RSC, API ni nada con sesión de Supabase: así nunca se sirven
 * datos autenticados de otra sesión. La caché y deduplicación de lecturas se hará más
 * adelante con una estrategia de invalidación explícita (updateTag).
 */
const STATIC_CACHE = "cvo-static-v1";
const STATIC_PREFIXES = ["/_next/static/", "/icons/", "/logo/"];

self.addEventListener("install", () => {
  self.skipWaiting();
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
