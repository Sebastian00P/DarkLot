// ==UserScript==
// @name          DarkFights
// @namespace     http://tampermonkey.net/
// @version       2025-06-23.01
// @description   PvP-only walki: pełny RAWLOG, fallback live/parsing, natychmiastowe wysyłanie fightów
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
    const DUPLICATE_DELAY = 5000;

    const professionMap = {
        m: 'Mag', p: 'Paladyn', t: 'Tropiciel',
        w: 'Wojownik', b: 'Tancerz Ostrzy', h: 'Łowca'
    };

    let lastBattleSentTime = 0;
    let warriorsAtStart = [];
    let accumulatedLogs = [];
    let startHandled = false;
    let battleStartText = '';

    function log(...a) { console.log('[DF]', ...a); }
    function warn(...a) { console.warn('[DF][WARN]', ...a); }
    function dbg(...a) { console.debug('[DF][DEBUG]', ...a); }
    function getBestName(o) { return o && typeof o.name === 'string' ? o.name : ''; }

    function captureWarriors(debug = false) {
        const live = window.Engine?.battle?.warriorsList
            ? Object.values(window.Engine.battle.warriorsList)
            : [];
        if (!live.length) return false;

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

    function generateBattleStartText(fighters) {
        const t1 = fighters.filter(x => x.Team === 1),
            t2 = fighters.filter(x => x.Team === 2);
        const fmt = team => team.map(x => {
            const abbr = Object.fromEntries(Object.entries(professionMap).map(([k, v]) => [v, k]))[x.Profession] || '';
            return `${x.Name} (${x.Level}${abbr})`;
        }).join(', ');
        return `Rozpoczęła się walka pomiędzy ${fmt(t1)} a ${fmt(t2)}`;
    }

    function buildBattleDto() {
        const dto = {
            BattleStart: battleStartText,
            Fighters: warriorsAtStart,
            Logs: accumulatedLogs,
            ServerName: (location.hostname.match(/^([\w\d]+)\.margonem\.pl$/) || [])[1] || ''
        };
        dbg('Battle DTO:', dto);
        return dto;
    }

    function sendBattle(dto) {
        fetch(API_URL_BATTLE, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        })
            .then(r => log('Battle status', r.status))
            .catch(err => warn('Battle error', err));
    }

    // patch komunikacji
    (function () {
        if (!window.Engine?.communication || Engine.communication._dfdl_patched) return;
        const orig = Engine.communication.successData;
        Engine.communication.successData = function (response) {
            let parsed;
            try { parsed = JSON.parse(response); }
            catch { return orig.apply(this, arguments); }

            // RAWLOG
            if (parsed.f?.m && Array.isArray(parsed.f.m)) {
                accumulatedLogs.push(...parsed.f.m.filter(t => typeof t === 'string'));
            }

            // koniec walki?
            const isBattleEnd = parsed.f?.m?.some(l => typeof l === 'string' && l.includes('winner='));
            if (isBattleEnd) {
                const res = orig.apply(this, arguments);

                captureWarriors();
                if (warriorsAtStart.length && battleStartText) {
                    const uniqueTeams = new Set(warriorsAtStart.filter(f => !f.IsMob).map(f => f.Team));
                    if (uniqueTeams.size >= 2 && Date.now() - lastBattleSentTime >= DUPLICATE_DELAY) {
                        lastBattleSentTime = Date.now();
                        sendBattle(buildBattleDto());
                    }
                }

                // reset
                warriorsAtStart = [];
                accumulatedLogs = [];
                battleStartText = '';
                startHandled = false;

                return res;
            }

            return orig.apply(this, arguments);
        };
        Engine.communication._dfdl_patched = true;
    })();

    // obserwator początku walki
    new MutationObserver(records => {
        for (const rec of records) {
            for (const node of rec.addedNodes) {
                if (node.nodeType !== 1 || !node.classList.contains('battle-msg')) continue;
                const text = node.innerText.trim();
                if (!startHandled && text.startsWith('Rozpoczęła się walka')) {
                    startHandled = true;
                    battleStartText = text;
                    accumulatedLogs = [];
                    captureWarriors(true);
                    log('🔔 Battle START:', text);
                }
            }
        }
    }).observe(document.body, { childList: true, subtree: true });

    log('DarkFights loaded.');
})();
