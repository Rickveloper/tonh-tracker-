const infoCard = document.getElementById('infoCard');
const cardImg = document.getElementById('cardImg');
const cardTitle = document.getElementById('cardTitle');
const cardSub = document.getElementById('cardSub');
const cardNote = document.getElementById('cardNote');

export function showCard(perf, state) {
    cardImg.src = perf.image || '';
    cardImg.alt = perf.name;
    cardTitle.textContent = perf.name;
    cardSub.textContent = perf.type + (perf.role ? ` • ${perf.role}` : '');
    if (state) {
        const altFt = state.baro_altitude != null ? Math.round(state.baro_altitude * 3.28084) : '—';
        const spdKt = state.velocity != null ? Math.round(state.velocity * 1.94384) : '—';
        const hdg = state.heading ?? '—';
        const cs = (state.callsign || '(no callsign)').trim();
        cardNote.innerHTML = `Online • Callsign <b>${cs}</b> • Alt ${altFt} ft • Spd ${spdKt} kt • Hdg ${hdg}°`;
    } else cardNote.textContent = 'Offline (no live ADS-B in the box).';
    infoCard.style.display = 'flex';
}


