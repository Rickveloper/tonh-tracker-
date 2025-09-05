const drawer = document.getElementById('drawer');
const rosterList = document.getElementById('rosterList');

export function initDrawer() {
    document.getElementById('closeDrawer').onclick = () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); };
    document.getElementById('menuBtn').onclick = () => { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); };
}

export function updateRosterUI(roster, rosterState, onOpen) {
    rosterList.innerHTML = '';
    roster.forEach(perf => {
        const st = rosterState.get(perf.id) || { online: false, matches: [], lastSeen: null };
        const row = document.createElement('div');
        row.className = 'item';
        row.innerHTML = `
      <div class="dot ${st.online ? 'online' : 'offline'}"></div>
      <div style="flex:1">
        <div style="font-weight:600">${perf.name}</div>
        <div class="meta">${perf.type} • ${st.online ? (st.matches.length + ' contact(s)') : 'offline'}</div>
      </div>
      <button style="background:#1b2330;color:#ddd;padding:6px 10px;border-radius:8px;border:none">Open</button>
    `;
        row.querySelector('button').onclick = () => { onOpen(perf); drawer.classList.remove('open'); };
        rosterList.appendChild(row);
    });
}


