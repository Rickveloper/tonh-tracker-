const drawer = document.getElementById('drawer');
const rosterList = document.getElementById('rosterList');
let saveOverridesCb = null;
let getOverridesCb = null;
let getUnmatchedCb = null;

export function initDrawer() {
    document.getElementById('closeDrawer').onclick = () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); };
    document.getElementById('menuBtn').onclick = () => { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); };
    ensureOverridesSection();
}

export function updateRosterUI(roster, rosterState, onOpen) {
    rosterList.innerHTML = '';
    const sorted = [...roster].sort((a, b) => {
        const sa = rosterState.get(a.id);
        const sb = rosterState.get(b.id);
        const oa = sa && sa.online ? 0 : 1;
        const ob = sb && sb.online ? 0 : 1;
        if (oa !== ob) return oa - ob;
        return a.name.localeCompare(b.name);
    });
    sorted.forEach(perf => {
        const st = rosterState.get(perf.id) || { online: false, matches: [], lastSeen: null };
        const row = document.createElement('div');
        row.className = 'item';
        row.innerHTML = `
      <div class="dot ${st.online ? 'online' : 'offline'}"></div>
      <div style="flex:1">
        <div style="font-weight:600">${perf.name}</div>
        <div class="meta">${perf.type} • ${st.online ? 'Online' : 'Offline'}</div>
      </div>
      <button style="background:#1b2330;color:#ddd;padding:6px 10px;border-radius:8px;border:none">Open</button>
    `;
        row.querySelector('button').onclick = () => { onOpen(perf); drawer.classList.remove('open'); };
        rosterList.appendChild(row);
    });
}

function ensureOverridesSection() {
    if (document.getElementById('overridesSection')) return;
    const list = drawer.querySelector('.list');
    const section = document.createElement('div');
    section.id = 'overridesSection';
    section.style.borderTop = '1px solid #222';
    section.style.marginTop = '10px';
    section.style.paddingTop = '10px';
    section.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin:6px 0 8px 0">
        <div style="font-weight:600">Local Overrides</div>
        <div style="display:flex;gap:6px">
          <button id="exportOverridesBtn" style="background:#1b2330;color:#ddd;padding:6px 10px;border-radius:8px;border:none">Export</button>
          <button id="importOverridesBtn" style="background:#1b2330;color:#ddd;padding:6px 10px;border-radius:8px;border:none">Import</button>
          <button id="copyUnmatchedBtn" title="Copy hex/callsigns from last poll" style="background:#1b2330;color:#ddd;padding:6px 10px;border-radius:8px;border:none">Copy last</button>
        </div>
      </div>
      <div class="small" style="margin-bottom:8px;color:#9aa4b2">Add extra hexes and callsign regex per performer. Stored in your browser.</div>
      <div id="overridesList"></div>
    `;
    // Place overrides section after the roster list, not inside it
    list.insertAdjacentElement('afterend', section);

    section.querySelector('#exportOverridesBtn').onclick = async () => {
        const overrides = getOverridesCb ? getOverridesCb() : {};
        const text = JSON.stringify(overrides, null, 2);
        try { await navigator.clipboard.writeText(text); toast('Overrides copied to clipboard'); } catch { alert(text); }
    };
    section.querySelector('#importOverridesBtn').onclick = async () => {
        const pasted = prompt('Paste overrides JSON');
        if (!pasted) return;
        try {
            const obj = JSON.parse(pasted);
            saveOverridesCb && saveOverridesCb(obj);
            toast('Overrides imported');
        } catch (e) {
            alert('Invalid JSON');
        }
    };
    section.querySelector('#copyUnmatchedBtn').onclick = async () => {
        const lines = (getUnmatchedCb ? getUnmatchedCb() : []).join('\n');
        try { await navigator.clipboard.writeText(lines); toast('Copied last unmatched callsigns/hex'); } catch { alert(lines || '(none)'); }
    };
}

function toast(message) {
    const pill = document.getElementById('status');
    if (pill) pill.textContent = message;
}

export function bindOverridesAccessors({ saveOverrides, getOverrides, getUnmatched }) {
    saveOverridesCb = saveOverrides;
    getOverridesCb = getOverrides;
    getUnmatchedCb = getUnmatched;
}

export function renderOverridesUI(roster, overrides) {
    ensureOverridesSection();
    const container = document.getElementById('overridesList');
    if (!container) return;
    container.innerHTML = '';
    roster.forEach(perf => {
        const ov = (overrides && overrides[perf.id]) || { hex: [], callsign_regex: [] };
        const row = document.createElement('div');
        row.className = 'ovr-item';
        row.style.border = '1px solid #1f2937';
        row.style.margin = '6px 0';
        row.innerHTML = `
          <div style="flex:1">
            <div style="font-weight:600">${perf.name}</div>
            <div class="small">Extra hex (comma-separated):</div>
            <input type="text" data-k="hex" value="${(ov.hex||[]).join(',')}" style="width:100%;background:#0b0f14;color:#ddd;border:1px solid #1f2937;border-radius:8px;padding:6px;margin:4px 0"/>
            <div class="small">Extra callsign regex (comma-separated):</div>
            <input type="text" data-k="callsign_regex" value="${(ov.callsign_regex||[]).join(',')}" style="width:100%;background:#0b0f14;color:#ddd;border:1px solid #1f2937;border-radius:8px;padding:6px;margin:4px 0"/>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-left:8px">
            <button data-action="save" style="background:#1b2330;color:#ddd;padding:6px 10px;border-radius:8px;border:none">Save</button>
            <button data-action="clear" style="background:#241b1b;color:#ddd;padding:6px 10px;border-radius:8px;border:none">Clear</button>
          </div>
        `;
        row.querySelector('[data-action="save"]').onclick = () => {
            const hexStr = row.querySelector('input[data-k="hex"]').value.trim();
            const csStr = row.querySelector('input[data-k="callsign_regex"]').value.trim();
            const next = { ...(getOverridesCb ? getOverridesCb() : {}), [perf.id]: {
                hex: hexStr ? hexStr.split(',').map(s => s.trim()).filter(Boolean) : [],
                callsign_regex: csStr ? csStr.split(',').map(s => s.trim()).filter(Boolean) : []
            }};
            saveOverridesCb && saveOverridesCb(next);
            toast('Saved overrides');
        };
        row.querySelector('[data-action="clear"]').onclick = () => {
            const next = { ...(getOverridesCb ? getOverridesCb() : {}) };
            delete next[perf.id];
            saveOverridesCb && saveOverridesCb(next);
            row.querySelector('input[data-k="hex"]').value = '';
            row.querySelector('input[data-k="callsign_regex"]').value = '';
            toast('Cleared');
        };
        container.appendChild(row);
    });
}


