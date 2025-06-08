// ==UserScript==
// @name         DarkLog v3.6.8
// @version      3.6.8
// @description  Wyślij loot natychmiast po otwarciu okna loot; pomiń, jeśli brak walczących; UI bez zmian.
// @author       Dark-Sad
// @match        http://*.margonem.pl/
// @match        https://*.margonem.pl/
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ─── GLOBALNE ───────────────────────────────────────────────────────────
    window._dl_teamParsedFW = null;
    window._dl_lastWarriorsListTurn = null;
    window._dl_lastLootEventId = null;
    window._dl_lastLootItems = null;
    window._dl_lastLootSource = null;
    let sessionChecked = false;
    const sentLootEvents = new Set();

    // ─── PATCH FAST/TEAM FIGHT ──────────────────────────────────────────────
    function patchSuccessDataTeam() {
        if (window.Engine && Engine.communication && !Engine.communication._dl_patchedTeam) {
            const orig = Engine.communication.successData;
            Engine.communication.successData = function (jsonStr) {
                let parsed;
                try { parsed = JSON.parse(jsonStr); }
                catch { return orig.apply(this, arguments); }

                if (parsed.f && parsed.f.w) {
                    window._dl_teamParsedFW = parsed.f.w;
                }
                if (parsed.loot && parsed.ev != null && parsed.item) {
                    window._dl_lastLootEventId = parsed.ev;
                    window._dl_lastLootItems = { ...parsed.item };
                    window._dl_lastLootSource = parsed.loot.source;
                }
                return orig.apply(this, arguments);
            };
            Engine.communication._dl_patchedTeam = true;
        }
    }

    // ─── PATCH TURN-BASED FIGHT ───────────────────────────────────────────────
    function patchBattleUpdateDataTurn() {
        if (window.Engine && Engine.battle && !Engine.battle._dl_patchedTurn) {
            const orig = Engine.battle.updateData;
            Engine.battle.updateData = function (data) {
                const res = orig.apply(this, arguments);
                if (data.f && data.f.w) {
                    window._dl_teamParsedFW = data.f.w;
                }
                if (this.warriorsList) {
                    window._dl_lastWarriorsListTurn = { ...this.warriorsList };
                }
                return res;
            };
            Engine.battle._dl_patchedTurn = true;
        }
    }

    // ─── URUCHOM PATCHE CO 500ms ──────────────────────────────────────────────
    const patchInterval = setInterval(() => {
        patchSuccessDataTeam();
        patchBattleUpdateDataTurn();
        if (Engine.communication._dl_patchedTeam && Engine.battle._dl_patchedTurn) {
            clearInterval(patchInterval);
        }
    }, 500);

    // ─── UI: PRZYCISK DL ─────────────────────────────────────────────────────
    const btn = document.createElement("button");
    btn.id = "dl-lootlog-btn";
    btn.innerHTML = '<b style="font-size:22px;letter-spacing:2px;">DL</b>';
    Object.assign(btn.style, {
        position: "fixed", bottom: "30px", left: "30px", zIndex: "10000",
        background: "#23272e", color: "white", border: "2px solid #18a8ff",
        borderRadius: "42px", padding: "10px 24px", cursor: "pointer",
        boxShadow: "0 2px 12px #0006", fontWeight: "bold",
        fontFamily: "Arial, sans-serif", fontSize: "21px",
        transition: "transform 0.1s, border 0.2s"
    });
    btn.onmouseover = () => { btn.style.transform = "scale(1.08)"; btn.style.borderColor = "#31c6ff"; };
    btn.onmouseleave = () => { btn.style.transform = "scale(1)"; btn.style.borderColor = "#18a8ff"; };
    document.body.appendChild(btn);

    // ─── UI: OKNO SESJI ───────────────────────────────────────────────────────
    function showDLWindow() {
        if (document.getElementById("dl-lootlog-window")) return;
        const win = document.createElement("div");
        win.id = "dl-lootlog-window";
        win.style.cssText =
            'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
            'background:#181c22;color:white;border:2.5px solid #18a8ff;' +
            'border-radius:18px;z-index:10001;padding:38px 28px 24px 28px;' +
            'box-shadow:0 4px 32px #000b;';
        win.innerHTML =
            `<div style="display:flex;align-items:center;gap:16px;">
                <span style="font-size:30px;width:38px;height:38px;border-radius:50%;
                             background:#23272e;border:2.5px solid #18a8ff;text-align:center;
                             line-height:36px;box-shadow:0 0 16px #31c6ff55;">
                    <b style="font-size:22px;letter-spacing:2px;color:#18a8ff;">DL</b>
                </span>
                <span style="font-size:20px;">Lootlog</span>
            </div>
            <div id="dl-status" style="margin:18px 0;">Sprawdzanie sesji...</div>
            <button id="dl-session-btn" style="display:none;margin-right:10px;
                    padding:7px 18px;font-size:16px;background:#0056d6;color:white;
                    border:none;border-radius:7px;cursor:pointer;">
                Sprawdź sesję
            </button>
            <button id="dl-close-btn" style="position:absolute;top:10px;right:18px;
                    font-size:18px;background:none;color:#bbb;border:none;cursor:pointer;">
                &times;
            </button>`;
        document.body.appendChild(win);
        win.querySelector('#dl-close-btn').onclick = () => win.remove();
        win.querySelector('#dl-session-btn').onclick = checkSession;
        checkSession();
    }
    btn.onclick = showDLWindow;

    // ─── SPRAWDZANIE SESJI ─────────────────────────────────────────────────────
    function checkSession() {
        const status = document.getElementById("dl-status");
        const sessBtn = document.getElementById("dl-session-btn");
        if (status) status.textContent = "Sprawdzanie sesji...";
        fetch("https://localhost:7238/api/lootlog/check", { credentials: "include" })
            .then(r => r.json())
            .then(r => {
                sessionChecked = true;
                if (r.status === "ok") {
                    status.innerHTML = '<span style="color:#24e000;font-weight:bold;">Jesteś zalogowany!</span>';
                    sessBtn.style.display = "none";
                } else {
                    status.innerHTML =
                        '<span style="color:#ff5555;font-weight:bold;">Nie jesteś zalogowany!</span><br>' +
                        '<a href="https://localhost:7238/Identity/Account/Login" target="_blank" style="color:#18a8ff;">Kliknij, aby się zalogować</a>';
                    sessBtn.style.display = "inline-block";
                }
            })
            .catch(() => {
                if (status) status.innerHTML = '<span style="color:#ff5555;">Błąd połączenia z serwerem!</span>';
            });
    }
    checkSession();

    // ─── OBSERVER: wyślij loot natychmiast po otwarciu okna ───────────────────
    const observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList.contains('loot-wnd')) {
                    sendCachedLoot();
                }
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    function sendCachedLoot() {
        if (!sessionChecked ||
            !window._dl_lastLootEventId ||
            sentLootEvents.has(window._dl_lastLootEventId)) {
            return;
        }

        // przygotuj items
        const items = [];
        const respItems = window._dl_lastLootItems;
        if (respItems && typeof respItems === 'object') {
            Object.values(respItems).forEach(it => {
                if (it.icon) {
                    items.push({
                        itemHtml: JSON.stringify(it),
                        ItemImgUrl: window.CFG.a_ipath + it.icon
                    });
                }
            });
        }

        // zbuduj dto
        const dto = buildDto(items);

        // jeśli brak graczy, pomiń NPC
        if (!dto.lootUsers || dto.lootUsers.length === 0) {
            console.log('[DL] Brak walczących, pomijam event:', window._dl_lastLootEventId);
            sentLootEvents.add(window._dl_lastLootEventId);
            return;
        }

        console.log('[DL] Sending DTO via observer:', dto);
        sendLootToServer(dto);
        sentLootEvents.add(window._dl_lastLootEventId);
    }

    // ─── BUILD DTO z filtrem NPC ────────────────────────────────────────────
    function buildDto(items) {
        const mobParts = [];
        const lootUsers = [];
        const source = window._dl_lastLootSource;

        const fw = (source === 'fight')
            ? (window._dl_teamParsedFW || window._dl_lastWarriorsListTurn || {})
            : {};

        Object.entries(fw).forEach(([k, e]) => {
            const id = +k;
            if (isNaN(id)) return;

            if (id < 0) {
                const name = e.name || e.n || e.nick || '';
                const lvl = e.lvl != null ? e.lvl : '';
                const prof = e.prof || '';
                mobParts.push(`${name}(${lvl}${prof})`);
            } else {
                lootUsers.push({
                    GameUserId: String(id),
                    Nick: e.name || e.n || e.nick || '',
                    Level: e.lvl || 0,
                    ClassAbbr: e.prof || '',
                    AvatarUrl: e.icon ? CFG.a_opath + e.icon.replace(/^\//, '') : ''
                });
            }
        });

        const mobName = mobParts.join('\n');
        let mapName = '';
        let serverName = '';
        let clanName = '';
        try { mapName = Engine.map.d.name || ''; } catch { }
        serverName = (location.hostname.match(/^([\w\d]+)\.margonem\.pl$/) || [])[1] || '';
        try {
            clanName = typeof Engine.hero.d.clan === 'object'
                ? Engine.hero.d.clan.name
                : Engine.hero.d.clan || '';
        } catch { }

        return {
            creationTime: new Date().toISOString(),
            serverName,
            clanName,
            mapName,
            mobName,
            isActive: true,
            isDeleted: false,
            lootUsers,
            items
        };
    }

    // ─── SEND TO SERVER ───────────────────────────────────────────────────────
    function sendLootToServer(dto) {
        fetch('https://localhost:7238/api/lootlog/add', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        })
            .then(r => r.json())
            .then(res => {
                if (res.status === 'ok') console.log('[DL] Loot sent');
                else console.error('[DL] Error:', res);
            })
            .catch(err => console.error('[DL] Conn error:', err));
    }

})();
