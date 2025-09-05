import { createMap, upsertMarker, purgeStale } from './map.js';
import { fetchStates as fetchOpenSky } from './providers/opensky.js';
import { fetchStates as fetchAdbx, isConfigured as adbxConfigured } from './providers/adbx.js';
import { initDrawer, updateRosterUI } from './ui/drawer.js';
import staticRoster from './performers.js';
import { showCard } from './ui/card.js';

const statusEl = document.getElementById('status');
const debugBtn = document.getElementById('debugBtn');

const KPSM = { lat: 43.0735, lon: -70.8207 };
const deltaLat = 0.30, deltaLon = 0.40;
const BBOX = { lamin: KPSM.lat - deltaLat, lamax: KPSM.lat + deltaLat, lomin: KPSM.lon - deltaLon, lomax: KPSM.lon + deltaLon };
const POLL_MS = 1000;

let showAllTraffic = false;
let roster = [];
const rosterState = new Map();
let mapRef = null;

const urlParams = new URLSearchParams(location.search);
const providerParam = urlParams.get('provider');

function getProvider() {
    if (providerParam === 'adbx') {
        if (!adbxConfigured()) {
            toast('ADS-B Exchange not configured. Falling back to OpenSky.');
            return { name: 'OpenSky', fetcher: fetchOpenSky };
        }
        return { name: 'ADS-B Exchange', fetcher: (bbox) => fetchAdbx(bbox) };
    }
    return { name: 'OpenSky', fetcher: fetchOpenSky };
}

function toast(message) {
    statusEl.textContent = message;
}

function regexMatchAny(str, arr) {
    if (!str || !arr || !arr.length) return false;
    const s = String(str).trim();
    return arr.some(p => {
        try {
            if (p.startsWith('^') && p.endsWith('$')) return new RegExp(p, 'i').test(s);
        } catch { }
        return s.toUpperCase().includes(String(p).toUpperCase());
    });
}
function matchStateToPerformer(st, perf) {
    const icao = st.icao24 || '';
    const callsign = (st.callsign || '').trim();
    if (perf.hex && perf.hex.includes(icao)) return true;
    if (perf.callsign_regex && regexMatchAny(callsign, perf.callsign_regex)) return true;
    return false;
}

function processStates(map, states) {
    roster.forEach(p => rosterState.set(p.id, { online: false, matches: [], lastSeen: null }));
    for (const st of states) {
        let matched = false;
        for (const perf of roster) {
            if (matchStateToPerformer(st, perf)) {
                const rs = rosterState.get(perf.id);
                rs.online = true; rs.matches.push(st); rs.lastSeen = Date.now();
                if (map) upsertMarker(map, st, true);
                matched = true;
            }
        }
        if (!matched && showAllTraffic && map) upsertMarker(map, st, false);
    }
    if (map) purgeStale(map);
    updateRosterUI(roster, rosterState, (perf) => {
        const rs = rosterState.get(perf.id);
        if (rs && rs.online && rs.matches.length) {
            const m = rs.matches[0];
            if (map) map.setView([m.latitude, m.longitude], 13, { animate: true });
            showCard(perf, m);
        } else {
            showCard(perf, null);
        }
    });
}

async function tick(map, provider) {
    try {
        statusEl.textContent = 'Updating…';
        const states = await provider.fetcher(BBOX);
        processStates(map, states);
        statusEl.textContent = `Live • ${new Date().toLocaleTimeString()}`;
    } catch (err) {
        console.warn(err);
        statusEl.textContent = 'Fetch failed (rate limit?). Retrying…';
    } finally {
        setTimeout(() => tick(map, provider), POLL_MS);
    }
}

function validateRoster(list) {
    if (!Array.isArray(list)) throw new Error('performers.json: not an array');
    for (const p of list) {
        if (!p.id || !p.name) throw new Error('performers.json: missing id/name');
        if (!Array.isArray(p.callsign_regex) || !Array.isArray(p.hex)) throw new Error('performers.json: callsign_regex/hex must be arrays');
    }
}

async function boot() {
    // Drawer and debug (render can happen before map exists)
    initDrawer();
    debugBtn.onclick = () => {
        showAllTraffic = !showAllTraffic;
        debugBtn.textContent = showAllTraffic ? 'Hide all traffic' : 'Show all traffic';
    };

    // Provider
    const provider = getProvider();
    statusEl.textContent = `Loading • ${provider.name}`;

    // Roster first so UI is populated early for tests and UX
    try {
        // Prefer dynamic JSON but fall back to embedded list for reliability
        let list = staticRoster;
        try {
            const res = await fetch('./performers.json', { cache: 'no-store' });
            const parsed = await res.json();
            validateRoster(parsed);
            list = parsed;
        } catch (e) {
            console.warn('performers.json invalid; using embedded roster', e);
            toast('performers.json invalid (using embedded)');
        }
        roster = list;
        list.forEach(p => rosterState.set(p.id, { online: false, matches: [], lastSeen: null }));
        updateRosterUI(roster, rosterState, (perf) => showCard(perf, null));
        // Test hook to inject states without network (define early so tests can call before map is ready)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.__injectStates = (typedStates) => {
            try { processStates(mapRef, typedStates || []); statusEl.textContent = `Live • ${new Date().toLocaleTimeString()}`; } catch { }
        };
    } catch (e) {
        console.error('performers.json failed', e);
        toast('performers.json error. Continuing with empty roster.');
    }

    // Map after roster is shown
    const map = await createMap(KPSM);
    mapRef = map;

    // Start polling before registering SW to avoid any race in tests
    tick(map, provider);

    // Service worker (registered after first tick)
    if ('serviceWorker' in navigator) {
        try { await navigator.serviceWorker.register('./sw.js'); } catch { }
    }
}

boot();


