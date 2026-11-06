// Network first, cache as the fallback: always fresh online, and the last-seen page and times still open on a plane.
const CACHE = "zmanei-v3";
const SHELL = ["./", "./index.html", "./icon.svg", "./apple-touch-icon.png", "./manifest.webmanifest"];

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
  const keep = ours || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname) || u.hostname === "www.hebcal.com" || u.hostname === "api.open-meteo.com";
  if (!keep) return;
  e.respondWith(
    fetch(r).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: ours && r.mode === "navigate" }).then((m) => m || (r.mode === "navigate" ? caches.match("./") : null)).then((m) => m || Response.error()))
  );
});
