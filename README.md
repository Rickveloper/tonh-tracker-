# Thunder Over NH — Performers PWA

Minimal iPhone-friendly PWA showing only Thunder Over NH 2025 performers on a Leaflet map.

## Develop

- npm install
- npm run dev
- Open http://localhost:5173

## Test

- npm test

Runs Playwright with a static server.

## Deploy

GitHub Pages workflow uploads repo root. Service worker cache key `tonh-v4` forces refresh per commit.

## Provider selection

Default provider: OpenSky Network. Use `?provider=adbx` to attempt ADS-B Exchange; if not configured, it will fall back and show a toast. To configure ADBX, set `localStorage.adbx_key = 'YOUR_KEY'`.

## Data sources: pros/cons

- OpenSky `/api/states/all` (no key):
  - Pros: Free, simple, bbox query
  - Cons: Rate-limited, incomplete military traffic
- ADS-B Exchange (key, often paid):
  - Pros: Broad coverage, richer data
  - Cons: Paid for reliable API, TOS applies

## Images and credits

See `CREDITS.md`. Images are optimized public-domain/CC where available.
