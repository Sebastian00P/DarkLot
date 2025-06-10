// ==UserScript==
// @name         DarkFights RAWLOG Warriors + Positive ID Guard + Non-Empty Check (Auto-Fix)
// @namespace    http://tampermonkey.net/
// @version      2025-06-11.30
// @description  Pobiera listę wojowników na starcie, wysyła RAWLOG po zakończeniu walki (z Engine, nie z DOM!), zawsze próbuje odzyskać wojowników na końcu walki.
// @match        https://lelwani.margonem.pl/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const API_URL = 'https://localhost:7238/api/Battle/addBattle';
    const professionMap = { m: 'Mag', p: 'Paladyn', t: 'Tropiciel', w: 'Wojownik', b: 'Tancerz Ostrzy', h: 'Łowca' };

    let warriorsAtStart = [];
    let battleProcessed = false;
    let battleSessionId = null;
    let startHandled = false;

    const log = (...a) => console.log('DarkFights:', ...a);
    const warn = (...a) => console.warn('DarkFights WARN:', ...a);

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

    // Patch Engine to capture RAWLOG on battle end
    (function patchRawLog() {
        if (!window.Engine?.communication) {
            setTimeout(patchRawLog, 250);
            return;
        }
        if (window.__DF_rawlogPatched) return;
        window.__DF_rawlogPatched = true;

        const orig = Engine.communication.successData;
        Engine.communication.successData = function (response) {
            try {
                const parsed = JSON.parse(response);
                // RAWLOG + END
                if (
                    parsed?.f?.m && Array.isArray(parsed.f.m) &&
                    parsed.f.m.some(line => typeof line === 'string' && line.includes("winner="))
                ) {
                    if (!battleProcessed) {
                        battleProcessed = true;

                        // Auto-recover: always try to recapture if empty
                        if (!warriorsAtStart.length) {
                            log('⚠️ Warriors empty at RAWLOG time, trying to recover...');
                            captureWarriors(true); // debug=true
                        }

                        if (!warriorsAtStart.length) {
                            warn('Skipping send: no fighters captured');
                        } else {
                            // Prepare DTO
                            const logs = parsed.f.m.filter(t => t && typeof t === "string");
                            if (!logs.length) return warn('No logs to send');

                            const dto = {
                                BattleStart: logs[0],
                                Fighters: warriorsAtStart,
                                Logs: [logs.join('|')],  // RAWLOG (string!)
                                ServerName: window.location.hostname.split('.')[0]
                            };

                            // Guard: ensure all FighterId are positive
                            if (dto.Fighters.some(f => parseInt(f.FighterId, 10) <= 0)) {
                                warn('Skipping send: negative FighterId detected', dto.Fighters);
                                return;
                            }

                            log(`session ${battleSessionId}: sending RAWLOG DTO →`, dto);
                            fetch(API_URL, {
                                method: 'POST',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(dto)
                            })
                                .then(r => r.text().then(txt => log('fetch status:', r.status, 'body:', txt)))
                                .catch(e => console.error('Fetch error:', e));
                        }
                    }
                    // Reset everything for next battle, after slight delay (to avoid race)
                    setTimeout(() => {
                        battleProcessed = false;
                        warriorsAtStart = [];
                        battleSessionId = null;
                        startHandled = false;
                        log('[DEBUG] Flags/sesja wyzerowane po walce');
                    }, 1500);
                }
            } catch (e) {
                warn('[EXCEPTION in RAWLOG PATCH]', e);
            }
            return orig.apply(this, arguments);
        };
    })();

    // Observe battle start (as before)
    new MutationObserver(muts => {
        muts.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1 || !node.classList.contains('battle-msg')) return;
                const text = node.innerText.trim();
                if (!startHandled && text.startsWith('Rozpoczęła się walka')) {
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

    log('Script loaded: RAWLOG mode (true log from Engine, not DOM) + auto-fix for warriors capturing.');
})();
