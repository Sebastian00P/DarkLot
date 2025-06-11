// wwwroot/js/Battles/fightLogsParser.js


window.parseBattleLogs = function (logs, fightersById, battleStartText, honorText) {
    if (!logs) return "";

    // --- Słowniki dla łatwej rozbudowy ---
    const skillMap = {
        "Podwójny strzał": { txt: "Podwójny strzał", cls: "skill-double-shot" },
        "Wyniszczające rany": { txt: "Wyniszczające rany", cls: "skill-devastate" },
        "Krytyczne wzmocnienie": { txt: "Krytyczne wzmocnienie", cls: "skill-crit-boost" },
        "Dziki zapał": { txt: "Dziki zapał", cls: "skill-frenzy" },
        "Błyskawiczny strzał": { txt: "Błyskawiczny strzał", cls: "skill-lightning-shot" },
        "Okrzyk bojowy": { txt: "Okrzyk bojowy", cls: "skill-battle-cry" },
        "Osłona tarczą": { txt: "Osłona tarczą", cls: "skill-shield-guard" },
        // … dopisz tu inne tspell → { txt, cls }
    };

    const legbonMap = {
        legbon_lastheal: { txt: "Ostatni ratunek", cls: "legbon_lastheal" },
        legbon_verycrit: { txt: "Cios bardzo krytyczny", cls: "effect-vcrit" },
        legbon_curse: { txt: "Klątwa", cls: "legbon_curse" },
        legbon_cleanse: { txt: "Płomienne oczyszczenie", cls: "legbon_cleanse" },
        legbon_critred: { txt: "Krytyczna osłona", cls: "legbon_critred" },
        legbon_facade: { txt: "Fasada opieki", cls: "legbon_facade" },
        "combo-max": { txt: "Kombinacja", cls: "effect-crit" },
        oth_dmg: { txt: "obrażeń otrzymał(a)", cls: "effect-dmg" }
    };

    const effectNames = {
        crit: { txt: "Cios krytyczny", cls: "effect-crit" },
        wound: { txt: "Głęboka rana", cls: "effect-wound" },
        pierce: { txt: "Przebicie", cls: "effect-pierce" },
        block: { txt: "Blok", cls: "effect-block" },
        blok: { txt: "Zablokowanie", cls: "effect-block" },
        injure: { txt: "Zranienie", cls: "effect-wound" },
        evade: { txt: "Unik", cls: "effect-wound" },
        arrowblock: { txt: "Strzała zablokowana", cls: "effect-wound" },
        fastarrow: { txt: "Szybka strzała", cls: "fastarrow" }
    };

    function mapEffect(key, val = "") {
        key = key.toLowerCase();
        if (key === "critslow_per") {
            return { txt: `Krytyczne spowolnienie o ${val}%`, cls: "effect-crit" };
        }
        return effectNames[key] || { txt: key, cls: "" };
    }
    function mapLegbon(key) {
        return legbonMap[key.toLowerCase()] || { txt: key, cls: "" };
    }
    function getF(id) {
        return fightersById[id] || { Name: "[?]", Team: 0 };
    }
    function esc(str) {
        return str.replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            '"': '&quot;', "'": '&#39;'
        })[c]);
    }

    let out = "";

    // BattleStart i honor
    out += `<div class="card card-gray" data-raw="${esc(battleStartText)}">
              <p class="log-line">${esc(battleStartText)}</p>
            </div>`;
    out += `<div class="card card-gray" data-raw="${esc(honorText)}">
              <p class="log-line">${esc(honorText)}</p>
            </div>`;

    let card = [], cls = "", rawLine = "";
    function flush() {
        if (!card.length) return;
        out += `<div class="card ${cls}" data-raw="${esc(rawLine)}">
                  ${card.join("")}
                </div>`;
        card = []; cls = ""; rawLine = "";
    }

    logs.forEach(line => {
        rawLine = line;
        if (!line) return;
        if (line.includes(";txt=") && line.split(";txt=")[1] === honorText) return;

        // txt= … w szarej karcie
        if (line.includes(";txt=")) {
            flush();
            const txt = line.split(";txt=")[1];
            out += `<div class="card card-gray" data-raw="${esc(line)}">
                      <p class="log-txt">${esc(txt)}</p>
                    </div>`;
            return;
        }

        const parts = line.split(";").filter(p => p);
        if (parts.length < 2) {
            card.push(`<p class="log-line" data-raw="${esc(line)}">${esc(line)}</p>`);
            return;
        }

        // --- Skill (tspell) ---
        const sp = parts.find(p => p.startsWith("tspell="));
        if (sp) {
            flush();
            const atk = getF(parts[0].split("=")[0]);
            cls = `card-attack team-${atk.Team}-bg`;

            const rawSkill = sp.split("=")[1];
            const sk = skillMap[rawSkill] || {};
            card.push(`<p class="log-line ${sk.cls || "skill-default"}" data-raw="${esc(line)}">
                  <b>${atk.Name}</b> wykonuje <b>${esc(sk.txt || rawSkill)}</b>.
               </p>`);

            // Obsługa otrzymanych obrażeń oth_dmg
            const oth = parts.find(p => p.startsWith("+oth_dmg="));
            if (oth) {
                // oth_dmg=7636, ,Firexus(59%)
                const othVal = oth.split("=")[1]; // "7636, ,Firexus(59%)"
                const dmg = othVal.split(",")[0]; // "7636"
                const targetStr = othVal.split(",")[2]; // "Firexus(59%)"
                card.push(`<p class="log-line effect-dmg" data-raw="${esc(line)}">
                      -<b class="Dd">${esc(dmg)}</b> obrażeń otrzymał(a) ${esc(targetStr)}.
                   </p>`);
            }

            // Obsługa heal_target
            const heal = parts.find(p => p.startsWith("heal_target="));
            if (heal) {
                const healVal = heal.split("=")[1];
                card.push(`<p class="log-line efekt-dmg" data-raw="${esc(line)}">
                      Uleczono <b>${atk.Name}</b> o ${esc(healVal)} punktów życia.
                   </p>`);
            }

            // Obsługa combo-max
            const combo = parts.find(p => p.startsWith("combo-max"));
            if (combo) {
                const comboCount = combo.split("=")[1];
                const legCombo = mapLegbon("combo-max");
                card.push(`<p class="log-line ${legCombo.cls}" data-raw="${esc(line)}">
                      +${legCombo.txt} x${esc(comboCount)}!
                   </p>`);
            }

            flush();
            return;
        }

        // --- Głęboka rana jako osobna karta ---
        const w = parts.find(p => p.startsWith("wound="));
        if (w && parts[0].includes("=")) {
            flush();
            const atk = getF(parts[0].split("=")[0]);
            cls = `card-attack team-${atk.Team}-bg`;
            const hp = parts[0].split("=")[1];
            const dmg = w.split("=")[1].split(",")[0];
            card.push(`<p class="log-line" data-raw="${esc(line)}">
                          ${atk.Name}(${hp}%) otrzymał ${esc(dmg)} obrażeń z głębokiej rany.
                       </p>`);
            flush();
            return;
        }

        // --- Standardowy atak + efekty ---
        const atk = getF(parts[0].split("=")[0]);
        cls = `card-attack team-${atk.Team}-bg`;

        // 1) linia ataku
        const dmgPart = parts.find(p => p.startsWith("+dmgd=") || p.startsWith("+dmg="));
        if (dmgPart) {
            const v = dmgPart.split("=")[1];
            const hp = parts[0].split("=")[1];
            card.push(`<p class="log-line" data-raw="${esc(line)}">
                          ${atk.Name}(${hp}%) uderzył z siłą <b class="Dd">+${esc(v)}</b>
                       </p>`);
        }

        // 2) +rage
        const ragePart = parts.find(p => p.startsWith("+rage="));
        if (ragePart) {
            const val = ragePart.split("=")[1];
            card.push(`<p class="log-line effect-rage" data-raw="${esc(ragePart)}">
                          +Wściekłość: atak +${esc(val)}
                       </p>`);
        }

        // 3) kolejne efekty w ustalonej kolejności
        // Cios krytyczny
        if (parts.some(p => p === "+crit")) {
            const e = mapEffect("crit");
            card.push(`<p class="${e.cls}" data-raw="+crit">+${e.txt}</p>`);
        }
        // Cios bardzo krytyczny
        if (parts.some(p => p === "+legbon_verycrit")) {
            const lb = mapLegbon("legbon_verycrit");
            card.push(`<p class="${lb.cls}" data-raw="+legbon_verycrit">+${lb.txt}</p>`);
        }
        // Krytyczne spowolnienie
        const slow = parts.find(p => p.startsWith("+critslow_per"));
        if (slow) {
            const val = slow.split("=")[1];
            const e = mapEffect("critslow_per", val);
            card.push(`<p class="${e.cls}" data-raw="${esc(slow)}">+${e.txt}</p>`);
        }
        // Głęboka rana
        if (parts.some(p => p === "+wound")) {
            const e = mapEffect("wound");
            card.push(`<p class="${e.cls}" data-raw="+wound">+${e.txt}</p>`);
        }
        // Przebicie
        if (parts.some(p => p === "+pierce")) {
            const e = mapEffect("pierce");
            card.push(`<p class="${e.cls}" data-raw="+pierce">+${e.txt}</p>`);
        }

        // 4) +acdmg
        const ac = parts.find(p => p.startsWith("+acdmg="));
        if (ac) {
            const v = ac.split("=")[1];
            card.push(`<p class="log-line" data-raw="${esc(ac)}">+Obniżenie pancerza o ${esc(v)}</p>`);
        }

        // 5) -blok (Zablokowanie)
        const blk = parts.find(p => p.startsWith("-blok="));
        if (blk) {
            const v = blk.split("=")[1];
            card.push(`<p class="effect-block" data-raw="${esc(blk)}">-Zablokowanie ${esc(v)} obrażeń</p>`);
        }

        // 6a) -fastarrow (Szybka strzała)
        if (parts.some(p => p === "+fastarrow")) {
            const e = mapEffect("fastarrow");
            card.push(`
                <p class="${e.cls}" data-raw="+fastarrow">+${e.txt}</p>
            `);
        }
        // 6b) -arrowblock (Blok strzały)
        if (parts.some(p => p === "-arrowblock")) {
            const e = mapEffect("arrowblock");
            card.push(`
                <p class="${e.cls}" data-raw="-arrowblock">+${e.txt}</p>
            `);
        }
        // 6c) -evade (Unik)
        if (parts.some(p => p === "-evade")) {
            const e = mapEffect("evade");
            card.push(`
                <p class="${e.cls}" data-raw="-evade">-${e.txt}</p>
            `);
        }

        // legbon_lastheal
        if (parts.some(p => p.startsWith("-legbon_lastheal"))) {
            const lb = mapLegbon("legbon_lastheal");
            card.push(`<p class="log-line ${lb.cls}" data-raw="-legbon_lastheal">
                  -${lb.txt}
               </p>`);
        }

        // legbon_verycrit
        if (parts.some(p => p.startsWith("-legbon_verycrit"))) {
            const lb = mapLegbon("legbon_verycrit");
            card.push(`<p class="log-line ${lb.cls}" data-raw="-legbon_verycrit">
                  -${lb.txt}
               </p>`);
        }

        // legbon_curse
        if (parts.some(p => p.startsWith("+legbon_curse"))) {
            const lb = mapLegbon("legbon_curse");
            card.push(`<p class="log-line ${lb.cls}" data-raw="legbon_curse">
                  +${lb.txt}
               </p>`);
        }

        // legbon_cleanse
        if (parts.some(p => p.startsWith("-legbon_cleanse"))) {
            const lb = mapLegbon("legbon_cleanse");
            card.push(`<p class="log-line ${lb.cls}" data-raw="-legbon_cleanse">
                  -${lb.txt}
               </p>`);
        }

        // legbon_critred
        if (parts.some(p => p.startsWith("-legbon_critred"))) {
            const lb = mapLegbon("legbon_critred");
            card.push(`<p class="log-line ${lb.cls}" data-raw="-legbon_critred">
                  -${lb.txt}
               </p>`);
        }

        // legbon_facade
        if (parts.some(p => p.startsWith("-legbon_facade"))) {
            const lb = mapLegbon("legbon_facade");
            card.push(`<p class="log-line ${lb.cls}" data-raw="-legbon_facade">
                  -${lb.txt}
               </p>`);
        }

        

        // 7) otrzymane obrażenia
        const ret = parts.find(p => p.startsWith("-dmgd=") || p.startsWith("-dmg="));
        if (ret) {
            const v = ret.split("=")[1];
            const tgt = getF(parts[1].split("=")[0]);
            const hp2 = parts[1].split("=")[1];
            card.push(`<p class="log-line" data-raw="${esc(line)}">
                          ${tgt.Name}(${hp2}%) otrzymał <b class="Dd">-${esc(v)}</b> obrażeń.
                       </p>`);
        }

       

        flush();

        // --- heal jako osobna karta ---
        const hl = parts.find(p => p.startsWith("heal="));
        if (hl) {
            const heal = hl.split("=")[1];
            const tgt = getF(parts[0].split("=")[0]);
            const hp0 = parts[0].split("=")[1] || "0";
            cls = "card-heal";
            card.push(`<p class="log-line" data-raw="${esc(line)}">
                          Przywrócono ${esc(heal)} pkt życia <b>${tgt.Name}</b>(<b>${hp0}%</b>)
                       </p>`);
            flush();
        }

        // --- krok jako osobna karta ---
        if (line.includes("step")) {
            const id = parts[0].split("=")[0];
            const tgt = getF(id);
            const hp1 = parts[0].split("=")[1] || "0";
            cls = `card-step team-${tgt.Team}-bg`;
            card.push(`<p class="log-line" data-raw="${esc(line)}">
                          ${tgt.Name}(${hp1}%) zrobił krok do przodu.
                       </p>`);
            flush();
            return;
        }

        // --- zwycięzca i pokonany ---
        if (line.includes("winner=")) {
            flush();
            out += `<p class="log-line" data-raw="${esc(line)}">
                      <b>Zwyciężył: ${esc(line.split("=")[1])}</b>
                    </p>`;
        }
        if (line.includes("loser=")) {
            flush();
            out += `<p class="log-line" data-raw="${esc(line)}">
                      <b>Polegli: ${esc(line.split("=")[1])}</b>
                    </p>`;
        }
    });

    flush();
    return out;
};

function esc(s) {
    return s.replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

function parseBattleLogs(logs, fighters, battleStartText) {
    const stats = {};
    fighters.forEach(f => {
        stats[f.Name] = {
            turns: 0,
            crit: 0,
            vcrit: 0,
            touch: 0,
            buff: 0,
            miss: 0,
            block: 0,
            parry: 0,
            counter: 0,
            heal: 0,
            deep: 0
        };
    });

    const containerLines = [];

    // Dodaj na start BattleStart - pogrubione i wyraźne
    if (battleStartText) {
        containerLines.push(`<div class="battle-start">${escapeHtml(battleStartText)}</div>`);
    }

    // Funkcja do escapowania HTML (prosta)
    function escapeHtml(text) {
        return text.replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m]);
    }

    // Kolory dla żywiołów (klasy)
    const elementClasses = {
        ogien: 'element-fire',       // czerwony
        trucizna: 'element-poison',  // zielony
        fizyczne: 'element-phys',    // biały
        zimno: 'element-ice',        // niebieski
        blyskawice: 'element-lightning' // żółty
    };

    // Mapowanie keywordów na elementy
    function getElementClass(text) {
        if (/ogień|płonąca|grom z nieba|tarczę ognia/i.test(text)) return elementClasses.ogien;
        if (/trucizna|zatruty|klątwa/i.test(text)) return elementClasses.trucizna;
        if (/fizyczne|cios|atak/i.test(text)) return elementClasses.fizyczne;
        if (/zimno|lodowa|mrozu|zamrożenie/i.test(text)) return elementClasses.zimno;
        if (/błyskawic|grom|piorun/i.test(text)) return elementClasses.blyskawice;
        return '';
    }

    logs.forEach(text => {
        if (!text) return;

        // Aktualizuj statystyki
        fighters.forEach(f => {
            if (text.includes(f.Name)) stats[f.Name].turns++;
        });
        fighters.forEach(f => {
            if (/bardzo krytycz/i.test(text) && text.includes(f.Name)) stats[f.Name].vcrit++;
            else if (/cios krytycz/i.test(text) && text.includes(f.Name)) stats[f.Name].crit++;
            if (/Dotyk anioła/i.test(text) && text.includes(f.Name)) stats[f.Name].touch++;
            if (/(emanuje|wykonuje|rzuci|aura)/i.test(text) && text.includes(f.Name)) stats[f.Name].buff++;
            if (/unik|miss|nie traf/i.test(text) && text.includes(f.Name)) stats[f.Name].miss++;
            if (/Blok/i.test(text) && text.includes(f.Name)) stats[f.Name].block++;
            if (/Parowanie/i.test(text) && text.includes(f.Name)) stats[f.Name].parry++;
            if (/Kontr/i.test(text) && text.includes(f.Name)) stats[f.Name].counter++;
            if (/Przywrócono|zregenerowano/i.test(text) && text.includes(f.Name)) stats[f.Name].heal++;
            if (/Głebok[ea] rani?/i.test(text) && text.includes(f.Name)) stats[f.Name].deep++;
        });

        // Podział na czas i treść (jeśli jest)
        const m = text.match(/^\[(.*?)\]\s*(.*)$/);
        let timePart = '', textPart = text;
        if (m) {
            timePart = `<span class="log-time">[${escapeHtml(m[1])}]</span> `;
            textPart = m[2];
        }

        // Zamiana + na <br>+
        textPart = escapeHtml(textPart).replace(/\+/g, '<br>+');

        // Dodaj klasy specjalne
        let cls = 'log-info';

        if (/bardzo krytycz/i.test(textPart)) cls = 'log-damage';
        else if (/cios krytycz/i.test(textPart)) cls = 'log-damage';
        else if (/Przywrócono|zregenerowano/i.test(textPart)) cls = 'log-heal';
        else if (/(emanuje|wykonuje|rzuci|aura)/i.test(textPart)) cls = 'log-buff';
        else if (/unik|miss|nie traf/i.test(textPart)) cls = 'log-miss';

        // Dodaj kolor dla elementu jeśli pasuje
        const elementCls = getElementClass(textPart);
        if (elementCls) cls += ` ${elementCls}`;

        // Tury oznacz kolorem zależnie od drużyny
        fighters.forEach(f => {
            if (text.includes(f.Name) && text.includes('tura')) {
                cls += f.Team === 1 ? ' team-1-turn' : f.Team === 2 ? ' team-2-turn' : '';
            }
        });

        containerLines.push(`<div class="log-line ${cls}">${timePart}${textPart}</div>`);
    });

    return { stats, html: containerLines.join('') };
}
function formatLogLine(line, fightersById) {
    if (!line) return "";

    // Jeśli linia to tekstowa wiadomość np. "0;0;txt=Firexus - utrata tury"
    if (line.includes(";txt=")) {
        const txt = line.split(";txt=")[1];
        return `<div class="log-txt">${txt}</div>`;
    }

    const parts = line.split(";");
    if (parts.length < 2) return line;

    // Przypuśćmy, że pierwsze dwa elementy to attacker=hp i target=hp
    const [atkPart, tgtPart] = parts;

    // Funkcja pomocnicza do rozbicia id i hp
    function parseIdHp(str) {
        const [idStr, hpStr] = str.split("=");
        return {
            id: idStr,
            hp: parseInt(hpStr, 10)
        };
    }

    const attacker = parseIdHp(atkPart);
    const target = parseIdHp(tgtPart);

    // Znajdź imiona i %hp
    const attackerName = fightersById[attacker.id]?.Name || "[Unknown]";
    const attackerHp = attacker.hp;

    const targetName = fightersById[target.id]?.Name || "[Unknown]";
    const targetHp = target.hp;

    // Sprawdź czy skill (tspell)
    const skillPart = parts.find(p => p.startsWith("tspell="));
    let skillName = null;
    if (skillPart) {
        skillName = skillPart.split("=")[1].split(";")[0];
    }

    // Start budowania html
    let html = "";

    if (skillName) {
        html += `<div><b>${attackerName}</b> wykonuje <b>${skillName}</b>.</div>`;
    }

    // Teraz efekty: plusy i minusy
    parts.slice(2).forEach(part => {
        if (!part) return;

        // Rozbij po + i -
        const effects = part.split(/(?=[+-])/g);
        effects.forEach(eff => {
            // Efekt może być np. +crit, -blok=6243, +dmgd=20809 itd.

            if (!eff) return;

            let colorClass = "";
            if (eff.includes("crit")) colorClass = "effect-crit";
            else if (eff.includes("wound")) colorClass = "effect-wound";
            else if (eff.includes("heal")) colorClass = "effect-heal";
            else if (eff.includes("dmgd")) colorClass = "effect-dmgd";
            else if (eff.includes("blok")) colorClass = "effect-block";
            else if (eff.includes("pierce")) colorClass = "effect-pierce";
            // tutaj możesz rozbudować kolory i klasy

            // Czyszczenie efektu z prefixu plus/minus do czytelnej formy
            let cleanEff = eff.replace(/^\+|\-/, "");

            html += `<div class="${colorClass}">${eff.startsWith("+") ? "+" : "-"}${cleanEff}</div>`;
        });
    });

    // Dodaj info o ataku i hp celu jeśli są obrażenia lub leczenie
    const dmgdPart = parts.find(p => p.includes("+dmgd="));
    if (dmgdPart) {
        const dmg = dmgdPart.match(/\+dmgd=(\d+)/);
        if (dmg && dmg[1]) {
            html += `<div><b>${attackerName}(${attackerHp}%)</b> uderzył z siłą +${dmg[1]}</div>`;
        }
    }
    const healPart = parts.find(p => p.includes("heal="));
    if (healPart) {
        const heal = healPart.match(/heal=(\d+)/);
        if (heal && heal[1]) {
            html += `<div><b>${targetName}(${targetHp}%)</b> otrzymał +${heal[1]} punktów życia.</div>`;
        }
    }

    return html;
}
