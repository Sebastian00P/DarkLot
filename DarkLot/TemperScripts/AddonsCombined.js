// ==UserScript==
// @name          DarkFights + DarkLog
// @namespace     http://tampermonkey.net/
// @version       2025-06-14.05
// @description   Warriors, RAWLOG + lootlog: pełny RAWLOG, PvP-only walki, fallback live/parsing, natychmiastowa wysyłka
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
    const DUPLICATE_DELAY = 5000;

    let lastBattleSentTime = 0;
    let warriorsAtStart = [];
    let battleProcessed = false;
    let startHandled = false;
    let battleStartText = '';
    let accumulatedLogs = [];

    window._dl_teamParsedFW = null;
    window._dl_lastWarriorsListTurn = null;
    window._dl_sentItemHids = window._dl_sentItemHids || new Set();
    const sentLootEvents = new Set();

    function log(...a) { console.log('[DF+DL]', ...a); }
    function warn(...a) { console.warn('[DF+DL][WARN]', ...a); }
    function dbg(...a) { console.debug('[DF+DL][DEBUG]', ...a); }
    function getBestName(o) { return o && typeof o.name === 'string' ? o.name : ''; }

    // --- capture live warriorsList ---
    function captureWarriors(debug = false) {
        const live = window.Engine?.battle?.warriorsList
            ? Object.values(window.Engine.battle.warriorsList)
            : [];
        if (!live.length) return false;

        window._dl_lastWarriorsListTurn = {};
        for (const [id, obj] of Object.entries(window.Engine.battle.warriorsList)) {
            window._dl_lastWarriorsListTurn[id] = obj;
        }

        warriorsAtStart = live.map(f => {
            const isMob = f.npc === 1 || (typeof f.npc !== 'number' && f.id < 0);
            return {
                FighterId: String(f.id),
                Name: getBestName(f),
                Profession: isMob
                    ? (f.prof ? `Mob(${f.prof})` : 'Mob')
                    : (professionMap[String(f.prof).toLowerCase()] || `Nieznana(${f.prof})`),
                Team: f.team || 0,
                Level: f.lvl || 0,
                IsMob: isMob
            };
        });
        log(debug ? '[DEBUG] Warriors captured (live)' : '✅ Warriors captured:', warriorsAtStart);
        return true;
    }

    function resetDLCache() {
        window._dl_lastWarriorsListTurn = null;
        window._dl_sentItemHids = new Set();
        sentLootEvents.clear();
        dbg('Loot cache reset');
    }

    function buildBattleDto() {
        const fighters = warriorsAtStart.map(f => ({
            FighterId: f.FighterId,
            Name: f.Name,
            Profession: f.Profession,
            Team: f.Team,
            Level: f.Level,
            IsMob: f.IsMob
        }));
        dbg('buildBattleDto fighters:', fighters);
        return {
            BattleStart: generateBattleStartText(fighters),
            Fighters: fighters,
            Logs: accumulatedLogs,
            ServerName: (location.hostname.match(/^([\w\d]+)\.margonem\.pl$/) || [])[1] || ''
        };
    }

    function generateBattleStartText(fighters) {
        const t1 = fighters.filter(x => x.Team === 1),
            t2 = fighters.filter(x => x.Team === 2);
        const fmt = team => team.map(x => {
            const abbr = Object.fromEntries(Object.entries(professionMap).map(([k, v]) => [v, k]))[x.Profession] || '';
            return `${x.Name} (${x.Level}${abbr})`;
        }).join(', ');
        return `Rozpoczęła się walka pomiędzy ${fmt(t1)} a ${fmt(t2)}`;
    }

    // --- build loot DTO ---
    function buildLootDto(items, { party = {}, owners = {}, npcs = [] } = {}) {
        const cached = window._dl_lastWarriorsListTurn || {};
        const parsedFW = window._dl_teamParsedFW || {};

        const participants = {
            ...party,
            ...owners,
            ...Object.fromEntries(
                Object.entries(parsedFW).map(([k, v]) => [k, {
                    name: v.name, lvl: v.lvl, prof: v.prof, icon: v.icon
                }])
            ),
            ...cached
        };
        dbg('Merged participants:', participants);

        const mobParts = [];
        const lootUsers = [];

        // players
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

        // mobs via npcs_del
        npcs.forEach(npc => {
            const entry = Object.values(parsedFW).find(f => f.originalId === npc.id);
            if (entry) {
                const lvl = entry.lvl || 0, prof = entry.prof || '';
                mobParts.push(`${entry.name}(${lvl}${prof})`);
            }
        });

        dbg('Built lootUsers:', lootUsers);
        dbg('Built mobName:', mobParts.join('\n'));

        return {
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
    }

    function sendLootToServer(dto) {
        fetch(API_URL_LOOT, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        })
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(res => res.status === 'ok' ? log('[DL] Loot sent') : console.error('[DL] API error', res))
            .catch(err => warn('[DL] sendLootToServer failed', err));
    }

    // --- patch communication ---
    (function () {
        if (!window.Engine?.communication || Engine.communication._dfdl_patched) return;
        const orig = Engine.communication.successData;

        Engine.communication.successData = function (response) {
            let parsed;
            try { parsed = JSON.parse(response); }
            catch { return orig.apply(this, arguments); }

            // parsed.f.w
            if (parsed.f?.w) {
                window._dl_teamParsedFW = parsed.f.w;
                dbg('parsed.f.w', parsed.f.w);
            }

            // LOOT
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

                    dbg('party.members:', partyMembers);
                    dbg('owners:', owners);
                    dbg('npcs_del:', npcs);

                    const dtoLoot = buildLootDto(items, { party: partyMembers, owners, npcs });
                    if (dtoLoot.items.length) {
                        log('[DL] Sending loot DTO');
                        sendLootToServer(dtoLoot);
                        sentLootEvents.add(lootId);
                    }
                }
            }

            // RAWLOG
            if (parsed.f?.m && Array.isArray(parsed.f.m)) {
                accumulatedLogs.push(...parsed.f.m.filter(t => typeof t === 'string'));
            }

            // BATTLE END
            const isBattleEnd = parsed.f?.m?.some(l => typeof l === 'string' && l.includes('winner='));
            if (isBattleEnd) {
                const result = orig.apply(this, arguments);

                // capture live or fallback parsedFW
                captureWarriors();
                if (!warriorsAtStart.length && window._dl_teamParsedFW) {
                    warriorsAtStart = Object.values(window._dl_teamParsedFW).map(f => {
                        const isMob = f.npc === 1;
                        return {
                            FighterId: String(f.originalId),
                            Name: f.name,
                            Profession: isMob
                                ? (f.prof ? `Mob(${f.prof})` : 'Mob')
                                : (professionMap[String(f.prof).toLowerCase()] || `Nieznana(${f.prof})`),
                            Team: f.team || 0,
                            Level: f.lvl || 0,
                            IsMob: isMob
                        };
                    });
                    dbg('fallback Warriors from parsedFW:', warriorsAtStart);
                }

                if (warriorsAtStart.length) {
                    const dto = buildBattleDto();
                    const players = new Set(dto.Fighters.filter(f => !f.IsMob).map(f => f.Team));
                    if (dto.Fighters.length && battleStartText && players.size >= 2) {
                        const now = Date.now();
                        if (now - lastBattleSentTime >= DUPLICATE_DELAY) {
                            lastBattleSentTime = now;
                            log('[BATTLE] Sending DTO:', dto);
                            fetch(API_URL_BATTLE, {
                                method: 'POST', credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(dto)
                            })
                                .then(r => log('[BATTLE] status', r.status))
                                .catch(err => warn('[BATTLE] error', err));
                        } else {
                            log('[BATTLE] duplicate skipped');
                        }
                    } else {
                        log('[BATTLE] skipping PvE or invalid data');
                    }
                } else {
                    log('[BATTLE] no warriorsAtStart, skipping');
                }

                // reset
                battleProcessed = true;
                startHandled = false;
                warriorsAtStart = [];
                battleStartText = '';
                accumulatedLogs = [];

                return result;
            }

            return orig.apply(this, arguments);
        };

        Engine.communication._dfdl_patched = true;
    })();

    // --- observer for battle start ---
    new MutationObserver(records => {
        for (const rec of records) for (const node of rec.addedNodes) {
            if (node.nodeType !== 1 || !node.classList.contains('battle-msg')) continue;
            const text = node.innerText.trim();
            if (!startHandled && text.startsWith('Rozpoczęła się walka')) {
                startHandled = true;
                battleProcessed = false;
                battleStartText = text;
                warriorsAtStart = [];
                accumulatedLogs = [];
                resetDLCache();
                log('🔔 Battle START:', text);
                captureWarriors(true);
            }
        }
    }).observe(document.body, { childList: true, subtree: true });

    // --- UI button ---
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

    log('Script loaded.');
})();
