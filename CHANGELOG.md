# Changelog

All notable changes. Versions follow [SemVer](https://semver.org); each release is a git tag `vX.Y.Z`.
Weekly data refreshes are committed as `data: weekly AI events refresh …` and don't bump the version.

## v1.2.0 — 2026-11-03
- **Onboarding journey** on first launch: welcome, event formats + trusted badge, pick interests, timezone & trusted-only, notifications, Face ID / passcode, summary (swipeable, skippable, replay from Settings)
- **Passcode fallback**: 6-digit passcode (salted SHA-256) when Face ID fails, is cancelled or isn't available; lockout after 5 wrong tries; set / change / remove in Settings
- **Logs** in Settings: device activity (security, events, sync, settings, errors) with filters, export, clear; plus the weekly feed job's run history
- **Version history** in Settings, generated from CHANGELOG.md with the current version highlighted

## v1.1.0 — 2026-11-03
- Header refresh button: re-pulls the live events feed + app update, toast before and after
- Pinch-zoom and double-tap zoom disabled (viewport + iOS gesture guard, 16px inputs to stop focus-zoom)
- Calendar swipe left/right to change month / week / agenda range, with follow-finger drag and slide animation
- Release script keeps Version header comments in sync

## v1.0.0 — 2026-11-03
- Multi-page modular PWA: Calendar, Event detail, My events, Settings, Face ID lock
- Scheduler views: Month (dots on mobile + day panel), Week time-grid with overlap lanes and now-line, Agenda
- "Today across the globe" hero: counts by region, live-now / up-next strip
- Filters: format (virtual / on-demand / in-person / hybrid), region, topic, price, **trusted only**, search, keyboard shortcuts
- Attend / Interested, reminders (10m–2d), local + service-worker notifications, in-app fallback
- Add to calendar (.ics with alarms, Google Calendar), share / copy link, export all
- Passkey / Face ID / Touch ID lock (WebAuthn platform authenticator)
- All user data in cookies (chunked, with localStorage fallback on file://), export / import / erase
- White-label: name, tagline, logo mark / image, accent colour, footer; light / dark / auto theme
- Weekly updater (Mon 18:00 IST) pulling the next 3 months of AI events from the open confs.tech dataset + any iCal feeds — GitHub Actions cron and `node-cron` runner
- GitHub Pages deploy workflow
