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

Provider banner in-app shows the selected provider name and bbox bounds. API responses are never cached by the service worker.

## Local Overrides

In the drawer, use Local Overrides to add/remove extra hex codes or callsign regex per performer. Overrides persist to `localStorage` and are merged at runtime with `performers.json`.

- Export overrides: copies JSON to clipboard
- Import overrides: paste JSON to replace current overrides
- Debug: "Copy last" button copies unmatched callsigns/hex from the last poll

## Rate limiting and backoff

On 429/5xx or fetch failures, the app uses exponential backoff starting at 5s, doubling up to a max of 30s, and resets on success. The status pill shows: `Rate-limited, retrying in Ns`.

## Data sources: pros/cons

- OpenSky `/api/states/all` (no key):
  - Pros: Free, simple, bbox query
  - Cons: Rate-limited, incomplete military traffic
- ADS-B Exchange (key, often paid):
  - Pros: Broad coverage, richer data
  - Cons: Paid for reliable API, TOS applies

## Images and credits

See `CREDITS.md`. Images are optimized public-domain/CC where available.
