// ==UserScript==
// @name         DarkLog v3.7.1
// @version      3.7.1
// @description  Naprawa podwójnego lootu
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
    window._dl_lootCache = {};
    window._dl_sentItemHids = window._dl_sentItemHids || new Set();
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
                    window._dl_lootCache = window._dl_lootCache || {};
                    window._dl_lootCache[parsed.ev] = {
                        items: { ...parsed.item },
                        source: parsed.loot.source
                    };
                    window._dl_lastLootEventId = parsed.ev;
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

        const lootCache = window._dl_lootCache && window._dl_lootCache[window._dl_lastLootEventId];
        if (!lootCache) {
            console.log('[DL] Brak cache dla eventu', window._dl_lastLootEventId);
            return;
        }

        if (lootCache.source === 'fight') {
            try {
                if (Engine.battle && Engine.battle.warriorsList) {
                    window._dl_lastWarriorsListTurn = { ...Engine.battle.warriorsList };
                }
            } catch { }
        }

        // przygotuj items: tylko nie-wysłane dotąd hid
        const items = [];
        const respItems = lootCache.items;
        if (respItems && typeof respItems === 'object') {
            Object.values(respItems).forEach(it => {
                if (window._dl_sentItemHids.has(it.hid)) return;
                items.push({
                    itemHtml: JSON.stringify(it),
                    ItemImgUrl: window.CFG.a_ipath + it.icon
                });
                window._dl_sentItemHids.add(it.hid);
            });
        }

        const dto = buildDto(items, lootCache.source);

        if (!dto.lootUsers || dto.lootUsers.length === 0 || !dto.mobName || !dto.items || dto.items.length === 0) {
            console.log('[DL] Brak walczących/mobName/items, pomijam event:', window._dl_lastLootEventId);
            sentLootEvents.add(window._dl_lastLootEventId);
            delete window._dl_lootCache[window._dl_lastLootEventId];
            window._dl_lastLootEventId = null;
            return;
        }

        console.log('[DL] Sending DTO via observer:', dto);
        sendLootToServer(dto);
        sentLootEvents.add(window._dl_lastLootEventId);
        delete window._dl_lootCache[window._dl_lastLootEventId];
        window._dl_lastLootEventId = null;
    }

    // Najlepszy możliwy fallback dla nazw postaci i mobów
    function getBestName(obj) {
        if (!obj) return "";
        // Najczęstsze pola na nicka/moba
        let name = obj.name || obj.n || obj.nick || obj.Nick || obj.imie || "";
        // Margonem czasem trzyma imię w dziwnych polach
        if (!name && obj.d && (obj.d.nick || obj.d.name)) {
            name = obj.d.nick || obj.d.name;
        }
        // Jeżeli to boss/heros, sprawdź custom
        if (obj.type && typeof obj.type === "string") {
            if (obj.type.includes("heros") || obj.type.includes("elita") || obj.type.includes("tytan")) {
                // Możesz tu dorzucić specjalne reguły, np. "Fobos (heros)" itp.
                name = (name || "") + " (" + obj.type + ")";
            }
        }
        // Ostateczny fallback
        if (!name) name = "[Brak nazwy]";
        return name;
    }

    // ─── BUILD DTO z lepszym wyciąganiem nicków/nazw ─────────────────────────
    function buildDto(items, source) {
        const mobParts = [];
        const lootUsers = [];
        const fw = (source === 'fight')
            ? (window._dl_teamParsedFW || window._dl_lastWarriorsListTurn || {})
            : {};

        Object.entries(fw).forEach(([k, e]) => {
            const id = +k;
            if (isNaN(id)) return;

            // MOBY
            if (id < 0) {
                const name = getBestName(e);
                const lvl = e.lvl != null ? e.lvl : '';
                const prof = e.prof || '';
                mobParts.push(`${name}(${lvl}${prof})`);
            }
            // GRACZE
            else {
                lootUsers.push({
                    GameUserId: String(id),
                    Nick: getBestName(e),
                    Level: e.lvl || 0,
                    ClassAbbr: e.prof || '',
                    AvatarUrl: e.icon ? CFG.a_opath + e.icon.replace(/^\//, '') : ''
                });
            }
        });

        // Jeśli po walce z herosem/bossem masz pustą nazwę - daj fallback "[Brak nazwy]"
        let mobName = mobParts.filter(Boolean).join('\n') || "[Brak nazwy]";
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

    // (OPCJONALNIE) Jeśli chcesz czyścić wszystko po evencie:
    function resetDLCache() {
        window._dl_teamParsedFW = null;
        window._dl_lastWarriorsListTurn = null;
        window._dl_lastLootEventId = null;
        window._dl_lootCache = {};
        window._dl_sentItemHids = new Set();
    }

})();
