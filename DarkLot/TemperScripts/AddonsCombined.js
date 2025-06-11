// ==UserScript==
// @name         DarkFights + DarkLog
// @namespace    http://tampermonkey.net/
// @version      2025-06-11.61
// @description  Warriors, RAWLOG + lootlog: jedno miejsce, jeden patch, brak konfliktów, pełny RAWLOG, cooldown wysyłki walki
// @author       Dark-Sad
// @match        https://lelwani.margonem.pl/*
// @match        http://*.margonem.pl/
// @match        https://*.margonem.pl/
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const API_URL_BATTLE = 'https://localhost:7238/api/Battle/addBattle';
    const API_URL_LOOT = 'https://localhost:7238/api/lootlog/add';
    const professionMap = { m: 'Mag', p: 'Paladyn', t: 'Tropiciel', w: 'Wojownik', b: 'Tancerz Ostrzy', h: 'Łowca' };

    let warriorsAtStart = [];
    let battleProcessed = false;
    let battleSessionId = null;
    let startHandled = false;
    let battleSendingInProgress = false;
    let battleStartText = '';

    let accumulatedLogs = [];

    // Cooldown na wysyłkę walki, 3 sekundy
    let lastBattleSentTime = 0;
    const BATTLE_SEND_COOLDOWN = 3000;

    // DarkLog-related state
    window._dl_teamParsedFW = null;
    window._dl_lastWarriorsListTurn = null;
    window._dl_lastLootEventId = null;
    window._dl_lootCache = {};
    window._dl_sentItemHids = window._dl_sentItemHids || new Set();
    let sessionChecked = false;
    const sentLootEvents = new Set();

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

    (function patchEngineOnce() {
        if (!window.Engine?.communication || window.Engine.communication._dfdl_patched) return;
        const orig = Engine.communication.successData;

        Engine.communication.successData = function (response) {
            let parsed;
            try { parsed = JSON.parse(response); } catch { return orig.apply(this, arguments); }

            // Zapisujemy f.w i loot (DarkLog)
            if (parsed.f && parsed.f.w) {
                window._dl_teamParsedFW = parsed.f.w;
                log('[DEBUG] parsed.f.w', parsed.f.w);
            }
            if (parsed.loot && parsed.ev != null && parsed.item) {
                window._dl_lootCache[parsed.ev] = { items: { ...parsed.item }, source: parsed.loot.source };
                window._dl_lastLootEventId = parsed.ev;
            }

            // Doklejamy RAWLOG fragmenty do accumulatedLogs
            if (parsed?.f?.m && Array.isArray(parsed.f.m)) {
                const newLogs = parsed.f.m.filter(t => t && typeof t === "string");
                accumulatedLogs.push(...newLogs);
            }

            // Jeśli koniec walki (linia winner=)
            if (parsed?.f?.m && parsed.f.m.some(line => typeof line === 'string' && line.includes("winner="))) {
                if (!battleProcessed && !battleSendingInProgress) {
                    battleProcessed = true;
                    battleSendingInProgress = true;

                    if (!warriorsAtStart.length) {
                        log('⚠️ Warriors empty at RAWLOG time, trying to recover...');
                        captureWarriors(true);
                    }
                    if (!warriorsAtStart.length) {
                        warn('Skipping send: no fighters captured');
                        battleSendingInProgress = false;
                    } else {
                        if (!accumulatedLogs.length) {
                            warn('No logs to send');
                            battleSendingInProgress = false;
                        } else {
                            log('Logs length (accumulated):', accumulatedLogs.length);
                            log('First log line:', accumulatedLogs[0]);
                            log('Last log line:', accumulatedLogs[accumulatedLogs.length - 1]);

                            const dto = {
                                BattleStart: battleStartText || (accumulatedLogs.length ? accumulatedLogs[0] : ''),
                                Fighters: warriorsAtStart,
                                Logs: accumulatedLogs,
                                ServerName: window.location.hostname.split('.')[0]
                            };

                            if (dto.Fighters.some(f => parseInt(f.FighterId, 10) <= 0)) {
                                warn('Skipping send: negative FighterId detected', dto.Fighters);
                                battleSendingInProgress = false;
                            } else {
                                if (Date.now() - lastBattleSentTime < BATTLE_SEND_COOLDOWN) {
                                    log('Skipping sending battle: cooldown active');
                                    battleSendingInProgress = false;
                                } else {
                                    lastBattleSentTime = Date.now();
                                    fetch(API_URL_BATTLE, {
                                        method: 'POST',
                                        credentials: 'include',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(dto)
                                    })
                                    .then(response => response.text().then(text => {
                                        log('fetch status:', response.status, 'body:', text);
                                        battleSendingInProgress = false;
                                    }))
                                    .catch(e => {
                                        console.error('Fetch error:', e);
                                        battleSendingInProgress = false;
                                    });
                                }
                            }
                        }
                    }

                    battleProcessed = false;
                    warriorsAtStart = [];
                    battleSessionId = null;
                    startHandled = false;
                    battleStartText = '';
                    accumulatedLogs = [];
                    log('[DEBUG] Flags/sesja wyzerowane po walce (natychmiastowy reset)');
                    return orig.apply(this, arguments);
                }
            }

            return orig.apply(this, arguments);
        };
        Engine.communication._dfdl_patched = true;
    })();

    (function patchBattleUpdateDataTurn() {
        if (!window.Engine?.battle || window.Engine.battle._dfdl_patchedTurn) return;
        const orig = Engine.battle.updateData;
        Engine.battle.updateData = function (data) {
            const res = orig.apply(this, arguments);
            if (this.warriorsList && Object.keys(this.warriorsList).length) {
                window._dl_lastWarriorsListTurn = { ...this.warriorsList };
                log('[DEBUG] warriorsList', window._dl_lastWarriorsListTurn);
            }
            return res;
        };
        Engine.battle._dfdl_patchedTurn = true;
    })();

    new MutationObserver(muts => {
        muts.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1 || !node.classList.contains('battle-msg')) return;
                const text = node.innerText.trim();
                if (!startHandled && text.startsWith('Rozpoczęła się walka')) {
                    battleStartText = text;
                    log('[DEBUG] New battle detected, resetting flags');
                    startHandled = true;
                    battleProcessed = false;
                    battleSessionId = Date.now();
                    warriorsAtStart = [];
                    log(`🔔 Battle START (session ${battleSessionId}):`, text);

                    let tries = 0;
                    const timer = setInterval(() => {
                        if (captureWarriors() || ++tries >= 10) clearInterval(timer);
                    }, 100);
                }
            });
        });
    }).observe(document.body, { childList: true, subtree: true });

    // Pozostała część DarkLog z lootem (bez zmian)...

    function getCombinedName(nameObj, statObj) {
        return getBestName(nameObj) || getBestName(statObj) || '';
    }

    function buildLootDto(items) {
        log('[DEBUG] buildDto items=', items);
        const mobParts = [];
        const lootUsers = [];
        const fastNames = window._dl_teamParsedFW || {};
        const turnStats = window._dl_lastWarriorsListTurn || {};
        const hasTurn = Object.keys(turnStats).some(k => +k > 0);
        const hasFast = !hasTurn && Object.keys(fastNames).length > 0;
        const fwNames = hasFast ? fastNames : {};
        const fwStats = hasTurn ? turnStats : {};

        const allKeys = Array.from(new Set([...Object.keys(fwNames), ...Object.keys(fwStats)]));
        allKeys.forEach(k => {
            const id = +k;
            if (isNaN(id)) return;
            const nameObj = fwNames[k] || {};
            const statObj = fwStats[k] || {};
            const name = getCombinedName(nameObj, statObj);
            if (!name) return;
            if (id < 0) {
                const lvl = statObj.lvl || nameObj.lvl || '';
                const prof = statObj.prof || nameObj.prof || '';
                mobParts.push(`${name}(${lvl}${prof})`);
            } else {
                const lvl = statObj.lvl || nameObj.lvl || 0;
                const prof = statObj.prof || nameObj.prof || '';
                const icon = nameObj.icon || statObj.icon || '';
                const avatar = icon ? window.CFG.a_opath + icon.replace(/^\//, '') : '';
                lootUsers.push({ GameUserId: String(id), Nick: name, Level: lvl, ClassAbbr: prof, AvatarUrl: avatar });
            }
        });

        const dto = {
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
        log('[DEBUG] DTO:', dto);
        return dto;
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

    function sendCachedLoot() {
        if (!sessionChecked) return log('[DL][DEBUG] session not checked');
        if (!window._dl_lastLootEventId) return log('[DL][DEBUG] no lastLootEventId');
        if (sentLootEvents.has(window._dl_lastLootEventId)) return log('[DL][DEBUG] already sent');

        const lootCache = window._dl_lootCache[window._dl_lastLootEventId];
        if (!lootCache) return log('[DL][DEBUG] missing cache entry');
        if (lootCache.source.includes('fight') && Engine.battle && Object.keys(Engine.battle.warriorsList || {}).length) {
            window._dl_lastWarriorsListTurn = { ...Engine.battle.warriorsList };
        }

        const items = Object.values(lootCache.items)
            .filter(it => !window._dl_sentItemHids.has(it.hid) && it.loc === 'l')
            .map(it => { window._dl_sentItemHids.add(it.hid); return { itemHtml: JSON.stringify(it), ItemImgUrl: window.CFG.a_ipath + it.icon }; });

        const dto = buildLootDto(items);

        if (!dto.lootUsers.length || !dto.mobName || !dto.items.length) {
            log('[DL][DEBUG] skipping send: insufficient data');
            sentLootEvents.add(window._dl_lastLootEventId);
            delete window._dl_lootCache[window._dl_lastLootEventId];
            window._dl_lastLootEventId = null;
            resetDLCache();
            return;
        }

        sendLootToServer(dto);
        sentLootEvents.add(window._dl_lastLootEventId);
        delete window._dl_lootCache[window._dl_lastLootEventId];
        window._dl_lastLootEventId = null;
        resetDLCache();
    }

    function resetDLCache() {
        window._dl_teamParsedFW = null;
        window._dl_lastWarriorsListTurn = null;
        window._dl_lastLootEventId = null;
        window._dl_lootCache = {};
        window._dl_sentItemHids = new Set();
    }

    const btn = document.createElement('button');
    btn.id = 'dl-lootlog-btn';
    btn.innerHTML = '<b style="font-size:22px;letter-spacing:2px;">DL</b>';
    Object.assign(btn.style, {
        position: 'fixed', bottom: '30px', left: '30px', zIndex: '10000', background: '#23272e', color: 'white',
        border: '2px solid #18a8ff', borderRadius: '42px', padding: '10px 24px', cursor: 'pointer',
        boxShadow: '0 2px 12px #0006', fontWeight: 'bold', fontFamily: 'Arial,sans-serif', fontSize: '21px',
        transition: 'transform 0.1s,border 0.2s'
    });
    btn.onmouseover = () => { btn.style.transform = 'scale(1.08)'; btn.style.borderColor = '#31c6ff'; };
    btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; btn.style.borderColor = '#18a8ff'; };
    document.body.appendChild(btn);

    function showDLWindow() {
        if (document.getElementById('dl-lootlog-window')) return;
        const win = document.createElement('div');
        win.id = 'dl-lootlog-window';
        win.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#181c22;color:white;border:2.5px solid #18a8ff;border-radius:18px;z-index:10001;padding:38px 28px 24px 28px;box-shadow:0 4px 32px #000b;';
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
        const status = document.getElementById('dl-status'), sessBtn = document.getElementById('dl-session-btn');
        if (status) status.textContent = 'Sprawdzanie sesji...';
        fetch('https://localhost:7238/api/lootlog/check', { credentials: 'include' }).then(r => r.json()).then(r => {
            sessionChecked = true;
            if (r.status === 'ok') {
                status.innerHTML = '<span style="color:#24e000;font-weight:bold;">Jesteś zalogowany!</span>';
                sessBtn.style.display = 'none';
            } else {
                status.innerHTML = '<span style="color:#ff5555;font-weight:bold;">Nie jesteś zalogowany!</span><br><a href="https://localhost:7238/Identity/Account/Login" target="_blank" style="color:#18a8ff;">Kliknij, aby się zalogować</a>';
                sessBtn.style.display = 'inline-block';
            }
        }).catch(() => { if (status) status.innerHTML = '<span style="color:#ff5555;">Błąd połączenia!</span>' });
    }
    checkSession();

    const observer = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(node => {
        if (node.nodeType === 1 && node.classList.contains('loot-wnd')) setTimeout(sendCachedLoot, 100);
    })));
    observer.observe(document.body, { childList: true, subtree: true });

    log('Script loaded: RAWLOG/lootlog merged. Patch only ONCE.');
})();
