// Network first with the cache as a fallback: always fresh online, and the last-seen page and times still open on a plane.
// Slow hosts (plane wi-fi can stall a request for 30 s) get 3.5 s before a cached copy is used.
const CACHE = "zmanei-v14";
const SHELL = ["./", "./index.html", "./icon.svg", "./apple-touch-icon.png", "./manifest.webmanifest"];
const SLOW = new Set(["www.hebcal.com", "api.open-meteo.com", "geocoding-api.open-meteo.com"]);

self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.pathname.includes("/api/")) return;                       // live data is never served stale
  const ours = u.origin === self.location.origin;
  const keep = ours || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname) || u.hostname === "cdn.jsdelivr.net" || SLOW.has(u.hostname);
  if (!keep) return;
  const cached = () => caches.match(r, { ignoreSearch: ours && r.mode === "navigate" }).then((m) => m || (r.mode === "navigate" ? caches.match("./") : null));
  const net = fetch(r).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); }
    return res;
  });
  if (!SLOW.has(u.hostname)) { e.respondWith(net.catch(() => cached().then((m) => m || Response.error()))); return; }
  e.respondWith(new Promise((resolve) => {
    let done = false;
    const finish = (res) => { if (!done && res) { done = true; resolve(res); } };
    const t = setTimeout(() => cached().then(finish), 3500);
    net.then((res) => { clearTimeout(t); finish(res); })
      .catch(() => { clearTimeout(t); cached().then((m) => finish(m || Response.error())); });
  }));
});
