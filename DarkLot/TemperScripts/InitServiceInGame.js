// ==UserScript==
// @name         DarkLog- lootlog klanowy (full)
// @version      3.3
// @description  Automatyczne wysyłanie lootu do DarkLot! + pewny mobName
// @author       Dark-Sad
// @match        http://*.margonem.pl/
// @match        https://*.margonem.pl/
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. Battle hook – ZAWSZE zapisuje nazwę moba do localStorage na początku walki
    function hookBattleUpdateData() {
        if (
            window.Engine &&
            Engine.battle &&
            Engine.battle.updateData &&
            !Engine.battle._dl_hooked
        ) {
            const origUpdateData = Engine.battle.updateData;
            Engine.battle.updateData = function(data) {
                // Zawsze wywołaj oryginał
                const res = origUpdateData.apply(this, arguments);

                // Nasz hook – łapiemy nazwę moba (id < 0)
                try {
                    if (this.warriorsList) {
                        for (const k in this.warriorsList) {
                            if (parseInt(k) < 0 && this.warriorsList[k].name) {
                                localStorage.setItem("dl-last-mob-name", this.warriorsList[k].name);
                                break;
                            }
                        }
                    }
                } catch(e){}

                return res;
            }
            Engine.battle._dl_hooked = true; // żeby nie nadpisać dwa razy
        }
    }

    // Czekamy aż Engine.battle się załaduje (próbujemy co sekundę)
    let battleHookInterval = setInterval(() => {
        try {
            hookBattleUpdateData();
            if (window.Engine && Engine.battle && Engine.battle._dl_hooked) clearInterval(battleHookInterval);
        } catch(e){}
    }, 1000);

    // 2. Tworzenie przycisku DL
    const btn = document.createElement("button");
    btn.id = "dl-lootlog-btn";
    btn.innerHTML = '<b style="font-size: 22px;letter-spacing:2px;">DL</b>';
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
    btn.style.fontFamily = "Arial,sans-serif";
    btn.style.fontSize = "21px";
    btn.style.transition = "transform 0.1s, border 0.2s";
    btn.onmouseover = () => { btn.style.transform = "scale(1.08)"; btn.style.borderColor="#31c6ff"; }
    btn.onmouseleave = () => { btn.style.transform = "scale(1.0)"; btn.style.borderColor="#18a8ff"; }
    document.body.appendChild(btn);

    // 3. Okno logowania/sesji
    function showDLWindow() {
        if (document.getElementById("dl-lootlog-window")) return;
        const win = document.createElement("div");
        win.id = "dl-lootlog-window";
        win.style.position = "fixed";
        win.style.top = "50%";
        win.style.left = "50%";
        win.style.transform = "translate(-50%,-50%)";
        win.style.background = "#181c22";
        win.style.color = "white";
        win.style.border = "2.5px solid #18a8ff";
        win.style.borderRadius = "18px";
        win.style.zIndex = "10001";
        win.style.padding = "38px 28px 24px 28px";
        win.style.boxShadow = "0 4px 32px #000b";
        win.innerHTML = `
            <div style="display:flex;align-items:center;gap:16px;">
                <span style="font-size:30px;display:inline-block;width:38px;height:38px;border-radius:50%;background:#23272e;border:2.5px solid #18a8ff;text-align:center;line-height:36px;box-shadow:0 0 16px #31c6ff55;">
                    <b style="font-size:22px;letter-spacing:2px;color:#18a8ff;">DL</b>
                </span>
                <span style="font-size:20px;">Lootlog</span>
            </div>
            <div id="dl-status" style="margin-top:18px;margin-bottom:18px;">Sprawdzanie sesji...</div>
            <button id="dl-session-btn" style="display:none;margin-right:10px;padding:7px 18px;font-size:16px;background:#0056d6;color:white;border:none;border-radius:7px;cursor:pointer;">Sprawdź sesję</button>
            <button id="dl-close-btn" style="position:absolute;top:10px;right:18px;font-size:18px;background:none;color:#bbb;border:none;cursor:pointer;">&times;</button>
        `;
        document.body.appendChild(win);
        document.getElementById("dl-close-btn").onclick = () => win.remove();
        document.getElementById("dl-session-btn").onclick = checkSession;
        checkSession();
    }
    btn.onclick = showDLWindow;

    // 4. Sprawdzanie sesji
    function checkSession() {
        const status = document.getElementById("dl-status");
        if (status) status.textContent = "Sprawdzanie sesji...";
        fetch("https://localhost:7238/api/lootlog/check", { credentials: "include" })
        .then(r => r.json())
        .then(r => {
            if (r && r.status === "ok") {
                if (status) status.innerHTML = `<span style="color:#24e000;font-weight:bold;">Jesteś zalogowany!</span>`;
                sessionActive = true;
            } else {
                if (status) status.innerHTML = `<span style="color:#ff5555;font-weight:bold;">Nie jesteś zalogowany!</span><br>
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

    // 5. Parsowanie lootu
    function parseLootWnd(lootWnd) {
        // Dropy (itemy)
        const items = [];
        lootWnd.querySelectorAll('.loot-item-wrapper .item').forEach(itemDiv => {
            items.push({
                itemHtml: itemDiv.outerHTML
            });
        });

        // Nazwa moba: zawsze z localStorage, bo battle-window może nie być!
        let mobName = localStorage.getItem("dl-last-mob-name") || "";

        // Data/godzina
        const now = new Date();

        // MapName
        let mapName = "";
        try { if (window.Engine && Engine.map && Engine.map.d && Engine.map.d.name) mapName = Engine.map.d.name; } catch(e){}

        // ServerName – z URL!
        let serverName = "";
        try {
            const m = location.hostname.match(/^([a-z0-9]+)\.margonem\.pl$/);
            if (m && m[1]) serverName = m[1];
        } catch(e){}

        // ClanName jako string
        let clanName = "";
        try {
            if (window.Engine && Engine.hero && Engine.hero.d && Engine.hero.d.clan) {
                if (typeof Engine.hero.d.clan === 'object' && Engine.hero.d.clan.name)
                    clanName = Engine.hero.d.clan.name;
                else if (typeof Engine.hero.d.clan === 'string')
                    clanName = Engine.hero.d.clan;
            }
        } catch(e){}

        // Loot users (na razie tylko Ty)
        const lootUsers = [];
        try {
            if (window.Engine && Engine.hero && Engine.hero.d) {
                lootUsers.push({
                    GameUserId: String(Engine.hero.d.id || ""),
                    Nick: Engine.hero.d.nick || "",
                    Level: Engine.hero.d.lvl || 0,
                    ClassAbbr: Engine.hero.d.prof || "",
                    AvatarUrl: Engine.hero.d.avatar || "",
                });
            }
        } catch (e) {}

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

    // 6. Wysyłanie lootu
    function sendLootToServer(lootDto) {
        fetch('https://localhost:7238/api/lootlog/add', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(lootDto)
        })
        .then(r => r.json())
        .then(res => {
            if (res.status === "ok") {
                alert("Loot zapisany!");
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

    // 7. Observer do loot-wnd
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.classList.contains('loot-wnd')) {
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
