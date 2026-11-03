# Aether — AI Event Calendar

A white-label, installable AI event calendar: every **virtual, on-demand, hybrid and in-person** AI event across the globe, with a **trusted-only** filter, reminders, push notifications and a **Face ID / passkey** lock. Modern minimalist UI (Inter 200–400, hairline borders, light/dark).

> Live site (after enabling Pages): `https://selvan20005.github.io/AIEVENTCALENDAR/`

## Pages (modular — no single giant HTML)

| Page | File | Logic |
|---|---|---|
| Calendar (month / week / agenda) | `index.html` | `js/pages/index.js`, `js/calendar.js` |
| Event detail | `event.html?id=…` | `js/pages/event.js` |
| My events (going / interested / past) | `my-events.html` | `js/pages/my-events.js` |
| Settings + white-label | `settings.html` | `js/pages/settings.js` |
| Face ID / passkey lock | `login.html` | `js/pages/login.js` |

Shared modules: `store.js` (cookies), `state.js` (brand + prefs), `data.js` (feed + samples + filters), `time.js` (timezones), `auth.js` (WebAuthn), `notify.js` (reminders), `plans.js`, `ics.js`, `actions.js`, `ui.js` (shell, sheets, toasts), `components.js`, `icons.js`.

## Run locally

```bash
npm install
npm start            # http://localhost:5173  (passkeys + service worker work on localhost)
```
Opening the HTML via `file://` works for browsing, but cookies/passkeys/notifications need `http://localhost` or HTTPS.

## Deploy (GitHub Pages)
Repo → **Settings → Pages → Source: GitHub Actions**. The `Deploy to GitHub Pages` workflow publishes on every push and after each weekly refresh.

## Weekly data refresh — Mondays 6:00 PM IST
`scripts/update-events.mjs` collects AI events for **today → +3 months** and writes `data/events.json`.

- **Sources:** the open, PR-reviewed [confs.tech dataset](https://github.com/tech-conferences/conference-data) (marked *trusted*), plus any public iCal feeds you add to `config/sources.json` (Luma, Meetup, lab/university calendars). Set `"trusted": true` per feed.
- **Scheduler (free & open source):**
  - GitHub Actions cron `30 12 * * 1` (= Mon 18:00 Asia/Kolkata) in `.github/workflows/update-events.yml` — commits only when data changed. Run any time via *Actions → Weekly AI events refresh → Run workflow*.
  - Self-hosted alternative with [`node-cron`](https://github.com/node-cron/node-cron): `npm run scheduler` (`--now` to run immediately).
- Manual: `npm run update-events` (`--days 92`, `--dry`).

## Features
- Today-across-the-globe hero: events per region, live now, next 7 days
- Format chips, region / topic / price filters, **Trusted only** toggle, search (`/`), shortcuts `t` `←` `→` `m` `w` `a`
- Attend / Interested, reminders 10 min → 2 days, `.ics` export with alarms, Google Calendar, Web Share
- Notifications: service-worker notifications + in-app toasts; reminders scheduled on open and caught up on next launch. **iPhone:** Safari → Share → *Add to Home Screen*, open from the icon, enable notifications (iOS 16.4+). `sw.js` already handles `push` events if you add a push server (VAPID) later.
- **Face ID / Touch ID / Windows Hello** via WebAuthn platform passkeys. Prototype note: there's no server verifying signatures, so it's a device-local privacy lock, not account auth.
- **All data in cookies** (chunked JSON, ~4 KB each, scoped to the site path); export / import / erase in Settings.
- **White-label:** name, tagline, logo mark or image URL, accent colour, footer, theme. Export as `brand.json`. (The PWA install name in `manifest.webmanifest` is static — edit it for a permanent rebrand.)
- Sample events: recurring virtual sessions + on-demand courses fill the calendar between conferences; flagged **Sample**, can be hidden in Settings / Filters.

## Versioning
SemVer, `VERSION` file, `CHANGELOG.md`, git tags `vX.Y.Z`.
```bash
npm run release -- minor "Added X" "Fixed Y"   # bumps VERSION, js/version.js, sw.js cache, package.json, changelog
git commit -am "release: vX.Y.Z" && git tag vX.Y.Z && git push --follow-tags
```
