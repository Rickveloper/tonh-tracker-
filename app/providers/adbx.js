// Stub provider for ADS-B Exchange
// To enable, set localStorage key 'adbx_key' to your API key, then use ?provider=adbx

export function isConfigured() {
    return !!localStorage.getItem('adbx_key');
}

export async function fetchStates(bbox) {
    const key = localStorage.getItem('adbx_key');
    if (!key) throw new Error('ADBX key not configured');
    // Note: Real ADBX endpoints require a paid plan; this is illustrative only
    const url = `https://api.adsbexchange.com/v2/lat/${bbox.lamin}/${bbox.lamax}/lon/${bbox.lomin}/${bbox.lomax}`;
    const res = await fetch(url, { headers: { 'X-Api-Key': key }, cache: 'no-store' });
    if (!res.ok) throw new Error('ADBX HTTP ' + res.status);
    const data = await res.json();
    const ac = Array.isArray(data.ac) ? data.ac : [];
    return ac.map(a => ({
        icao24: (a.icao || '').toLowerCase(),
        callsign: (a.call || '').trim(),
        origin_country: a.country || '',
        last_contact: a.updated || 0,
        longitude: a.lon,
        latitude: a.lat,
        baro_altitude: a.alt_baro,
        on_ground: a.gs === 0,
        velocity: a.gs,
        heading: a.track
    }));
}


