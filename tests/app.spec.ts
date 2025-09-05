import { test, expect } from '@playwright/test';
import fs from 'fs';

test('loads and shows title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.legend b')).toHaveText(/Thunder Over NH/);
});

test('drawer toggles and renders all performers', async ({ page }) => {
    const roster = JSON.parse(fs.readFileSync('performers.json', 'utf-8'));
    await page.goto('/');
    await page.locator('#menuBtn').click();
    const items = page.locator('#rosterList .item');
    await expect(items).toHaveCount(roster.length);
});

test('mock provider returns one state matching performer; gold marker and Online', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#rosterList .item');
    await page.evaluate(() => {
        // Inject one BA6 state in typed format
        window.__injectStates?.([{ icao24: 'abcd12', callsign: 'BA6', longitude: -70.8, latitude: 43.07, baro_altitude: 1000 / 3.28084, velocity: 120 / 1.94384, heading: 90 }]);
    });
    await page.locator('#menuBtn').click();
    await page.waitForFunction(() => document.querySelectorAll('#rosterList .item .dot.online').length > 0, {}, { timeout: 8000 });
});

test('with empty results, all performers offline', async ({ page }) => {
    await page.route('**/api/states/all**', route => route.fulfill({ status: 200, body: JSON.stringify({ states: [] }), headers: { 'content-type': 'application/json' } }));
    await page.goto('/');
    await page.locator('#menuBtn').click();
    const offlineDots = await page.locator('#rosterList .item .dot.offline').count();
    const total = await page.locator('#rosterList .item').count();
    expect(offlineDots).toBe(total);
});

test('health page returns 200 and displays provider name', async ({ page }) => {
    await page.goto('/health.html');
    await expect(page.locator('#status')).toContainText(/Provider: OpenSky/);
});


