// ==UserScript==
// @name         DarkLog v3.7.10
// @version      3.7.10
// @description  Pełny fallback nazw + suffix profesji dla mobów + poprawione avatar URLs
// @author       Dark-Sad
// @match        http://*.margonem.pl/
// @match        https://*.margonem.pl/
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // GLOBALNE
    window._dl_teamParsedFW = null;
    window._dl_lastWarriorsListTurn = null;
    window._dl_lastLootEventId = null;
    window._dl_lootCache = {};
    window._dl_sentItemHids = window._dl_sentItemHids || new Set();
    let sessionChecked = false;
    const sentLootEvents = new Set();

    // PATCH FAST/TEAM FIGHT z debugiem
    function patchSuccessDataTeam() {
        if (window.Engine && Engine.communication && !Engine.communication._dl_patchedTeam) {
            const orig = Engine.communication.successData;
            Engine.communication.successData = function (jsonStr) {
                let parsed;
                try { parsed = JSON.parse(jsonStr); } catch { return orig.apply(this, arguments); }
                if (parsed.f && parsed.f.w) {
                    window._dl_teamParsedFW = parsed.f.w;
                    console.group('[DL][DEBUG] parsed.f.w');
                    console.log(parsed.f.w);
                    console.groupEnd();
                }
                if (parsed.loot && parsed.ev != null && parsed.item) {
                    window._dl_lootCache[parsed.ev] = { items: { ...parsed.item }, source: parsed.loot.source };
                    window._dl_lastLootEventId = parsed.ev;
                }
                return orig.apply(this, arguments);
            };
            Engine.communication._dl_patchedTeam = true;
        }
    }

    // PATCH TURN-BASED FIGHT stats only z debugiem
    function patchBattleUpdateDataTurn() {
        if (window.Engine && Engine.battle && !Engine.battle._dl_patchedTurn) {
            const orig = Engine.battle.updateData;
            Engine.battle.updateData = function (data) {
                const res = orig.apply(this, arguments);
                if (this.warriorsList && Object.keys(this.warriorsList).length) {
                    window._dl_lastWarriorsListTurn = { ...this.warriorsList };
                    console.group('[DL][DEBUG] warriorsList');
                    console.log(window._dl_lastWarriorsListTurn);
                    console.groupEnd();
                }
                return res;
            };
            Engine.battle._dl_patchedTurn = true;
        }
    }

    // Uruchom patchy co 100ms
    const patchInterval = setInterval(() => {
        patchSuccessDataTeam();
        patchBattleUpdateDataTurn();
        if (Engine.communication._dl_patchedTeam && Engine.battle._dl_patchedTurn) {
            clearInterval(patchInterval);
        }
    }, 100);

    // HELPER: najlepsza nazwa
    function getBestName(obj) {
        if (!obj || typeof obj !== 'object') return '';
        let name = obj.name || obj.nick || obj.Nick || obj.Name || obj.imie || obj.imię || obj.label || obj.title || '';
        if (!name && obj.d) name = obj.d.nick || obj.d.name || obj.d.label || '';
        return name;
    }

    // HELPER: połącz nazwy z obu źródeł
    function getCombinedName(nameObj, statObj) {
        const n1 = getBestName(nameObj);
        if (n1) return n1;
        const n2 = getBestName(statObj);
        if (n2) return n2;
        console.warn('[DL] Nie znaleziono nazwy:', nameObj, statObj);
        return '';
    }

    // BUDOWA DTO
    function buildDto(items, source) {
        const mobParts = [];
        const lootUsers = [];

        const fwNames = source.includes('fight') ? (window._dl_teamParsedFW || {}) : {};
        const fwStats = source.includes('fight') ? (window._dl_lastWarriorsListTurn || {}) : {};
        const allKeys = Array.from(new Set([...Object.keys(fwNames), ...Object.keys(fwStats)]));

        allKeys.forEach(k => {
            const id = +k;
            if (isNaN(id)) return;
            const nameObj = fwNames[k] || {};
            const statObj = fwStats[k] || {};

            if (id < 0) {
                // mob z suffixem profesji
                const name = getCombinedName(nameObj, statObj);
                const lvl = statObj.lvl || nameObj.lvl || '';
                const prof = statObj.prof || nameObj.prof || '';
                mobParts.push(`${name}(${lvl}${prof})`);
            } else {
                // gracz, avatar z obu źródeł
                const nick = getCombinedName(nameObj, statObj);
                const lvl = statObj.lvl || nameObj.lvl || 0;
                const prof = statObj.prof || nameObj.prof || '';
                const icon = nameObj.icon || statObj.icon || '';
                const avatar = icon ? window.CFG.a_opath + icon.replace(/^\//, '') : '';
                lootUsers.push({ GameUserId: String(id), Nick: nick, Level: lvl, ClassAbbr: prof, AvatarUrl: avatar });
            }
        });

        return {
            creationTime: new Date().toISOString(),
            serverName: (location.hostname.match(/^([\w\d]+)\.margonem\.pl$/) || [])[1] || '',
            clanName: (() => { try { const c = Engine.hero.d.clan; return typeof c === 'object' ? c.name : c || ''; } catch { return ''; } })(),
            mapName: (() => { try { return Engine.map.d.name || ''; } catch { return ''; } })(),
            mobName: mobParts.join('\n'),
            isActive: true,
            isDeleted: false,
            lootUsers,
            items
        };
    }

    // WYSYŁKA LOOT
    function sendCachedLoot() {
        if (!sessionChecked || !window._dl_lastLootEventId || sentLootEvents.has(window._dl_lastLootEventId)) return;
        const lootCache = window._dl_lootCache[window._dl_lastLootEventId];
        if (!lootCache) return console.log('[DL] Brak cache', window._dl_lastLootEventId);
        if (lootCache.source.includes('fight') && Engine.battle && Object.keys(Engine.battle.warriorsList || {}).length) {
            window._dl_lastWarriorsListTurn = { ...Engine.battle.warriorsList };
        }
        const items = Object.values(lootCache.items)
            .filter(it => !window._dl_sentItemHids.has(it.hid) && it.loc === 'l')
            .map(it => {
                window._dl_sentItemHids.add(it.hid);
                return { itemHtml: JSON.stringify(it), ItemImgUrl: window.CFG.a_ipath + it.icon };
            });

        const dto = buildDto(items, lootCache.source);
        console.group('[DL][DEBUG] DTO ready'); console.log(dto); console.groupEnd();
        if (!dto.lootUsers.length || !dto.mobName || !dto.items.length) {
            console.log('[DL] Pomijam', window._dl_lastLootEventId);
            sentLootEvents.add(window._dl_lastLootEventId);
            delete window._dl_lootCache[window._dl_lastLootEventId]; window._dl_lastLootEventId = null;
            return;
        }
        console.log('[DL] Sending DTO', dto);
        sendLootToServer(dto);
        sentLootEvents.add(window._dl_lastLootEventId);
        delete window._dl_lootCache[window._dl_lastLootEventId]; window._dl_lastLootEventId = null;
    }

    // UI: przycisk + okno sesji
    const btn = document.createElement('button');
    btn.id = 'dl-lootlog-btn';
    btn.innerHTML = '<b style="font-size:22px;letter-spacing:2px;">DL</b>';
    Object.assign(btn.style, {
        position: 'fixed', bottom: '30px', left: '30px', zIndex: '10000',
        background: '#23272e', color: 'white', border: '2px solid #18a8ff',
        borderRadius: '42px', padding: '10px 24px', cursor: 'pointer',
        boxShadow: '0 2px 12px #0006', fontWeight: 'bold', fontFamily: 'Arial, sans-serif', fontSize: '21px',
        transition: 'transform 0.1s, border 0.2s'
    });
    btn.onmouseover = () => { btn.style.transform = 'scale(1.08)'; btn.style.borderColor = '#31c6ff'; };
    btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; btn.style.borderColor = '#18a8ff'; };
    document.body.appendChild(btn);

    function showDLWindow() {
        if (document.getElementById('dl-lootlog-window')) return;
        const win = document.createElement('div');
        win.id = 'dl-lootlog-window';
        win.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
            'background:#181c22;color:white;border:2.5px solid #18a8ff;border-radius:18px;' +
            'z-index:10001;padding:38px 28px 24px 28px;box-shadow:0 4px 32px #000b;';
        win.innerHTML = '<div style="display:flex;align-items:center;gap:16px;">' +
            '<span style="font-size:30px;width:38px;height:38px;border-radius:50%;background:#23272e;' +
            'border:2.5px solid #18a8ff;text-align:center;line-height:36px;box-shadow:0 0 16px #31c6ff55;">' +
            '<b style="font-size:22px;letter-spacing:2px;color:#18a8ff;">DL</b></span>' +
            '<span style="font-size:20px;">Lootlog</span></div>' +
            '<div id="dl-status" style="margin:18px 0;">Sprawdzanie sesji...</div>' +
            '<button id="dl-session-btn" style="display:none;margin-right:10px;padding:7px 18px;' +
            'font-size:16px;background:#0056d6;color:white;border:none;border-radius:7px;cursor:pointer;">' +
            'Sprawdź sesję</button>' +
            '<button id="dl-close-btn" style="position:absolute;top:10px;right:18px;' +
            'font-size:18px;background:none;color:#bbb;border:none;cursor:pointer;">&times;</button>';
        document.body.appendChild(win);
        win.querySelector('#dl-close-btn').onclick = () => win.remove();
        win.querySelector('#dl-session-btn').onclick = checkSession;
        checkSession();
    }
    btn.onclick = showDLWindow;

    function checkSession() {
        const status = document.getElementById('dl-status');
        const sessBtn = document.getElementById('dl-session-btn');
        if (status) status.textContent = 'Sprawdzanie sesji...';
        fetch('https://localhost:7238/api/lootlog/check', { credentials: 'include' })
            .then(r => r.json()).then(r => {
                sessionChecked = true; if (r.status === 'ok') {
                    status.innerHTML = '<span style="color:#24e000;' +
                        'font-weight:bold;">Jesteś zalogowany!</span>'; sessBtn.style.display = 'none';
                } else {
                    status.innerHTML = '<span ' +
                        'style="color:#ff5555;font-weight:bold;">Nie jesteś zalogowany!</span><br><a href="' +
                        'https://localhost:7238/Identity/Account/Login" target="_blank" style="color:#18a8ff;">Kliknij,' +
                        ' aby się zalogować</a>'; sessBtn.style.display = 'inline-block';
                }
            })
            .catch(() => { if (status) status.innerHTML = '<span style="color:#ff5555;">Błąd połączenia!</span>' });
    }
    checkSession();

    // OBSERVER: wysyłka po otwarciu loot window
    const observer = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(node => {
        if (node.nodeType === 1 && node.classList.contains('loot-wnd')) setTimeout(sendCachedLoot, 100);
    })));
    observer.observe(document.body, { childList: true, subtree: true });

    // WYSYŁKA do serwera
    function sendLootToServer(dto) {
        fetch('https://localhost:7238/api/lootlog/add', {
            method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        })
            .then(r => r.json()).then(res => { if (res.status === 'ok') console.log('[DL] Loot sent'); else console.error('[DL] Error', res); })
            .catch(err => console.error('[DL] Conn error', err));
    }

    // Reset cache
    function resetDLCache() {
        window._dl_teamParsedFW = null;
        window._dl_lastWarriorsListTurn = null;
        window._dl_lastLootEventId = null;
        window._dl_lootCache = {};
        window._dl_sentItemHids = new Set();
    }
})();
