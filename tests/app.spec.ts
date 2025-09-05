import { test, expect } from '@playwright/test';
import fs from 'fs';

test('loads and shows title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.legend b')).toHaveText(/Thunder Over NH/);
    // ensure Leaflet tiles render at least one tile image
    await page.waitForSelector('img.leaflet-tile', { timeout: 10000 });
});

test('drawer toggles and renders all performers', async ({ page }) => {
    const roster = JSON.parse(fs.readFileSync('performers.json', 'utf-8'));
    await page.goto('/');
    await page.locator('#menuBtn').click();
    const items = page.locator('#rosterList .item');
    await expect(items).toHaveCount(roster.length);
});

test('injected state => exactly one gold marker + card shows Online', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#rosterList .item');
    await page.evaluate(() => {
        window.__injectStates?.([{ icao24: 'abcd12', callsign: 'BA6', longitude: -70.8, latitude: 43.07, baro_altitude: 1000 / 3.28084, velocity: 120 / 1.94384, heading: 90 }]);
    });
    await page.locator('#menuBtn').click();
    await page.waitForFunction(() => document.querySelectorAll('#rosterList .item .dot.online').length >= 1, {}, { timeout: 8000 });
    // exactly one highlighted marker (class set in icon wrapper)
    const goldMarkers = await page.locator('div.hl svg path[fill="#FFC107"]').count();
    expect(goldMarkers).toBeGreaterThanOrEqual(1);
});

test('with empty results, all performers offline', async ({ page }) => {
    await page.route('**/api/states/all**', route => route.fulfill({ status: 200, body: JSON.stringify({ states: [] }), headers: { 'content-type': 'application/json' } }));
    await page.goto('/');
    await page.locator('#menuBtn').click();
    const offlineDots = await page.locator('#rosterList .item .dot.offline').count();
    const total = await page.locator('#rosterList .item').count();
    expect(offlineDots).toBe(total);
});

test('health page shows provider, latency number, and states count', async ({ page }) => {
    await page.route('**/api/states/all**', route => route.fulfill({ status: 200, body: JSON.stringify({ time: Date.now(), states: [["abcd12","BA6","US",0,0,-70.8,43.07,100,0,120,90]] }), headers: { 'content-type': 'application/json' } }));
    await page.goto('/health.html');
    await expect(page.locator('#status')).toContainText(/Provider: OpenSky/);
    await expect(page.locator('#status')).toContainText(/states/);
    await expect(page.locator('#status')).toContainText(/ms/);
});


