let LRef = null;
const markers = new Map(); // icao24 -> marker

export async function createMap(center) {
    LRef = window.L;
    if (!LRef) throw new Error('Leaflet not loaded');
    const map = LRef.map('map', { zoomControl: true }).setView([center.lat, center.lon], 12);
    LRef.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
    LRef.marker([center.lat, center.lon]).addTo(map).bindPopup('Pease ANGB (KPSM)');
    // ⌖ Pease recenter control
    const Recenter = LRef.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function () {
            const btn = LRef.DomUtil.create('button');
            btn.textContent = '⌖ Pease';
            btn.title = 'Recenter on KPSM';
            btn.style.background = '#111';
            btn.style.color = '#ddd';
            btn.style.padding = '6px 8px';
            btn.style.borderRadius = '10px';
            btn.style.border = 'none';
            btn.style.boxShadow = '0 2px 10px rgba(0,0,0,.4)';
            LRef.DomEvent.on(btn, 'click', (e) => { LRef.DomEvent.stop(e); map.setView([center.lat, center.lon], 12, { animate: true }); });
            return btn;
        }
    });
    map.addControl(new Recenter());
    return map;
}

function makeIcon(headingDeg, highlighted) {
    return LRef.divIcon({
        className: highlighted ? 'hl' : 'norm', html:
            `<div style="transform:rotate(${headingDeg || 0}deg);width:22px;height:22px">
       <svg viewBox="0 0 24 24" width="22" height="22" style="filter:drop-shadow(0 0 2px rgba(0,0,0,.5))">
         <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z" fill="${highlighted ? '#FFC107' : '#4DA3FF'}"></path>
       </svg>
     </div>` });
}

export function upsertMarker(map, state, highlighted) {
    const icao = state.icao24;
    const lat = state.latitude;
    const lon = state.longitude;
    const heading = state.heading;
    if (lat == null || lon == null) return;
    let m = markers.get(icao);
    const icon = makeIcon(heading, highlighted);
    if (!m) { m = LRef.marker([lat, lon], { icon }).addTo(map); markers.set(icao, m); }
    else { m.setLatLng([lat, lon]); m.setIcon(icon); }
    const altFt = state.baro_altitude != null ? Math.round(state.baro_altitude * 3.28084) : '—';
    const spdKt = state.velocity != null ? Math.round(state.velocity * 1.94384) : '—';
    const cs = state.callsign || '(no callsign)';
    m.bindPopup(`<b>${cs}</b><br/>ICAO24: ${icao}<br/>Alt: ${altFt} ft • Spd: ${spdKt} kt<br/>Hdg: ${heading ?? '—'}°`);
    m._lastSeen = Date.now();
}

export function purgeStale(map, maxAgeMs = 30000) {
    const now = Date.now();
    for (const [icao, m] of markers) if (now - (m._lastSeen || 0) > maxAgeMs) { map.removeLayer(m); markers.delete(icao); }
}


