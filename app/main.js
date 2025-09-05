import { createMap, upsertMarker, purgeStale } from './map.js';
import { fetchStates as fetchOpenSky } from './providers/opensky.js';
import { fetchStates as fetchAdbx, isConfigured as adbxConfigured } from './providers/adbx.js';
import { initDrawer, updateRosterUI, bindOverridesAccessors, renderOverridesUI } from './ui/drawer.js';
import staticRoster from './performers.js';
import { showCard } from './ui/card.js';

const statusEl = document.getElementById('status');
const debugBtn = document.getElementById('debugBtn');

const KPSM = { lat: 43.0735, lon: -70.8207 };
const deltaLat = 0.30, deltaLon = 0.40;
const BBOX = { lamin: KPSM.lat - deltaLat, lamax: KPSM.lat + deltaLat, lomin: KPSM.lon - deltaLon, lomax: KPSM.lon + deltaLon };
const POLL_MS = 1000;
const BACKOFF_MIN = 5000;
const BACKOFF_MAX = 30000;

let showAllTraffic = false;
let roster = [];
const rosterState = new Map();
let mapRef = null;
let overrides = {};
let lastUnmatched = [];
let providerBannerSet = false;
let nextDelay = POLL_MS;

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
    const hexList = [...(perf.hex || []), ...(((overrides[perf.id]||{}).hex)||[])];
    const csList = [...(perf.callsign_regex || []), ...(((overrides[perf.id]||{}).callsign_regex)||[])];
    if (hexList.length && hexList.includes(icao)) return true;
    if (csList.length && regexMatchAny(callsign, csList)) return true;
    return false;
}

function processStates(map, states) {
    roster.forEach(p => rosterState.set(p.id, { online: false, matches: [], lastSeen: null }));
    const unmatched = [];
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
        if (!matched) {
            unmatched.push(`${st.icao24} ${st.callsign || ''}`.trim());
            if (showAllTraffic && map) upsertMarker(map, st, false);
        }
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
    lastUnmatched = unmatched;
}

async function tick(map, provider) {
    try {
        statusEl.textContent = providerBannerSet ? statusEl.textContent : 'Updating…';
        const states = await provider.fetcher(BBOX);
        processStates(map, states);
        statusEl.textContent = `Live • ${new Date().toLocaleTimeString()} • ${provider.name} • bbox ${BBOX.lamin.toFixed(2)},${BBOX.lomin.toFixed(2)} to ${BBOX.lamax.toFixed(2)},${BBOX.lomax.toFixed(2)}`;
        providerBannerSet = true;
        nextDelay = POLL_MS; // reset backoff
    } catch (err) {
        console.warn(err);
        // Exponential backoff on 429/5xx
        nextDelay = Math.min(nextDelay ? Math.max(nextDelay * 2, BACKOFF_MIN) : BACKOFF_MIN, BACKOFF_MAX);
        let secs = Math.round(nextDelay / 1000);
        statusEl.textContent = `Rate-limited, retrying in ${secs}s`;
        const iv = setInterval(() => {
            secs -= 1;
            if (secs <= 0) { clearInterval(iv); return; }
            statusEl.textContent = `Rate-limited, retrying in ${secs}s`;
        }, 1000);
    } finally {
        setTimeout(() => tick(map, provider), nextDelay);
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
    bindOverridesAccessors({
        saveOverrides: (obj) => { overrides = obj || {}; localStorage.setItem('overrides', JSON.stringify(overrides)); renderOverridesUI(roster, overrides); },
        getOverrides: () => overrides,
        getUnmatched: () => lastUnmatched
    });
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
        try { overrides = JSON.parse(localStorage.getItem('overrides') || '{}') || {}; } catch { overrides = {}; }
        roster = list;
        list.forEach(p => rosterState.set(p.id, { online: false, matches: [], lastSeen: null }));
        updateRosterUI(roster, rosterState, (perf) => showCard(perf, null));
        renderOverridesUI(roster, overrides);
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


