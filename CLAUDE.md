# Zmanei (זמני היום)

Eli's personal zmanim site: a calmer replacement for myzmanim.com. **Not Gourmet Glatt.** Nothing here touches TIS,
the bot, the estate's scheduled tasks or any GG system, and none of their rules about stores apply. The general git
rules in `C:\Users\EliBlau\.claude\CLAUDE.md` still apply (author, explicit staging, no `push -q`, the `0 0` check).

- Live: https://eliblaubalto.github.io/zmanei/ (temporary home; GitHub Pages)
- Repo: https://github.com/EliBlauBalto/zmanei (public, branch `main`). Local: `C:\Users\EliBlau\zmanei`
- **A push to `main` is a deploy.** Pages rebuilds in about a minute. Check with
  `gh api repos/EliBlauBalto/zmanei/pages/builds/latest --jq '.status + " " + .commit'`.
- Git author: `eliblau13@gmail.com` (set in this repo's local config).

Started 6 Nov 2026 in a TISReverse session. Eli's ask: "I hate myzmanim.com, it's fugly and obnoxious. Make a better
one. SOTA design. Use the Hebcal API and whatever else. Temporary domain for now; it may become my own thing."

## What it is
One static page, no build step, no framework, no backend:
| File | Role |
|---|---|
| `index.html` | Everything: CSS tokens, markup, and the app script (one IIFE at the bottom). |
| `icon.svg` | Favicon / home-screen icon (dusk sky, sun over the horizon). |
| `manifest.webmanifest` | Add-to-home-screen. All paths are **relative** because Pages serves under `/zmanei/`. |

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
- Vercel was the first choice (Eli's personal account `eliblau13@gmail.com`, username `eliblaubalto`, hobby plan,
  team `team_MKmZKzcoB51pzkJEimW21kwR` = scope `eliblaubaltos-projects`). The claude.ai Vercel connector returned
  **403: not authorized for that scope**, and the Vercel CLI isn't installed/logged in on the dev box. To move to
  Vercel: grant the connector access to that team (Vercel consent screen), or `npx vercel login`, then import the repo.
  `zmanei.vercel.app` was free on 6 Nov.
- GitHub Pages on a private repo isn't on Eli's plan, so the repo was made public (static code, no secrets).
- When Eli picks a real domain: add a `CNAME` file and set the DNS, or move to Vercel and attach it there.

## Checking a change
1. Syntax: extract the script and `node --check` it:
   `sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > "$TEMP/zm.js" && node --check "$TEMP/zm.js"`
2. Look at it: headless Edge, no visible window:
   `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$TEMP/edge" --window-size=1280,1500 --virtual-time-budget=8000 --screenshot="$TEMP/shot.png" "file:///C:/Users/EliBlau/zmanei/index.html"`
   Headless Edge on Windows won't go narrower than about 500px, so a 400px shot is cropped, not overflowing.
   Add `--blink-settings=preferredColorScheme=1` for light mode.
3. Push, wait for the Pages build to show `built <sha>`, load the live URL.

## Open items / ideas (none promised to Eli yet)
- Real phone test (iPhone Safari, add to home screen) has not been done; only headless desktop/400px renders.
- Light theme was checked once on desktop; dark on desktop and narrow.
- No seconds-precision (`sec=1`) yet; times are Hebcal's minute rounding. The footer tells people to leave a margin.
- Possible next: a week view / printable month, Israel-specific defaults, a custom domain, an offline cache.
