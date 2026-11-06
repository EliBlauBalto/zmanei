// Live ADS-B position for one callsign. The public feeds (adsb.lol, adsb.fi) send no CORS header,
// so the page can't call them directly; this runs on Vercel and passes the result through.
const FEEDS = ["https://api.adsb.lol/v2/callsign/", "https://opendata.adsb.fi/api/v2/callsign/"];

module.exports = async (req, res) => {
  const cs = String((req.query && req.query.callsign) || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (!cs) return res.status(400).json({ error: "callsign required" });
  for (const base of FEEDS) {
    try {
      const r = await fetch(base + cs, { headers: { "user-agent": "Zmanei/1.0 (zmanim flight view)" }, signal: AbortSignal.timeout(6000) });
      if (!r.ok) continue;
      const d = await r.json();
      const ac = (d.ac || []).map((a) => ({ hex: a.hex, flight: (a.flight || "").trim(), lat: a.lat, lon: a.lon, alt_baro: a.alt_baro, alt_geom: a.alt_geom, gs: a.gs, track: a.track, seen_pos: a.seen_pos }));
      res.setHeader("Cache-Control", "public, s-maxage=20, stale-while-revalidate=40");
      return res.status(200).json({ now: d.now || Date.now(), source: new URL(base).hostname, ac });
    } catch {}
  }
  return res.status(502).json({ error: "live feeds unavailable" });
};
