// ==UserScript==
// @name         DarkLog
// @version      3.3.7
// @description  Automatyczne wysyłanie lootu do DarkLot! Działa dla fast fight, turowej walki i grupowej drużyny, bez wywalania gry.
// @author       Dark-Sad (zmodyfikowane przez ChatGPT)
// @match        http://*.margonem.pl/
// @match        https://*.margonem.pl/
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    //
    // ─── 0. GLOBALNE ZMIENNE ──────────────────────────────────────────────────────────
    //
    // Przechowujemy ostatni parsed.f.w (fast/team fight) oraz warriorsList (turn-based)
    window._dl_teamParsedFW = null;
    window._dl_lastWarriorsListTurn = null;


    //
    // ─── 1. PATCH: fast fight i team fight → Engine.communication.successData ─────────
    //
    function patchSuccessDataTeam() {
        if (
            window.Engine &&
            Engine.communication &&
            typeof Engine.communication.successData === 'function' &&
            !Engine.communication._dl_patchedTeam
        ) {
            const orig = Engine.communication.successData;
            Engine.communication.successData = function (...args) {
                const response = args[0];
                let parsed;
                try {
                    parsed = JSON.parse(response);
                } catch {
                    return orig.apply(this, args);
                }
                if (parsed.f && parsed.f.w) {
                    // Jeżeli parsed.f.w ma przynajmniej jeden wpis z polem "name", aktualizujemy cache
                    const w = parsed.f.w;
                    let hasName = false;
                    for (const key in w) {
                        const entry = w[key];
                        if (entry && (entry.name || entry.n || entry.nick)) {
                            hasName = true;
                            break;
                        }
                    }
                    if (hasName) {
                        window._dl_teamParsedFW = w;
                    }
                }
                return orig.apply(this, args);
            };
            Engine.communication._dl_patchedTeam = true;
            console.log("[DL] Patch successData (fast/team) włączony");
        }
    }

    //
    // ─── 2. PATCH: turowa walka → Engine.battle.updateData ────────────────────────────
    //
    function patchBattleUpdateDataTurn() {
        if (
            window.Engine &&
            Engine.battle &&
            typeof Engine.battle.updateData === 'function' &&
            !Engine.battle._dl_patchedTurn
        ) {
            const origUpdate = Engine.battle.updateData;
            Engine.battle.updateData = function (...args) {
                const data = args[0];
                let res;
                try {
                    res = origUpdate.apply(this, args);
                } catch (e) {
                    console.warn("[DL] Błąd oryginalnego updateData:", e);
                    return;
                }
                try {
                    // Gdy data.f.w istnieje (fast fight wewnątrz turn-based), odświeżamy parsedFW
                    if (data && data.f && data.f.w) {
                        window._dl_teamParsedFW = data.f.w;
                    }
                    // Zapisujemy warriorsList, jeśli zawiera graczy
                    if (this.warriorsList) {
                        const wl = this.warriorsList;
                        const hasPlayer = Object.keys(wl).some(key => {
                            const idNum = parseInt(key, 10);
                            return !isNaN(idNum) && idNum > 0;
                        });
                        if (hasPlayer) {
                            window._dl_lastWarriorsListTurn = Object.assign({}, wl);
                        }
                    }
                } catch (e) {
                    console.warn("[DL] Błąd w patchBattleUpdateDataTurn:", e);
                }
                return res;
            };
            Engine.battle._dl_patchedTurn = true;
            console.log("[DL] Patch updateData (turn) włączony");
        }
    }

    // Uruchamiamy patche co 500 ms, aż się wykonały
    const patchInterval = setInterval(() => {
        try {
            patchSuccessDataTeam();
            patchBattleUpdateDataTurn();
            if (
                Engine.communication && Engine.communication._dl_patchedTeam &&
                Engine.battle && Engine.battle._dl_patchedTurn
            ) {
                clearInterval(patchInterval);
            }
        } catch { }
    }, 500);


    //
    // ─── 3. TWORZENIE PRZYCISKU „DL” ─────────────────────────────────────────────────
    //
    const btn = document.createElement("button");
    btn.id = "dl-lootlog-btn";
    btn.innerHTML = '<b style="font-size: 22px; letter-spacing:2px;">DL</b>';
    btn.style.position = "fixed";
    btn.style.bottom = "30px";
    btn.style.left = "30px";
    btn.style.zIndex = "10000";
    btn.style.background = "#23272e";
    btn.style.color = "white";
    btn.style.border = "2px solid #18a8ff";
    btn.style.borderRadius = "42px";
    btn.style.padding = "10px 24px 10px 24px";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0 2px 12px #0006";
    btn.style.fontWeight = "bold";
    btn.style.fontFamily = "Arial, sans-serif";
    btn.style.fontSize = "21px";
    btn.style.transition = "transform 0.1s, border 0.2s";
    btn.onmouseover = () => { btn.style.transform = "scale(1.08)"; btn.style.borderColor = "#31c6ff"; };
    btn.onmouseleave = () => { btn.style.transform = "scale(1.0)"; btn.style.borderColor = "#18a8ff"; };
    document.body.appendChild(btn);


    //
    // ─── 4. OKNO LOGOWANIA / SESJI ───────────────────────────────────────────────────
    //
    function showDLWindow() {
        if (document.getElementById("dl-lootlog-window")) return;
        const win = document.createElement("div");
        win.id = "dl-lootlog-window";
        win.style.position = "fixed";
        win.style.top = "50%";
        win.style.left = "50%";
        win.style.transform = "translate(-50%, -50%)";
        win.style.background = "#181c22";
        win.style.color = "white";
        win.style.border = "2.5px solid #18a8ff";
        win.style.borderRadius = "18px";
        win.style.zIndex = "10001";
        win.style.padding = "38px 28px 24px 28px";
        win.style.boxShadow = "0 4px 32px #000b";
        win.innerHTML = `
            <div style="display: flex; align-items: center; gap: 16px;">
                <span style="font-size: 30px; display: inline-block; width: 38px; height: 38px; border-radius: 50%; background: #23272e; border: 2.5px solid #18a8ff; text-align: center; line-height: 36px; box-shadow: 0 0 16px #31c6ff55;">
                    <b style="font-size: 22px; letter-spacing: 2px; color: #18a8ff;">DL</b>
                </span>
                <span style="font-size: 20px;">Lootlog</span>
            </div>
            <div id="dl-status" style="margin-top: 18px; margin-bottom: 18px;">Sprawdzanie sesji...</div>
            <button id="dl-session-btn" style="display: none; margin-right: 10px; padding: 7px 18px; font-size: 16px; background: #0056d6; color: white; border: none; border-radius: 7px; cursor: pointer;">Sprawdź sesję</button>
            <button id="dl-close-btn" style="position: absolute; top: 10px; right: 18px; font-size: 18px; background: none; color: #bbb; border: none; cursor: pointer;">&times;</button>
        `;
        document.body.appendChild(win);
        document.getElementById("dl-close-btn").onclick = () => win.remove();
        document.getElementById("dl-session-btn").onclick = checkSession;
        checkSession();
    }
    btn.onclick = showDLWindow;


    //
    // ─── 5. SPRAWDZANIE SESJI ───────────────────────────────────────────────────────
    //
    function checkSession() {
        const status = document.getElementById("dl-status");
        if (status) status.textContent = "Sprawdzanie sesji...";
        fetch("https://localhost:7238/api/lootlog/check", { credentials: "include" })
            .then(r => r.json())
            .then(r => {
                if (r && r.status === "ok") {
                    if (status) status.innerHTML = `<span style="color:#24e000; font-weight:bold;">Jesteś zalogowany!</span>`;
                    sessionActive = true;
                } else {
                    if (status) status.innerHTML = `<span style="color:#ff5555; font-weight:bold;">Nie jesteś zalogowany!</span><br>
                        <a href="https://localhost:7238/Identity/Account/Login" target="_blank" style="color:#18a8ff;">Kliknij, aby się zalogować</a>`;
                    sessionActive = false;
                }
            })
            .catch(err => {
                if (status) status.innerHTML = `<span style="color:#ff5555;">Błąd połączenia z serwerem!</span>`;
                sessionActive = false;
            });
    }
    let sessionActive = false;
    checkSession();


    //
    // ─── 6. PARSOWANIE OKNA LOOT (fast fight, turn-based, team fight) ─────────────────
    //
    function parseLootWnd(lootWnd) {
        // 6.1. Pobieramy elementy dropów
        const items = [];
        lootWnd.querySelectorAll(".loot-item-wrapper .item").forEach(itemDiv => {
            items.push({ itemHtml: itemDiv.outerHTML });
        });

        // 6.2. Nazwa moba + lista graczy – używamy cached parsedFW i warriorsList
        let mobName = "";
        const lootUsers = [];
        const lastFW = window._dl_teamParsedFW;

        if (lastFW && Object.keys(lastFW).length > 0) {
            for (const key in lastFW) {
                const entry = lastFW[key];
                const idNum = parseInt(key, 10);
                if (isNaN(idNum)) continue;

                if (idNum < 0) {
                    // Mob
                    mobName = entry.name || entry.n || entry.nick || "";
                } else if (idNum > 0) {
                    // Gracz
                    // Tworzymy AvatarUrl z CFG.a_opath + entry.icon bez wiodącego "/"
                    let avatarUrl = "";
                    if (entry.icon) {
                        avatarUrl = CFG.a_opath + entry.icon.replace(/^\//, "");
                    } else if (
                        window._dl_lastWarriorsListTurn &&
                        window._dl_lastWarriorsListTurn[key] &&
                        window._dl_lastWarriorsListTurn[key].icon
                    ) {
                        avatarUrl = CFG.a_opath + window._dl_lastWarriorsListTurn[key].icon.replace(/^\//, "");
                    } else {
                        avatarUrl = entry.avatar || "";
                    }

                    lootUsers.push({
                        GameUserId: String(idNum),
                        Nick: entry.name || entry.n || entry.nick || "",
                        Level: entry.lvl || 0,
                        ClassAbbr: entry.prof || "",
                        AvatarUrl: avatarUrl
                    });
                }
            }
        } else {
            // Fallback: najpierw turn-based warriorsList
            if (window._dl_lastWarriorsListTurn) {
                const wl = window._dl_lastWarriorsListTurn;
                for (const key in wl) {
                    const entry = wl[key];
                    const idNum = parseInt(key, 10);
                    if (isNaN(idNum)) continue;

                    if (idNum < 0) {
                        mobName = entry.name || entry.n || entry.nick || "";
                    } else if (idNum > 0) {
                        const avatarUrl = entry.icon
                            ? CFG.a_opath + entry.icon.replace(/^\//, "")
                            : "";
                        lootUsers.push({
                            GameUserId: String(idNum),
                            Nick: entry.name || entry.n || entry.nick || "",
                            Level: entry.lvl || 0,
                            ClassAbbr: entry.prof || "",
                            AvatarUrl: avatarUrl
                        });
                    }
                }
            }
        }

        // 6.3. Data/godzina
        const now = new Date();

        // 6.4. Nazwa mapy
        let mapName = "";
        try {
            if (window.Engine && Engine.map && Engine.map.d && Engine.map.d.name) {
                mapName = Engine.map.d.name;
            }
        } catch (e) { }

        // 6.5. Nazwa serwera
        let serverName = "";
        try {
            const m = location.hostname.match(/^([a-z0-9]+)\.margonem\.pl$/);
            if (m && m[1]) serverName = m[1];
        } catch (e) { }

        // 6.6. Nazwa klanu
        let clanName = "";
        try {
            if (window.Engine && Engine.hero && Engine.hero.d && Engine.hero.d.clan) {
                if (typeof Engine.hero.d.clan === 'object' && Engine.hero.d.clan.name) {
                    clanName = Engine.hero.d.clan.name;
                } else if (typeof Engine.hero.d.clan === 'string') {
                    clanName = Engine.hero.d.clan;
                }
            }
        } catch (e) { }

        return {
            creationTime: now.toISOString(),
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


    //
    // ─── 7. WYSYŁANIE LOOTU DO SERWERA ─────────────────────────────────────────────
    //
    function sendLootToServer(lootDto) {
        fetch("https://localhost:7238/api/lootlog/add", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(lootDto)
        })
            .then(r => r.json())
            .then(res => {
                if (res.status === "ok") {
                    //alert("Loot zapisany!");
                } else {
                    alert("Błąd podczas zapisywania lootu.");
                    console.log(res);
                }
            })
            .catch(err => {
                alert("Błąd połączenia z serwerem!");
                console.error(err);
            });
    }


    //
    // ─── 8. OBSERVER NA .loot-wnd ───────────────────────────────────────────────────
    //
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.classList.contains("loot-wnd")) {
                    if (sessionActive) {
                        const lootData = parseLootWnd(node);
                        sendLootToServer(lootData);
                    }
                }
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
