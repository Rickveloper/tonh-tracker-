const API = (b) => `https://opensky-network.org/api/states/all?lamin=${b.lamin}&lomin=${b.lomin}&lamax=${b.lamax}&lomax=${b.lomax}`;

export async function fetchStates(bbox) {
    const res = await fetch(API(bbox), { cache: 'no-store' });
    if (!res.ok) throw new Error('OpenSky HTTP ' + res.status);
    const data = await res.json();
    const states = Array.isArray(data.states) ? data.states : [];
    // Map OpenSky vector to typed objects
    return states.map(v => ({
        icao24: v[0],
        callsign: (v[1] || '').trim(),
        origin_country: v[2],
        last_contact: v[4],
        longitude: v[5],
        latitude: v[6],
        baro_altitude: v[7],
        on_ground: v[8],
        velocity: v[9],
        heading: v[10]
    }));
}


