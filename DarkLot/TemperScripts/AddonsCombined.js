// ==UserScript==
// @name          DarkFights + DarkLog
// @namespace     http://tampermonkey.net/
// @version       2025-06-11.67 // Wysyłka walk działa! + logi
// @description   Warriors, RAWLOG + lootlog: jedno miejsce, jeden patch, brak konfliktów, pełny RAWLOG, cooldown wysyłki walki
// @author        Dark-Sad
// @match         https://lelwani.margonem.pl/*
// @match         http://*.margonem.pl/
// @match         https://*.margonem.pl/
// @grant         none
// @run-at        document-idle
// ==/UserScript==

(function () {
    'use strict';

    const API_URL_BATTLE = 'https://localhost:7238/api/Battle/addBattle';
    const API_URL_LOOT = 'https://localhost:7238/api/lootlog/add';

    const professionMap = { m: 'Mag', p: 'Paladyn', t: 'Tropiciel', w: 'Wojownik', b: 'Tancerz Ostrzy', h: 'Łowca' };

    // --- Zmienne stanu walki ---
    let warriorsAtStart = [];
    let lastKnownWarriors = [];
    let battleProcessed = false;
    let battleSendingInProgress = false;
    let startHandled = false;
    let battleSessionId = null;
    let battleStartText = '';
    let accumulatedLogs = [];
    let lastBattleSentTime = 0;
    const BATTLE_SEND_COOLDOWN = 3000;

    // --- Zmienne stanu lootu ---
    window._dl_teamParsedFW = null;
    window._dl_lastWarriorsListTurn = null;
    window._dl_sentItemHids = window._dl_sentItemHids || new Set();
    const sentLootEvents = new Set();
    let sessionChecked = false;

    function log(...a) { console.log('[DF+DL]', ...a); }
    function warn(...a) { console.warn('[DF+DL][WARN]', ...a); }

    function getBestName(o) {
        if (!o || typeof o !== 'object') return '';
        let n = o.name || o.nick || o.Nick || o.Name || o.imie || o.imię || o.label || o.title || '';
        if (!n && o.d) n = o.d.nick || o.d.name || o.d.label || '';
        return n;
    }

    function captureWarriors(debug = false) {
        const list = window.Engine?.battle?.warriorsList
            ? Object.values(window.Engine.battle.warriorsList) : [];
        if (!list.length) {
            if (debug) log('[DEBUG] warriorsList EMPTY at captureWarriors');
            return false;
        }
        warriorsAtStart = list.map(f => ({
            FighterId: String(f.id),
            Name: getBestName(f),
            Profession: f.id > 0
                ? (professionMap[String(f.prof).toLowerCase()] || `Nieznana(${f.prof})`)
                : (f.prof ? `Mob(${f.prof})` : 'Mob'),
            Team: f.team || 0,
            Level: f.lvl || 0
        }));
        if (debug) log('[DEBUG] Warriors captured:', warriorsAtStart);
        else log('✅ Warriors captured:', warriorsAtStart);
        return true;
    }

    function resetDLCache() {
        window._dl_teamParsedFW = null;
        window._dl_lastWarriorsListTurn = null;
        window._dl_sentItemHids = new Set();
        sentLootEvents.clear();
        log('[DL][DEBUG] Loot cache zresetowany');
    }

    // --- Patch Engine.communication.successData ---
    (function patchEngineOnce() {
        if (!window.Engine?.communication || window.Engine.communication._dfdl_patched) return;
        const orig = Engine.communication.successData;

        Engine.communication.successData = function (response) {
            let parsed;
            try { parsed = JSON.parse(response); }
            catch { return orig.apply(this, arguments); }

            // Zapisujemy f.w (dane drużyny) do lootu
            if (parsed.f && parsed.f.w) {
                window._dl_teamParsedFW = parsed.f.w;
                log('[DEBUG] parsed.f.w', parsed.f.w);
            }

            // --- Przetwarzanie lootu ---
            if (parsed.loot && parsed.ev != null && parsed.item) {
                const lootId = parsed.ev;
                console.log('[DL] parsed.loot=', parsed.loot, 'ev=', lootId, 'items=', parsed.item);
                if (!sentLootEvents.has(lootId)) {
                    const itemsToProcess = Object.values(parsed.item)
                        .filter(it => !window._dl_sentItemHids.has(it.hid) && it.loc === 'l')
                        .map(it => {
                            window._dl_sentItemHids.add(it.hid);
                            return { itemHtml: JSON.stringify(it), ItemImgUrl: window.CFG.a_ipath + it.icon };
                        });
                    const tempLootCache = { items: { ...parsed.item }, source: parsed.loot.source };
                    const dto = buildLootDto(itemsToProcess, tempLootCache);
                    if (dto.items.length) {
                        sendLootToServer(dto);
                        sentLootEvents.add(lootId);
                    } else {
                        log('[DL][DEBUG] skipping send: no items');
                    }
                }
            }

            // Zbieranie RAWLOG
            if (parsed?.f?.m && Array.isArray(parsed.f.m)) {
                const newLogs = parsed.f.m.filter(t => typeof t === "string");
                accumulatedLogs.push(...newLogs);
            }

            // --- Koniec walki? ---
            if (parsed?.f?.m && parsed.f.m.some(line => typeof line === 'string' && line.includes("winner="))) {
                // Najpierw oryginał
                const result = orig.apply(this, arguments);

                // --- WYSYŁKA WALKI ---
                trySendBattle();
                battleProcessed = true; // USTAWIAMY NATYCHMIAST!

                // Reset wszystkiego po walce
                battleSendingInProgress = false;
                warriorsAtStart = [];
                lastKnownWarriors = [];
                battleSessionId = null;
                startHandled = false;
                battleStartText = '';
                accumulatedLogs = [];
                log('[DEBUG] Wszystkie flagi i battleStartText zostały wyczyszczone po zakończeniu walki');

                return result;
            }

            return orig.apply(this, arguments);
        };

        Engine.communication._dfdl_patched = true;
    })();

    // --- Patch Engine.battle.updateData (turn-by-turn) ---
    (function patchBattleUpdateDataTurn() {
        if (!window.Engine?.battle || window.Engine.battle._dfdl_patchedTurn) return;
        const orig = Engine.battle.updateData;
        Engine.battle.updateData = function (data) {
            const res = orig.apply(this, arguments);
            if (this.warriorsList && Object.keys(this.warriorsList).length) {
                window._dl_lastWarriorsListTurn = { ...this.warriorsList };
                lastKnownWarriors = Object.values(this.warriorsList).map(f => ({
                    FighterId: String(f.id),
                    Name: getBestName(f),
                    Profession: f.id > 0
                        ? (professionMap[String(f.prof).toLowerCase()] || `Nieznana(${f.prof})`)
                        : (f.prof ? `Mob(${f.prof})` : 'Mob'),
                    Team: f.team || 0,
                    Level: f.lvl || 0
                }));
                log('[DEBUG] warriorsList i lastKnownWarriors zaktualizowane');
            }
            return res;
        };
        Engine.battle._dfdl_patchedTurn = true;
    })();

    // --- Obserwacja DOM pod kątem startu walki ---
    new MutationObserver(muts => {
        muts.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1 || !node.classList.contains('battle-msg')) return;
                const text = node.innerText.trim();
                if (!startHandled && text.startsWith('Rozpoczęła się walka')) {
                    battleStartText = text;
                    startHandled = true;
                    battleProcessed = false;
                    battleSessionId = Date.now();
                    resetDLCache();  // <<< resetujemy cache lootów przy starcie walki
                    log(`🔔 Battle START (session ${battleSessionId}):`, text);
                    warriorsAtStart = [];
                    lastKnownWarriors = [];

                    let tries = 0;
                    const timer = setInterval(() => {
                        if (captureWarriors() || ++tries >= 10) {
                            clearInterval(timer);
                            if (!warriorsAtStart.length && lastKnownWarriors.length) {
                                warriorsAtStart = [...lastKnownWarriors];
                                log('✅ Odtworzono warriorsAtStart z lastKnownWarriors:', warriorsAtStart);
                            }
                        }
                    }, 100);
                }
            });
        });
    }).observe(document.body, { childList: true, subtree: true });

    // --- Funkcje dla DarkLog (loot) ---
    function buildLootDto(items, lootCache) {
        log('[DEBUG] buildLootDto items=', items);
        const mobParts = [], lootUsers = [];
        let participants = {};

        if (lootCache.source?.includes('fight') && Engine.battle?.warriorsList && Object.keys(Engine.battle.warriorsList).length) {
            participants = { ...Engine.battle.warriorsList };
        } else {
            participants = { ...window._dl_lastWarriorsListTurn, ...window._dl_teamParsedFW };
        }

        Object.keys(participants).forEach(k => {
            const id = +k;
            if (isNaN(id)) return;
            const f = participants[k];
            const name = getBestName(f);
            if (!name) return;
            if (id < 0) {
                mobParts.push(`${name}(${f.lvl || ''}${f.prof || ''})`);
            } else {
                const icon = f.icon ? window.CFG.a_opath + f.icon.replace(/^\//, '') : '';
                lootUsers.push({ GameUserId: String(id), Nick: name, Level: f.lvl || 0, ClassAbbr: f.prof || '', AvatarUrl: icon });
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

    function sendLootToServer(dto) {
        fetch(API_URL_LOOT, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        })
            .then(r => r.json())
            .then(res => { if (res.status === 'ok') log('[DL] Loot sent'); else console.error('[DL] Error', res); })
            .catch(err => console.error('[DL] Conn error', err));
    }

    // --- NOWA CZĘŚĆ: WYSYŁKA WALKI ---
    function buildBattleDto() {
        const fighters = (warriorsAtStart || []).map(f => ({
            FighterId: String(f.FighterId),
            Name: f.Name,
            Profession: f.Profession,
            Team: f.Team
        }));
        return {
            BattleStart: battleStartText,
            Fighters: fighters,
            Logs: accumulatedLogs,
            ServerName: (location.hostname.match(/^([\w\d]+)\.margonem\.pl$/) || [])[1] || ''
        };
    }

    function getBattleUniqueId() {
        // Możesz wziąć kawałek battleStartText + składy graczy + “winner” z logu
        const hashInput = [
            battleStartText,
            (warriorsAtStart || []).map(w => w.FighterId + ':' + w.Name).join('|'),
            (accumulatedLogs.find(l => l.includes('winner=')) || '')
        ].join('|');
        return hashInput.length > 0 ? btoa(unescape(encodeURIComponent(hashInput))).substring(0, 64) : '';
    }


    function trySendBattle(attempt = 0) {
        if (battleProcessed) return;
        const now = Date.now();
        if (battleSendingInProgress || now - lastBattleSentTime < BATTLE_SEND_COOLDOWN) return;

        if (!warriorsAtStart.length && lastKnownWarriors.length) {
            warriorsAtStart = [...lastKnownWarriors];
        }
        if ((!battleStartText || !warriorsAtStart.length || !accumulatedLogs.some(l => l.includes('winner='))) && attempt < 5) {
            setTimeout(() => trySendBattle(attempt + 1), 300);
            return;
        }
        if (!battleStartText || !warriorsAtStart.length || !accumulatedLogs.some(l => l.includes('winner='))) {
            warn('[BATTLE] Nie można wysłać walki – brakuje danych nawet po powtórkach!', { battleStartText, warriorsAtStart, accumulatedLogs });
            return;
        }

        battleSendingInProgress = true;
        const dto = buildBattleDto();
        fetch(API_URL_BATTLE, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto) // <-- wysyłaj bez wrappera
        })
            .then(r => r.json())
            .then(res => {
                if (res.status === 'ok') {
                    log('[BATTLE] Walka wysłana!');
                    battleProcessed = true;
                } else {
                    warn('[BATTLE] Błąd przy wysyłce walki', res);
                }
                lastBattleSentTime = Date.now();
                battleSendingInProgress = false;
            })
            .catch(err => {
                warn('[BATTLE] Błąd połączenia', err);
                battleSendingInProgress = false;
            });
    }


    // --- UI przycisku DL ---
    const btn = document.createElement('button');
    btn.id = 'dl-lootlog-btn';
    btn.innerHTML = '<b style="font-size:22px;letter-spacing:2px;">DL</b>';
    Object.assign(btn.style, {
        position: 'fixed', bottom: '30px', left: '30px', zIndex: '10000',
        background: '#23272e', color: 'white', border: '2px solid #18a8ff',
        borderRadius: '42px', padding: '10px 24px', cursor: 'pointer',
        boxShadow: '0 2px 12px #0006', fontWeight: 'bold', fontFamily: 'Arial,sans-serif',
        fontSize: '21px', transition: 'transform 0.1s,border 0.2s'
    });
    btn.onmouseover = () => { btn.style.transform = 'scale(1.08)'; btn.style.borderColor = '#31c6ff'; };
    btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; btn.style.borderColor = '#18a8ff'; };
    document.body.appendChild(btn);

    function showDLWindow() {
        if (document.getElementById('dl-lootlog-window')) return;
        const win = document.createElement('div');
        win.id = 'dl-lootlog-window';
        win.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
            + 'background:#181c22;color:white;border:2.5px solid #18a8ff;border-radius:18px;'
            + 'z-index:10001;padding:38px 28px 24px 28px;box-shadow:0 4px 32px #000b;';
        win.innerHTML = `
            <div style="display:flex;align-items:center;gap:16px;">
                <span style="font-size:30px;width:38px;height:38px;border-radius:50%;background:#23272e;border:2.5px solid #18a8ff;text-align:center;line-height:36px;box-shadow:0 0 16px #31c6ff55;">
                    <b style="font-size:22px;letter-spacing:2px;color:#18a8ff;">DL</b>
                </span>
                <span style="font-size:20px;">Lootlog</span>
            </div>
            <div id="dl-status" style="margin:18px 0;">Sprawdzanie sesji...</div>
            <button id="dl-session-btn" style="display:none;margin-right:10px;padding:7px 18px;font-size:16px;background:#0056d6;color:white;border:none;border-radius:7px;cursor:pointer;">Sprawdź sesję</button>
            <button id="dl-close-btn" style="position:absolute;top:10px;right:18px;font-size:18px;background:none;color:#bbb;border:none;cursor:pointer;">×</button>`;
        document.body.appendChild(win);
        win.querySelector('#dl-close-btn').onclick = () => win.remove();
        win.querySelector('#dl-session-btn').onclick = checkSession;
        checkSession();
    }
    btn.onclick = showDLWindow;

    function checkSession() {
        const status = document.getElementById('dl-status'),
            sessBtn = document.getElementById('dl-session-btn');
        if (status) status.textContent = 'Sprawdzanie sesji...';
        fetch('https://localhost:7238/api/lootlog/check', { credentials: 'include' })
            .then(r => r.json()).then(r => {
                sessionChecked = true;
                if (r.status === 'ok') {
                    status.innerHTML = '<span style="color:#24e000;font-weight:bold;">Jesteś zalogowany!</span>';
                    sessBtn.style.display = 'none';
                } else {
                    status.innerHTML = '<span style="color:#ff5555;font-weight:bold;">Nie jesteś zalogowany!</span>'
                        + '<br><a href="https://localhost:7238/Identity/Account/Login" target="_blank" style="color:#18a8ff;">Kliknij, aby się zalogować</a>';
                    sessBtn.style.display = 'inline-block';
                }
            })
            .catch(() => { if (status) status.innerHTML = '<span style="color:#ff5555;">Błąd połączenia!</span>'; });
    }
    checkSession();

    log('Script loaded: RAWLOG/lootlog merged. Patch only ONCE.');
})();
