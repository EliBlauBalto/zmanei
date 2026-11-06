# Zmanei (זמני היום)

Eli's personal zmanim site: a calmer replacement for myzmanim.com. **Not Gourmet Glatt.** Nothing here touches TIS,
the bot, the estate's scheduled tasks or any GG system, and none of their rules about stores apply. The general git
rules in `C:\Users\EliBlau\.claude\CLAUDE.md` still apply (author, explicit staging, no `push -q`, the `0 0` check).

- Live: **https://zmanei.vercel.app** (Vercel, Eli's personal hobby account, project `zmanei`). GitHub Pages copy still
  up at https://eliblaubalto.github.io/zmanei/ (no live ADS-B there: Pages can't run `api/`).
- Repo: https://github.com/EliBlauBalto/zmanei (public, branch `main`). Local: `C:\Users\EliBlau\zmanei`
- **A push to `main` is a deploy** to both Vercel (Git-connected, about 15 s) and Pages (about a minute). Check with
  `npx vercel ls zmanei --scope eliblaubaltos-projects` (top row `Ready`) and
  `gh api repos/EliBlauBalto/zmanei/pages/builds/latest --jq '.status + " " + .commit'`.
- Git author: `eliblau13@gmail.com` (set in this repo's local config).

Started 6 Nov 2026 in a TISReverse session. Eli's ask: "I hate myzmanim.com, it's fugly and obnoxious. Make a better
one. SOTA design. Use the Hebcal API and whatever else. Temporary domain for now; it may become my own thing."

## What it is
One static page, no build step, no framework. One optional serverless function (Vercel only):
| File | Role |
|---|---|
| `index.html` | Everything: CSS tokens, markup, and the app script (one IIFE at the bottom). |
| `icon.svg` | Favicon / home-screen icon (dusk sky, sun over the horizon). |
| `manifest.webmanifest` | Add-to-home-screen, with a "Flight" shortcut (`./#flight`). All paths are **relative** because Pages serves under `/zmanei/`. |
| `sw.js` | Service worker, network-first with cache fallback, so the page and last-seen times open offline (on a plane). Bump `CACHE` to force a clean cache. |
| `api/adsb.js` | Vercel function: proxies live ADS-B (adsb.lol, then adsb.fi) by callsign, because those feeds send no CORS header. On GitHub Pages it 404s and the page silently falls back to the schedule estimate. |

Features: next-zman hero with a live countdown; a sun dial (the sun's path drawn as the halachic day, with the 12
sha'os zmaniyos ticked and every zman marked); the full list with MGA and GRA side by side on Shema/Tefillah, an "All
opinions" toggle (16.1°, 19.8°, Baal HaTanya, 42/50/72 min, etc.); Shabbos card (parsha, candle lighting, havdalah);
the day's holidays/chips; Daf Yomi, Mishnah Yomi, Nach Yomi with Sefaria links; fast begins/ends, Chanukah and Yom Tov
candle times are pulled into the list automatically; Hebrew date switches at shkiah ("From shkiah tonight"); date
navigation; location search, ZIP codes, and "use my location"; settings for candle-lighting minutes and a 24-hour
clock. Location, settings and recents persist in localStorage; the URL carries the place and date so links share.

## Data sources (all keyless, all called from the browser)
| Need | Endpoint | Notes |
|---|---|---|
| Zmanim | `hebcal.com/zmanim?cfg=json&...&start=D&end=D+1` | Range form so tomorrow's alos and tonight's chatzos halailah come in one call. Times are rounded to the minute. |
| Holidays, candles, havdalah, fasts, daf/mishnah/nach | `hebcal.com/hebcal?v=1&cfg=json&geo=...&c=on&M=on&F=on&myomi=on&nyomi=on&lg=a...` | `lg=a` = Ashkenazi transliteration. Fast begins/ends arrive as `category:"zmanim"`; Chanukah candles as `category:"holiday"` with a time. |
| Shabbos card | `hebcal.com/shabbat?cfg=json&...&gy&gm&gd` | |
| Hebrew date | `hebcal.com/converter?cfg=json&date=D&g2h=1&strict=1` | Called for D and D+1 (after-shkiah date). |
| Place search | `geocoding-api.open-meteo.com/v1/search` | **Hebcal's `complete.php` has no CORS header**, so it can't be called from the browser. Open-Meteo ids are GeoNames ids, which Hebcal accepts as `geonameid`. If Hebcal lacks a town, the code falls back to lat/lng/tzid. |
| Reverse geocode for "my location" | `api.bigdatacloud.net/data/reverse-geocode-client` | Free client endpoint, CORS ok. |
| Flight route | `api.adsbdb.com/v0/callsign/{UA90 or UAL90}` | Free, keyless, CORS `*`. Gives origin/destination airports with lat/lng/elevation (ft). No schedule times: the user enters takeoff/landing. |
| Airport time zone | `api.open-meteo.com/v1/forecast?latitude&longitude&timezone=auto` | CORS ok. |
| Live position | `api/adsb?callsign=UAL90` (our proxy) -> `api.adsb.lol/v2/callsign/`, `opendata.adsb.fi/api/v2/callsign/` | Free, keyless, **no CORS**, hence the proxy. OpenSky (CORS locked to its own site) and airplanes.live (403, needs an emailed request) were ruled out 6 Nov. |

Times: the zmanim call uses `sec=1`. Hebcal's default rounds to the *nearest* minute, which showed Sof Zman Shema GRA
9:04:35 as 9:05 (late). `safeMin()` floors deadlines (`sofZman*`, `chatzot*`, `sunset`) and ceils everything else.
"Show seconds" in Settings shows exact times.

## Flight zmanim (`#flight`, the plane button)
The engine is between `flight-engine:start/end` markers and is pure JS (no DOM), so it can be tested in node.
- Path: great circle origin -> destination at constant speed over the user's takeoff/landing; climb 25 min, descend 30.
  A live fix (ADS-B or the phone's GPS, ignored within 20 km of either airport) becomes a waypoint and re-anchors the
  rest; ground speed > 150 kt gives an ETA.
- Each zman is found at the plane's **future** position: sun-angle zmanim (alos 16.1°, misheyakir 11.5°, tzeis 8.5°,
  netz/shkiah) are sign changes of the sun's elevation at `posAt(t)`; sha'os zmaniyos (Shema/Tefillah MGA+GRA,
  chatzos, mincha, plag) are fixed points `t = zman(posAt(t))` using sea-level sunrise/sunset at that spot; chatzos
  halailah = midpoint of that spot's shkiah and next netz.
- Netz/shkiah are shown twice: "Plane" (horizon dip at altitude, about 3.3° at 35,000 ft) and "Ground" (below).
- Check: a stationary 24 h "flight" at Cedarhurst (altitude 0) reproduced Hebcal `sec=1` within 1 s on every zman (6 Nov).
  Test by extracting the engine block into node (see git history of this file for the harness idea).

Location kinds in the code: `geoname` (`geonameid=`), `pos` (`latitude&longitude&tzid`), `zip` (`zip=`). The calendar
API additionally needs `geo=geoname|pos|zip`; `locQ(kind)` builds both forms. Israel (`cc === "IL"`) adds `i=on`.
Candle minutes: "Local custom" sends no `b`, so Hebcal applies its own city rules (e.g. Jerusalem 40).

## Design decisions
- The hero is the real sky: `body[data-phase]` = night / dawn / day / dusk from alos, netz, shkiah and 72-min tzeis,
  and the gradient, stars and moon follow it. The hero always carries light text; the rest of the page follows the
  viewer's light/dark theme through tokens on `:root`.
- Type: Newsreader (display, the big numerals), Frank Ruhl Libre (Hebrew), Hanken Grotesk (UI).
- The list's left rail is colored by sky phase at each zman's time (night → dawn → day → noon → dusk → night).
- Hebrew spans are `direction:rtl`, so spacing next to them uses `margin-left`, not `margin-inline-start`.
- SVG elements have no `.hidden` property: use the `vis(el, on)` helper (toggles the attribute). `[hidden]` is forced
  to `display:none!important` globally.
- Default location is Cedarhurst (geonameid 5111974) until the visitor picks one.

## Hosting history and options
- **Moved to Vercel on 6 Nov** at Eli's request ("vercel domain, not GitHub"). Account `eliblaubalto`
  (eliblau13@gmail.com), hobby plan, scope `eliblaubaltos-projects` (team `team_MKmZKzcoB51pzkJEimW21kwR`), project
  `zmanei`, Git-connected to this repo. The CLI on the dev box is logged in (device login Eli approved from his phone);
  `.vercel/` and `.env.local` (an OIDC token) are gitignored and must never be committed or printed.
- The claude.ai Vercel connector still 403s on that team scope; use the CLI (`npx vercel ...`) instead.
- GitHub Pages on a private repo isn't on Eli's plan, so the repo was made public (static code, no secrets).
- When Eli picks a real domain: attach it to the `zmanei` Vercel project (`npx vercel domains add`), then set DNS.

## Checking a change
1. Syntax: extract the script and `node --check` it:
   `sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > "$TEMP/zm.js" && node --check "$TEMP/zm.js"`
2. Look at it: headless Edge, no visible window:
   `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$TEMP/edge" --window-size=1280,1500 --virtual-time-budget=8000 --screenshot="$TEMP/shot.png" "file:///C:/Users/EliBlau/zmanei/index.html"`
   Headless Edge on Windows won't go narrower than about 500px, so a 400px shot is cropped, not overflowing.
   Add `--blink-settings=preferredColorScheme=1` for light mode.
3. Push, wait for Vercel `Ready` (and Pages `built <sha>`), load https://zmanei.vercel.app. Live proxy check:
   `curl "https://zmanei.vercel.app/api/adsb?callsign=JBU337"` (any airborne callsign).

## Open items / ideas (none promised to Eli yet)
- Real phone test (iPhone Safari, add to home screen) has not been done; only headless desktop/400px renders.
- Light theme was checked once on desktop; dark on desktop and narrow.
- Possible next: a week view / printable month, Israel-specific defaults, a custom domain, an offline cache.
