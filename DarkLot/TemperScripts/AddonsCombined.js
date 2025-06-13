// ==UserScript==
// @name          DarkFights + DarkLog
// @namespace     http://tampermonkey.net/
// @version       2025-06-13.10 // Guard z opóźnieniem przeciw duplikatom + pełne UI
// @description   Warriors, RAWLOG + lootlog: jedno miejsce, jeden patch, brak konfliktów, pełny RAWLOG, natychmiastowa wysyłka walki
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

    // === guard: opóźnienie między wysyłkami walk ===
    const DUPLICATE_DELAY = 5000;  // ms
    let lastBattleSentTime = 0;

    // --- Stan walki ---
    let warriorsAtStart = [];
    let lastKnownWarriors = [];
    let battleProcessed = false;
    let startHandled = false;
    let battleStartText = '';
    let accumulatedLogs = [];

    // --- Stan lootu ---
    window._dl_teamParsedFW = null;
    window._dl_lastWarriorsListTurn = null;
    window._dl_sentItemHids = window._dl_sentItemHids || new Set();
    const sentLootEvents = new Set();

    function log(...a) { console.log('[DF+DL]', ...a); }
    function warn(...a) { console.warn('[DF+DL][WARN]', ...a); }

    function getBestName(o) {
        if (!o || typeof o !== 'object') return '';
        return typeof o.name === 'string' ? o.name : '';
    }

    function captureWarriors(debug = false) {
        // 1) live
        const live = window.Engine?.battle?.warriorsList
            ? Object.values(window.Engine.battle.warriorsList)
            : [];
        if (live.length) {
            warriorsAtStart = live.map(f => ({
                FighterId: String(f.id),
                Name: getBestName(f),
                Profession: f.id > 0
                    ? (professionMap[String(f.prof).toLowerCase()] || `Nieznana(${f.prof})`)
                    : (f.prof ? `Mob(${f.prof})` : 'Mob'),
                Team: f.team || 0,
                Level: f.lvl || 0
            }));
            log(debug ? '[DEBUG] Warriors captured (live)' : '✅ Warriors captured:', warriorsAtStart);
            return true;
        }
        // 2) lastKnownWarriors
        if (lastKnownWarriors.length) {
            warriorsAtStart = lastKnownWarriors.slice();
            log(debug ? '[DEBUG] Warriors captured (lastKnownWarriors)' : '✅ Warriors captured:', warriorsAtStart);
            return true;
        }
        // 3) parsed.f.w
        if (window._dl_teamParsedFW) {
            const parsedList = Object.values(window._dl_teamParsedFW)
                .filter(f => f.originalId != null && typeof f.name === 'string');
            if (parsedList.length) {
                warriorsAtStart = parsedList.map(f => ({
                    FighterId: String(f.originalId),
                    Name: f.name,
                    Profession: f.prof
                        ? (professionMap[String(f.prof).toLowerCase()] || `Nieznana(${f.prof})`)
                        : 'Mob',
                    Team: f.team || 0,
                    Level: f.lvl || 0
                }));
                log(debug ? '[DEBUG] Warriors captured (parsed.f.w)' : '✅ Warriors captured:', warriorsAtStart);
                return true;
            }
        }
        if (debug) log('[DEBUG] warriorsList EMPTY at captureWarriors');
        return false;
    }

    function resetDLCache() {
        window._dl_teamParsedFW = null;
        window._dl_lastWarriorsListTurn = null;
        window._dl_sentItemHids = new Set();
        sentLootEvents.clear();
        log('[DL][DEBUG] Loot cache zresetowany');
    }

    function buildBattleDto() {
        const fighters = warriorsAtStart.map(f => ({
            FighterId: f.FighterId,
            Name: f.Name,
            Profession: f.Profession,
            Team: f.Team
        }));
        log('[DEBUG] buildBattleDto fighters:', fighters);
        return {
            BattleStart: battleStartText,
            Fighters: fighters,
            Logs: accumulatedLogs,
            ServerName: (location.hostname.match(/^([\w\d]+)\.margonem\.pl$/) || [])[1] || ''
        };
    }

    function buildLootDto(items, lootCache = {}) {
        const source = typeof lootCache.source === 'string' ? lootCache.source : '';
        const mobParts = [];
        const lootUsers = [];
        let participants = {};

        if (source.toLowerCase().includes('fight') && Engine.battle?.warriorsList && Object.keys(Engine.battle.warriorsList).length) {
            participants = { ...Engine.battle.warriorsList };
        } else {
            participants = { ...(window._dl_lastWarriorsListTurn || {}), ...(window._dl_teamParsedFW || {}) };
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
                lootUsers.push({
                    GameUserId: String(id),
                    Nick: name,
                    Level: f.lvl || 0,
                    ClassAbbr: f.prof || '',
                    AvatarUrl: f.icon ? window.CFG.a_opath + f.icon.replace(/^\//, '') : ''
                });
            }
        });

        return {
            creationTime: new Date().toISOString(),
            serverName: (location.hostname.match(/^([\w\d]+)\.margonem\.pl$/) || [])[1] || '',
            clanName: (() => { try { const c = Engine.hero.d.clan; return typeof c === 'object' ? c.name : c; } catch { return ''; } })(),
            mapName: (() => { try { return Engine.map.d.name; } catch { return ''; } })(),
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
            .then(res => res.status === 'ok' ? log('[DL] Loot sent') : console.error('[DL] Error', res))
            .catch(err => console.error('[DL] Conn error', err));
    }

    // --- Patch Engine.communication.successData ---
    (function patchCommunication() {
        if (!window.Engine?.communication || window.Engine.communication._dfdl_patched) return;
        const orig = Engine.communication.successData;

        Engine.communication.successData = function (response) {
            let parsed;
            try { parsed = JSON.parse(response); }
            catch { return orig.apply(this, arguments); }

            if (parsed.f?.w) {
                window._dl_teamParsedFW = parsed.f.w;
                log('[DEBUG] parsed.f.w', parsed.f.w);
            }

            // Loot
            if (parsed.loot && parsed.ev != null && parsed.item) {
                const lootId = parsed.ev;
                if (!sentLootEvents.has(lootId)) {
                    const items = Object.values(parsed.item)
                        .filter(it => !window._dl_sentItemHids.has(it.hid) && it.loc === 'l')
                        .map(it => { window._dl_sentItemHids.add(it.hid); return { itemHtml: JSON.stringify(it), ItemImgUrl: window.CFG.a_ipath + it.icon }; });
                    const dtoLoot = buildLootDto(items, { items: parsed.item, source: parsed.loot.source });
                    if (dtoLoot.items.length && String(parsed.loot.source).toLowerCase().includes('fight')) {
                        log('[DL] Wysyłam loot z walki do serwera');
                        sendLootToServer(dtoLoot);
                        sentLootEvents.add(lootId);
                    }
                }
            }

            // Logs
            if (parsed.f?.m && Array.isArray(parsed.f.m)) {
                accumulatedLogs.push(...parsed.f.m.filter(t => typeof t === 'string'));
            }

            // Koniec walki
            if (parsed.f?.m && parsed.f.m.some(line => typeof line === 'string' && line.includes('winner='))) {
                const result = orig.apply(this, arguments);

                captureWarriors();
                if (!warriorsAtStart.length) {
                    log('[DEBUG] warriorsAtStart pusty, ponowna próba captureWarriors');
                    captureWarriors();
                }

                if (!battleProcessed) {
                    const dto = buildBattleDto();
                    const fighters = dto.Fighters || [];

                    // Guardy
                    if (!fighters.length || !battleStartText || fighters.some(f => Number(f.FighterId) < 0)) {
                        battleProcessed = true;
                        startHandled = false;
                        warriorsAtStart = [];
                        battleStartText = '';
                        accumulatedLogs = [];
                        return result;
                    }

                    // ==== Delay-guard przed duplikatami ====
                    const now = Date.now();
                    if (now - lastBattleSentTime < DUPLICATE_DELAY) {
                        log('[BATTLE] zbyt szybka powtórka, pomijam wysyłkę');
                    } else {
                        lastBattleSentTime = now;
                        log('[DEBUG] Battle DTO:', dto);
                        fetch(API_URL_BATTLE, {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(dto)
                        })
                            .then(r => log('[DEBUG] Battle fetch status:', r.status))
                            .catch(err => warn('[BATTLE] conn err', err));
                    }

                    // reset stanu
                    battleProcessed = true;
                    startHandled = false;
                    warriorsAtStart = [];
                    lastKnownWarriors = [];
                    battleStartText = '';
                    accumulatedLogs = [];
                    log('[BATTLE] stan po walce wyczyszczony');
                }

                return result;
            }

            return orig.apply(this, arguments);
        };

        Engine.communication._dfdl_patched = true;
    })();

    // --- Patch Engine.battle.updateData ---
    (function patchUpdateData() {
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
                log('[DEBUG] lastKnownWarriors updated:', lastKnownWarriors);
            }
            return res;
        };
        Engine.battle._dfdl_patchedTurn = true;
    })();

    // --- Obserwator startu walki ---
    new MutationObserver(records => {
        records.forEach(rec => rec.addedNodes.forEach(node => {
            if (node.nodeType !== 1 || !node.classList.contains('battle-msg')) return;
            const text = node.innerText.trim();
            if (!startHandled && text.startsWith('Rozpoczęła się walka')) {
                startHandled = true;
                battleProcessed = false;
                battleStartText = text;
                warriorsAtStart = [];
                lastKnownWarriors = [];
                accumulatedLogs = [];
                resetDLCache();
                log('🔔 Battle START:', text);
                captureWarriors(true);
            }
        }));
    }).observe(document.body, { childList: true, subtree: true });

    // --- UI button & window ---
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
        win.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#181c22;color:white;border:2px solid #18a8ff;border-radius:18px;z-index:10001;padding:38px 28px 24px 28px;box-shadow:0 4px 32px #000b;';
        win.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;">
        <span style="font-size:30px;width:38px;height:38px;border-radius:50%;background:#23272e;border:2px solid #18a8ff;text-align:center;line-height:36px;box-shadow:0 0 16px #31c6ff55;">
          <b style="font-size:22px;letter-spacing:2px;color:#18a8ff;">DL</b>
        </span>
        <span style="font-size:20px;">Lootlog</span>
      </div>
      <div id="dl-status" style="margin:18px 0;">Sprawdzanie sesji...</div>
      <button id="dl-session-btn" style="display:none;margin-right:10px;padding:7px 18px;font-size:16px;background:#0056d6;color:white;border:none;border-radius:7px;cursor:pointer;">Sprawdź sesję</button>
      <button id="dl-close-btn" style="position:absolute;top:10px;right:18px;font-size:18px;background:none;color:#bbb;border:none;cursor:pointer;">×</button>
    `;
        document.body.appendChild(win);
        win.querySelector('#dl-close-btn').onclick = () => win.remove();
        win.querySelector('#dl-session-btn').onclick = checkSession;
        checkSession();
    }

    function checkSession() {
        const status = document.getElementById('dl-status');
        const sessBtn = document.getElementById('dl-session-btn');
        if (status) status.textContent = 'Sprawdzanie sesji...';
        fetch('https://localhost:7238/api/lootlog/check', { credentials: 'include' })
            .then(r => r.json())
            .then(r => {
                if (r.status === 'ok') {
                    status.innerHTML = '<span style="color:#24e000;font-weight:bold;">Jesteś zalogowany!</span>';
                    sessBtn.style.display = 'none';
                } else {
                    status.innerHTML = '<span style="color:#ff5555;font-weight:bold;">Nie jesteś zalogowany!</span><br><a href="https://localhost:7238/Identity/Account/Login" target="_blank" style="color:#18a8ff;">Kliknij, aby się zalogować</a>';
                    sessBtn.style.display = 'inline-block';
                }
            })
            .catch(() => { if (status) status.innerHTML = '<span style="color:#ff5555;">Błąd połączenia!</span>'; });
    }

    log('Script loaded.');
})();
