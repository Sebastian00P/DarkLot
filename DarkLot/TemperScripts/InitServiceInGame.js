// ==UserScript==
// @name          DarkLog
// @namespace     http://tampermonkey.net/
// @version       2025-06-23.02
// @description   RAWLOG + lootlog: pełny RAWLOG, fallback live/parsing, natychmiastowe wysyłanie lootów oraz sprawdzanie sesji
// @author        Dark-Sad
// @match         https://lelwani.margonem.pl/*
// @match         http://*.margonem.pl/
// @match         https://*.margonem.pl/
// @grant         none
// @run-at        document-idle
// ==/UserScript==

(function () {
    'use strict';

    const API_URL_LOOT = 'https://localhost:7238/api/lootlog/add';

    window._dl_teamParsedFW = null;
    window._dl_lastWarriorsListTurn = null;
    window._dl_sentItemHids = window._dl_sentItemHids || new Set();
    const sentLootEvents = new Set();

    function log(...a) { console.log('[DL]', ...a); }
    function warn(...a) { console.warn('[DL][WARN]', ...a); }
    function dbg(...a) { console.debug('[DL][DEBUG]', ...a); }

    function resetDLCache() {
        window._dl_lastWarriorsListTurn = null;
        window._dl_sentItemHids = new Set();
        sentLootEvents.clear();
        dbg('Loot cache reset');
    }

    function buildLootDto(items, { party = {}, owners = {}, npcs = [] } = {}) {
        const cached = window._dl_lastWarriorsListTurn || {};
        const parsedFW = window._dl_teamParsedFW || {};

        // połącz wszelkie źródła uczestników
        const participants = {
            ...party,
            ...owners,
            ...Object.fromEntries(
                Object.entries(parsedFW).map(([k, v]) => [k, {
                    name: v.name, lvl: v.lvl, prof: v.prof, icon: v.icon, npc: v.npc || 0
                }])
            ),
            ...cached
        };

        const mobParts = [];
        const lootUsers = [];

        // gracze
        Object.entries(participants).forEach(([key, p]) => {
            const id = Number(key);
            if (isNaN(id) || id < 0) return;
            const name = p.nick || p.name;
            if (!name) return;
            const lvl = p.lvl || 0, prof = p.prof || '';
            const icon = p.icon ? window.CFG.a_opath + p.icon.replace(/^\//, '') : '';
            lootUsers.push({
                GameUserId: String(id),
                Nick: name,
                Level: lvl,
                ClassAbbr: prof,
                AvatarUrl: icon
            });
        });

        // moby przez parsed.npcs_del
        npcs.forEach(npc => {
            const entry = Object.values(parsedFW).find(f => f.originalId === npc.id);
            if (entry) {
                const lvl = entry.lvl || 0, prof = entry.prof || '';
                mobParts.push(`${entry.name}(${lvl}${prof})`);
            }
        });

        // fallback — jeśli nie ma mobParts, szukamy po kluczach <0 w cache i parsedFW
        if (mobParts.length === 0) {
            console.warn('[DL][WARN] Nie znaleziono mobów w npcs_del, używam fallbacku z cached/parsedFW');
            Object.entries(participants).forEach(([key, p]) => {
                const id = Number(key);
                if (!isNaN(id) && id < 0) {
                    const lvl = p.lvl || 0, prof = p.prof || '';
                    let name = p.name || p.nick;
                    if (!name) {
                        if (parsedFW && parsedFW[key] && parsedFW[key].name) {
                            name = parsedFW[key].name;
                        } else {
                            name = "";
                        }
                    }
                    mobParts.push(`${name}(${lvl}${prof})`);
                }
            });
        }

        const dto = {
            creationTime: new Date().toISOString(),
            serverName: (location.hostname.match(/^([\w\d]+)\.margonem\.pl$/) || [])[1] || '',
            clanName: (() => { try { const c = Engine.hero.d.clan; return typeof c === 'object' ? c.name : c } catch { return '' } })(),
            mapName: (() => { try { return Engine.map.d.name } catch { return '' } })(),
            mobName: mobParts.join('\n'),
            isActive: true,
            isDeleted: false,
            lootUsers,
            items
        };

        // log DTO, żebyś od razu widział mobName
        console.group('[DL] Zbudowany Loot DTO:');
        console.log(dto);
        console.groupEnd();

        return dto;
    }


    function sendLootToServer(dto) {
        fetch(API_URL_LOOT, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        })
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(res => res.status === 'ok' ? log('Loot sent') : console.error('API error', res))
            .catch(err => warn('sendLootToServer failed', err));
    }

    // patch komunikacji tylko dla lootów
    (function () {
        if (!window.Engine?.communication || Engine.communication._dl_patched_loot) return;
        const orig = Engine.communication.successData;
        Engine.communication.successData = function (response) {
            let parsed;
            try { parsed = JSON.parse(response); }
            catch { return orig.apply(this, arguments); }

            if (parsed.f?.w) window._dl_teamParsedFW = parsed.f.w;

            if (parsed.loot && parsed.ev != null && parsed.item) {
                const lootId = parsed.ev;
                if (!sentLootEvents.has(lootId)) {
                    const items = Object.values(parsed.item)
                        .filter(it => !window._dl_sentItemHids.has(it.hid) && it.loc === 'l')
                        .map(it => {
                            window._dl_sentItemHids.add(it.hid);
                            return { itemHtml: JSON.stringify(it), ItemImgUrl: window.CFG.a_ipath + it.icon };
                        });
                    const partyMembers = parsed.party?.members || {};
                    const owners = parsed.loot?.owners || {};
                    const npcs = parsed.npcs_del || [];

                    const dtoLoot = buildLootDto(items, { party: partyMembers, owners, npcs });
                    if (dtoLoot.items.length) {
                        log('Sending loot DTO');
                        console.group('[DL] DTO do wysłania:');
                        console.log(dtoLoot);
                        console.groupEnd();
                        sendLootToServer(dtoLoot);
                        sentLootEvents.add(lootId);
                    }
                }
            }

            return orig.apply(this, arguments);
        };
        Engine.communication._dl_patched_loot = true;
    })();

    function checkSession() {
        const status = document.getElementById('dl-status'),
            btnEl = document.getElementById('dl-session-btn');
        if (status) status.textContent = 'Sprawdzanie sesji...';
        fetch('https://localhost:7238/api/lootlog/check', { credentials: 'include' })
            .then(r => r.json())
            .then(r => {
                if (r.status === 'ok') {
                    status.innerHTML = '<span style="color:#24e000;font-weight:bold;">Jesteś zalogowany!</span>';
                    btnEl.style.display = 'none';
                } else {
                    status.innerHTML = '<span style="color:#ff5555;font-weight:bold;">Nie jesteś zalogowany!</span>'
                        + '<br><a href="https://localhost:7238/Identity/Account/Login" target="_blank"'
                        + ' style="color:#18a8ff;">Kliknij, aby się zalogować</a>';
                    btnEl.style.display = 'inline-block';
                }
            })
            .catch(() => { if (status) status.innerHTML = '<span style="color:#ff5555;">Błąd połączenia!</span>'; });
    }

    // === UI do sprawdzania sesji z oryginalnym stylem ===
    const btn = document.createElement('button');
    btn.id = 'dl-lootlog-btn';
    btn.innerHTML = '<b style="font-size:22px;letter-spacing:2px;">DL</b>';
    Object.assign(btn.style, {
        position: 'fixed', bottom: '30px', left: '30px', zIndex: '10000',
        background: '#23272e', color: 'white', border: '2px solid #18a8ff',
        borderRadius: '42px', padding: '10px 24px', cursor: 'pointer',
        boxShadow: '0 2px 12px #0006', fontWeight: 'bold',
        fontFamily: 'Arial,sans-serif', fontSize: '21px',
        transition: 'transform 0.1s,border 0.2s'
    });
    btn.onmouseover = () => { btn.style.transform = 'scale(1.08)'; btn.style.borderColor = '#31c6ff'; };
    btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; btn.style.borderColor = '#18a8ff'; };
    btn.onclick = showDLWindow;
    document.body.appendChild(btn);

    function showDLWindow() {
        if (document.getElementById('dl-lootlog-window')) return;
        const win = document.createElement('div');
        win.id = 'dl-lootlog-window';
        win.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
            + 'background:#181c22;color:white;border:2px solid #18a8ff;border-radius:18px;'
            + 'z-index:10001;padding:38px 28px 24px 28px;box-shadow:0 4px 32px #000b;';
        win.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;">
        <span style="font-size:30px;width:38px;height:38px;border-radius:50%;`
            + `background:#23272e;border:2px solid #18a8ff;text-align:center;line-height:36px;`
            + `box-shadow:0 0 16px #31c6ff55;"><b style="font-size:22px;letter-spacing:2px;`
            + `color:#18a8ff;">DL</b></span><span style="font-size:20px;">Lootlog</span>`
            + `</div><div id="dl-status" style="margin:18px 0;">Sprawdzanie sesji...</div>`
            + `<button id="dl-session-btn" style="display:none;margin-right:10px;`
            + `padding:7px 18px;font-size:16px;background:#0056d6;color:white;border:none;`
            + `border-radius:7px;cursor:pointer;">Sprawdź sesję</button>`
            + `<button id="dl-close-btn" style="position:absolute;top:10px;right:18px;`
            + `font-size:18px;background:none;color:#bbb;border:none;cursor:pointer;">×</button>`;
        document.body.appendChild(win);
        win.querySelector('#dl-close-btn').onclick = () => win.remove();
        win.querySelector('#dl-session-btn').onclick = checkSession;
        checkSession();
    }

    log('DarkLog loaded.');
})();
