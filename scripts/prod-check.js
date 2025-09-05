/* eslint-disable */
const { chromium } = require('playwright');

async function run() {
    const base = 'https://rickveloper.github.io/tonh-tracker-/';
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#map');
    const box = await (await page.$('#map')).boundingBox();
    const hasSize = !!(box && box.width > 0 && box.height > 0);
    // Wait a bit for tiles
    await page.waitForTimeout(1500);
    const tiles = await page.evaluate(() => document.querySelectorAll('.leaflet-tile-loaded, .leaflet-tile').length);
    // Drawer
    await page.click('#menuBtn');
    await page.waitForSelector('#drawer.open', { timeout: 7000 });
    const rosterCount = await page.locator('#rosterList .item').count();
    const providerText = await page.textContent('#status');

    // Health page
    await page.goto(base + 'health.html', { waitUntil: 'domcontentloaded' });
    const healthText = await page.textContent('#status');

    await browser.close();

    const fs = require('fs');
    const perf = JSON.parse(fs.readFileSync('performers.json', 'utf-8'));
    const first3 = perf.slice(0, 3).map(p => p.name);

    // SW cache version
    const sw = fs.readFileSync('sw.js', 'utf-8');
    const m = sw.match(/const CACHE = '([^']+)'/);
    const swCache = m ? m[1] : 'unknown';

    const out = {
        url: base,
        provider: /OpenSky|ADS-B/.test(providerText || '') ? (providerText.includes('ADS-B') ? 'ADS-B Exchange' : 'OpenSky') : 'OpenSky',
        rosterCount,
        first3,
        mapHasSize: hasSize,
        tilesLoaded: tiles,
        consoleErrors,
        health: healthText,
        swCache
    };
    console.log(JSON.stringify(out, null, 2));
}

run().catch(e => { console.error(e); process.exit(1); });


