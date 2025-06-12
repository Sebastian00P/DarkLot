// wwwroot/js/Battles/fightLogsParser.js
window.parseBattleLogs = function (logs, fightersById, battleStartText) {
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
        legbon_glare: { txt: "Oślepienie", cls: "legbon_glare" },
        legbon_anguish: { txt: "Krwawa udręka", cls: "legbon_anguish" },
        legbon_puncture: { txt: "Przeszywająca skuteczność", cls: "legbon_puncture" },
        "combo-max": { txt: "Kombinacja", cls: "effect-crit" },
        oth_dmg: { txt: "obrażeń otrzymał(a)", cls: "effect-dmg" }
    };

    const effectNames = {
        crit: { txt: "Cios krytyczny", cls: "effect-crit" },
        of_crit: { txt: "Cios krytyczny broni pomocniczej", cls: "effect-crit" },
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
        if (key === "poison_lowdmg_per") {
            return { txt: `Osłabienie przez truciznę zadawanych obrażeń o ${val}%`, cls: "effect-wound" };
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

        const buffKeys = [
            { key: "heal_per-allies", txt: "wzmacnia leczenie z przedmiotów swojej drużyny o", cls: "buff-heal" },
            { key: "heal_per-enemies", txt: "osłabia leczenie z przedmiotów przeciwnej drużyny o", cls: "debuff-heal" },
            { key: "hp_per-allies", txt: "emanuje aurą życia", cls: "buff-hp" }
        ];
        for (const b of buffKeys) {
            const entry = parts.find(p => p.startsWith(b.key + "="));
            if (entry) {
                const rawVal = entry.split("=")[1];
                const val = parseFloat(rawVal);
                const fighter = getF(parts[0].split("=")[0]);
                cls = `card-attack team-${fighter.Team}-bg`;
                let text;
                if (b.key === "hp_per-allies") {
                    // aura życia
                    text = `${fighter.Name}(${parts[0].split("=")[1]}%) ${b.txt}: ${val > 0 ? '+' : ''}${esc(rawVal)}% życia dla sojuszników`;
                } else {
                    text = `${fighter.Name}(${parts[0].split("=")[1]}%) ${b.txt} ${val > 0 ? '+' : ''}${esc(rawVal)}%`;
                }
                card.push(`<p class="log-line ${b.cls}" data-raw="${esc(entry)}">${text}</p>`);
                flush();
            }
        }

        // --- Skill (tspell) ---
        const sp = parts.find(p => p.startsWith("tspell="));
        if (sp) {
            flush();
            const atk = getF(parts[0].split("=")[0]);
            cls = `card-attack team-${atk.Team}-bg`;
            const bandageVal = parts.find(x => x.startsWith("bandage="))?.split("=")[1];
            const energyRaw = parts.find(x => x.startsWith("energy="))?.split("=")[1];
            const medytacjaVal = energyRaw
                ? energyRaw.startsWith("-")
                    ? energyRaw.slice(1)
                    : energyRaw
                : null;
            const rawSkill = sp.split("=")[1];
            const sk = skillMap[rawSkill] || {};
            let skillText = "";

            if (bandageVal && bandageVal !== "0") {
                skillText = ` +${esc(bandageVal)} punktów życia`;
            }
            if (medytacjaVal) {
                skillText = ` +${esc(medytacjaVal)} energii`;
            }
            card.push(`<p class="log-line ${sk.cls || "skill-default"}" data-raw="${esc(line)}">
                    <b>${atk.Name}</b> wykonuje <b>${esc(sk.txt || rawSkill)}</b>${skillText}.
               </p>`);

            if (rawSkill === "Opatrywanie ran") {
                // wyciągamy wartości z data-raw
                const bandage = parts.find(x => x.startsWith("bandage="))?.split("=")[1] || "0";
                const resfire = parts.find(x => x.startsWith("resfire_per="))?.split("=")[1] || "0";
                const resfrost = parts.find(x => x.startsWith("resfrost_per="))?.split("=")[1] || "0";
                const reslight = parts.find(x => x.startsWith("reslight_per="))?.split("=")[1] || "0";

                // dodajemy cztery dodatkowe linie:
                card.push(`<p class="log-line heal-bandage" data-raw="bandage=${bandage}">
                               Bandażowanie ran: ${atk.Name} +${bandage} punktów życia.
                           </p>`);
                card.push(`<p class="log-line buff-fire" data-raw="resfire_per=${resfire}">
                               Odporność na ogień +${resfire}%.
                           </p>`);
                card.push(`<p class="log-line buff-frost" data-raw="resfrost_per=${resfrost}">
                               Odporność na zimno +${resfrost}%.
                           </p>`);
                card.push(`<p class="log-line buff-lightning" data-raw="reslight_per=${reslight}">
                               Odporność na błyskawice +${reslight}%.
                           </p>`);

                flush();
                return;
            }
            // Debuff: osłabienie przez truciznę
            const poisonDeb = parts.find(p => p.startsWith("-poison_lowdmg_per="));
            if (poisonDeb) {
                const val = poisonDeb.split("=")[1]; const e = mapEffect("poison_lowdmg_per", val);
                card.push(`<p class="log-line ${e.cls}" data-raw="${esc(poisonDeb)}">-${e.txt}</p>`);
            }

            // Obsługa otrzymanych obrażeń oth_dmg
            const oth = parts.find(p => p.startsWith("+oth_dmg="));
            if (oth) {
                const othVal = oth.split("=")[1];
                const dmg = othVal.split(",")[0];
                const targetStr = othVal.split(",")[2];
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
        const firePart = parts.find(p => p.startsWith("+dmgf="));
        const frozenPart = parts.find(p => p.startsWith("+dmgc="));
        const dmgoPart = parts.find(p => p.startsWith("+dmgo="));
        const blyskPart = parts.find(p => p.startsWith("+dmgl="));
        if (dmgPart || dmgoPart || firePart || frozenPart || blyskPart) {
            // wyciągamy procent życia z pierwszego elementu parts
            const hp = parts[0].split("=")[1];

            // kolekcja fragmentów HTML
            const pieces = [];

            // podstawowe obrażenia (jeśli są)
            if (dmgPart) {
                const v = dmgPart.split("=")[1];
                pieces.push(`<b class="Dd">+${esc(v)}</b>`);
            }

            // trucizna
            if (dmgoPart) {
                const v = dmgoPart.split("=")[1];
                pieces.push(`<span class="poison">+${esc(v)}</span>`);
            }

            // ogień
            if (firePart) {
                const v = firePart.split("=")[1];
                pieces.push(`<span class="fire">+${esc(v)}</span>`);
            }

            // zamrożenie
            if (frozenPart) {
                const v = frozenPart.split("=")[1];
                pieces.push(`<span class="frozen">+${esc(v)}</span>`);
            }

            // błyskawica
            if (blyskPart) {
                const v = blyskPart.split("=")[1];
                pieces.push(`<span class="blysk">+${esc(v)}</span>`);
            }

            // łączymy wszystkie części w jeden string
            const attackStrength = pieces.join(" ");

            card.push(`
                <p class="log-line" data-raw="${esc(line)}">
                    ${atk.Name} (${hp}%) uderzył z siłą ${attackStrength}
                </p>
            `);
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
        // Cios krytyczny broni pomocniczej
        if (parts.some(p => p === "+of_crit")) {
            const e = mapEffect("of_crit");
            card.push(`<p class="${e.cls}" data-raw="+of_crit">+${e.txt}</p>`);
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
        // 2b) +engback
        const engPart = parts.find(p => p.startsWith("+engback="));
        if (engPart) {
            const val = engPart.split("=")[1];
            card.push(`<p class="log-line effect-energy" data-raw="${esc(engPart)}">+${esc(val)} energii</p>`);
        }
        // 2c) -endest: zniszczenie energii
        const energyDestroyPart = parts.find(p => p.startsWith("-endest="));
        if (energyDestroyPart) {
            let val = energyDestroyPart.split("=")[1];
            let mainValue = val;
            let weakenText = "";

            if (val.includes(",")) {
                const [destroyed, weakened] = val.split(",");
                mainValue = destroyed;                        // np. "8"
                weakenText = ` (<span class="weakened">osłabione o ${esc(weakened)}</span>)`;
            }

            card.push(
                `<p class="log-line effect-energy-destroy" data-raw="${esc(energyDestroyPart)}">` +
                `+Zniszczono ${esc(mainValue)} energii${weakenText}` +
                `</p>`
            );
        }
        // 3) Ciężka rana (+critwound)
        if (parts.includes("+critwound")) {
            card.push(`<p class="log-line effect-wound" data-raw="+critwound">+Ciężka rana</p>`);
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

        // Oślepienie
        if (parts.some(p => p === "-legbon_glare")) {
            const lb = mapLegbon("legbon_glare");
            card.push(`<p class="${lb.cls}" data-raw="-legbon_glare">+${lb.txt}</p>`);
        }
        // Krwawa udręka
        if (parts.some(p => p === "+legbon_anguish")) {
            const lb = mapLegbon("legbon_anguish");
            card.push(`<p class="${lb.cls}" data-raw="+legbon_anguish">+${lb.txt}</p>`);
        }
        // Osłabienie przez truciznę zadawanych obrażeń
        const poisonLowDmg = parts.find(p => p.startsWith("-poison_lowdmg_per="));
        if (poisonLowDmg) {
            const val = poisonLowDmg.split("=")[1];
            const e = mapEffect("poison_lowdmg_per", val);
            card.push(`<p class="${e.cls}" data-raw="${esc(poisonLowDmg)}">-${e.txt}</p>`);
        }
        // zranienie (injure)
        const inj = parts.find(p => p.startsWith("+injure="));
        if (inj) {
            const val = inj.split("=")[1];
            const e = mapEffect("injure");
            card.push(`<p class=\"log-line ${e.cls}\" data-raw=\"${esc(inj)}\">+${e.txt} (${esc(val)})</p>`);
        }
        // 8) +taken_dmg: wzmocnienie ataku
        const attackBoostPart = parts.find(p => p.startsWith("+taken_dmg="));
        if (attackBoostPart) {
            const val = attackBoostPart.split("=")[1];
            card.push(`<p class="log-line effect-attack-boost" data-raw="${esc(attackBoostPart)}">+Wzmocnienie ataku o ${esc(val)}</p>`);
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
        const othDmg = parts.find(p => p.startsWith("+oth_dmg="));
        if (othDmg) {
            const val = othDmg.split("=")[1];
            const [dmg, , targetStr] = val.split(",");
            if (dmg && targetStr) {
                card.push(`
                    <p class="log-line effect-dmg" data-raw="${esc(line)}">
                        -${esc(dmg.trim())} obrażeń otrzymał(a) ${esc(targetStr.trim())}.
                    </p>
                `);
            }
        }

        // absorption
        const absM = parts.find(p => p.startsWith("-absorbm="));
        if (absM) {
            const val = absM.split("=")[1];
            card.push(`<p class=\"log-line\">-Absorpcja ${val} obrażeń magicznych</p>`);
        }
        const absP = parts.find(p => p.startsWith("-absorb="));
        if (absP) {
            const val = absP.split("=")[1];
            card.push(`<p class=\"log-line\">-Absorpcja ${val} obrażeń fizycznych</p>`);
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
        // Obniżenie odporności
        const resdmgPart = parts.find(p => p.startsWith("+resdmg="));
        if (resdmgPart) {
            const v = resdmgPart.split("=")[1];
            card.push(`<p class="log-line effect-resdmg" data-raw="${esc(resdmgPart)}">
            +Obniżenie odporności o ${esc(v)}%
       </p>`);
        }

        // Odnowienie absorpcji fizycznej
        const absorbPart = parts.find(p => p.startsWith("+absorb="));
        if (absorbPart) {
            const v = absorbPart.split("=")[1];
            card.push(`<p class="log-line effect-absorb" data-raw="${esc(absorbPart)}">
            +Odnowienie ${esc(v)} absorpcji fizycznej
       </p>`);
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
        // legbon_facade
        if (parts.some(p => p.startsWith("-legbon_facade"))) {
            const lb = mapLegbon("legbon_facade");
            card.push(`<p class="log-line ${lb.cls}" data-raw="-legbon_facade">
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

        
        // legbon_puncture
        if (parts.some(p => p.startsWith("+legbon_puncture"))) {
            const lb = mapLegbon("legbon_puncture");
            card.push(`<p class="log-line ${lb.cls}" data-raw="+legbon_puncture">
                    -${lb.txt}
               </p>`);
        }

        // 7) otrzymane obrażenia
        // znajdź wszystkie możliwe części obrażeń
        const physReceivePart = parts.find(p => p.startsWith("-dmgd=") || p.startsWith("-dmg="));
        const poisonReceivePart = parts.find(p => p.startsWith("-dmgo="));
        const fireReceivePart = parts.find(p => p.startsWith("+dmgf="));
        const coldReceivePart = parts.find(p => p.startsWith("+dmgc="));
        const shockReceivePart = parts.find(p => p.startsWith("+dmgl="));

        // jeżeli jest jakikolwiek debuff obrażeń, budujemy wpis w logu
        if (physReceivePart || poisonReceivePart || fireReceivePart || coldReceivePart || shockReceivePart) {
            // nazwa celu i jego %HP są w parts[1]
            const [targetKey, targetHp] = parts[1].split("=");
            const target = getF(targetKey);

            // tablica do zbierania fragmentów HTML
            const fragments = [];

            // fizyczne obrażenia
            if (physReceivePart) {
                const val = physReceivePart.split("=")[1];
                fragments.push(`<b class="Dd">-${esc(val)}</b>`);
            }

            // trucizna
            if (poisonReceivePart) {
                const val = poisonReceivePart.split("=")[1];
                fragments.push(`<span class="poison">-${esc(val)}</span>`);
            }

            // ogień
            if (fireReceivePart) {
                const val = fireReceivePart.split("=")[1];
                fragments.push(`<span class="fire">-${esc(val)}</span>`);
            }

            // zamrożenie
            if (coldReceivePart) {
                const val = coldReceivePart.split("=")[1];
                fragments.push(`<span class="frozen">-${esc(val)}</span>`);
            }

            // błyskawica
            if (shockReceivePart) {
                const val = shockReceivePart.split("=")[1];
                fragments.push(`<span class="blysk">-${esc(val)}</span>`);
            }

            // łączymy wszystkie fragmenty spacją
            const totalDamageHtml = fragments.join(" ");

            card.push(`
                <p class="log-line" data-raw="${esc(line)}">
                    ${target.Name} (${targetHp}%) otrzymał ${totalDamageHtml} obrażeń.
                </p>
            `);
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
        const poi = parts.find(p => p.startsWith("poison="));
        const inj_dmg = parts.find(p => p.startsWith("injure="));
        const light_dmg = parts.find(p => p.startsWith("light="));
        const fire_dmg = parts.find(p => p.startsWith("fire="));
        const anguish_dmg = parts.find(p => p.startsWith("anguish="))
        if (poi || inj_dmg) {
            // Wypuść wszystko co było przed nową kartą
            flush();

            // Ustaw klasę jednej, wspólnej karty
            cls = "card-heal";

            // Cel
            const tgtKey = parts[0].split("=")[0];
            const tgt = getF(tgtKey);

            // Linijka 1: obrażenia po zranieniu
            if (inj_dmg) {
                const [dmgI, pctI] = inj_dmg.split("=")[1].split(",");
                card.push(`
                  <p class="log-line effect-injure" data-raw="${esc(line)}">
                    ${tgt.Name}: ${dmgI},${pctI} obrażeń po zranieniu.
                  </p>
                `);
            }

            // Linijka 2: obrażenia z trucizny
            if (poi) {
                console.log(poi);
                const [dmgP] = poi.split("=")[1].split(",");
                const [, healthPct] = parts[0].split("=");
                card.push(`
                  <p class="log-line effect-poison" data-raw="${esc(line)}">
                    ${tgt.Name}(${esc(healthPct)}%): ${esc(dmgP)} obrażeń z trucizny.
                  </p>
                `);
            }


            // Wypuść jedną kartę zawierającą obie linijki
            flush();
        }
        // obrazenia od błyskawic
        if (light_dmg) {
            flush();
            cls = "card-light";

            const [tgtKey, healthPct] = parts[0].split("=");
            const tgt = getF(tgtKey);

            const raw = light_dmg.split("=")[1];

            let dmg;
            if (raw.includes(",")) {
                dmg = Math.floor(parseFloat(raw.replace(",", ".")));
            } else {
                dmg = parseInt(raw, 10);
            }

            card.push(`
              <p class="log-line effect-light" data-raw="${esc(line)}">
                ${tgt.Name}(${esc(healthPct)}%): otrzymał ${esc(dmg.toString())} obrażeń od błyskawic.
              </p>
            `);

            flush();
        }
        // obrazenia od ognia
        if (fire_dmg) {
            flush();
            cls = "card-light";

            const [tgtKey, healthPct] = parts[0].split("=");
            const tgt = getF(tgtKey);

            const raw = fire_dmg.split("=")[1];

            let dmg;
            if (raw.includes(",")) {
                dmg = Math.floor(parseFloat(raw.replace(",", ".")));
            } else {
                dmg = parseInt(raw, 10);
            }

            card.push(`
              <p class="log-line effect-fire" data-raw="${esc(line)}">
                ${tgt.Name}(${esc(healthPct)}%): otrzymał ${esc(dmg.toString())} obrażeń od ognia.
              </p>
            `);

            flush();
        }
        // krwawa udreka
        if (anguish_dmg) {
            flush();
            cls = "card-anguish";

            const [tgtKey, healthPct] = parts[0].split("=");
            const tgt = getF(tgtKey);

            const raw = anguish_dmg.split("=")[1];
            console.log(raw)
            let dmg;
            if (raw.includes(",")) {
                dmg = Math.floor(parseFloat(raw.replace(",", ".")));
            } else {
                dmg = raw;
            }

            card.push(`
              <p class="log-line effect-anguish" data-raw="${esc(line)}">
                ${tgt.Name}(${esc(healthPct)}%): otrzymał ${esc(dmg.toString())} od krwawej udręki.
              </p>
            `);

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

// Funkcja esc nie jest już potrzebna poza scope'em, ale jeśli jest używana gdzie indziej, to może zostać.
function esc(s) {
    return s.replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

//function parseBattleLogs(logs, fighters, battleStartText) {
//    const stats = {};
//    fighters.forEach(f => {
//        stats[f.Name] = {
//            turns: 0,
//            crit: 0,
//            vcrit: 0,
//            touch: 0,
//            buff: 0,
//            miss: 0,
//            block: 0,
//            parry: 0,
//            counter: 0,
//            heal: 0,
//            deep: 0
//        };
//    });

//    const containerLines = [];

//    // Dodaj na start BattleStart - pogrubione i wyraźne
//    if (battleStartText) {
//        containerLines.push(`<div class="battle-start">${escapeHtml(battleStartText)}</div>`);
//    }

//    // Funkcja do escapowania HTML (prosta)
//    function escapeHtml(text) {
//        return text.replace(/[&<>"']/g, m => ({
//            '&': '&amp;',
//            '<': '&lt;',
//            '>': '&gt;',
//            '"': '&quot;',
//            "'": '&#39;'
//        })[m]);
//    }

//    // Kolory dla żywiołów (klasy)
//    const elementClasses = {
//        ogien: 'element-fire',       // czerwony
//        trucizna: 'element-poison',  // zielony
//        fizyczne: 'element-phys',    // biały
//        zimno: 'element-ice',        // niebieski
//        blyskawice: 'element-lightning' // żółty
//    };

//    // Mapowanie keywordów na elementy
//    function getElementClass(text) {
//        if (/ogień|płonąca|grom z nieba|tarczę ognia/i.test(text)) return elementClasses.ogien;
//        if (/trucizna|zatruty|klątwa/i.test(text)) return elementClasses.trucizna;
//        if (/fizyczne|cios|atak/i.test(text)) return elementClasses.fizyczne;
//        if (/zimno|lodowa|mrozu|zamrożenie/i.test(text)) return elementClasses.zimno;
//        if (/błyskawic|grom|piorun/i.test(text)) return elementClasses.blyskawice;
//        return '';
//    }

//    logs.forEach(text => {
//        if (!text) return;

//        // Aktualizuj statystyki
//        fighters.forEach(f => {
//            if (text.includes(f.Name)) stats[f.Name].turns++;
//        });
//        fighters.forEach(f => {
//            if (/bardzo krytycz/i.test(text) && text.includes(f.Name)) stats[f.Name].vcrit++;
//            else if (/cios krytycz/i.test(text) && text.includes(f.Name)) stats[f.Name].crit++;
//            if (/Dotyk anioła/i.test(text) && text.includes(f.Name)) stats[f.Name].touch++;
//            if (/(emanuje|wykonuje|rzuci|aura)/i.test(text) && text.includes(f.Name)) stats[f.Name].buff++;
//            if (/unik|miss|nie traf/i.test(text) && text.includes(f.Name)) stats[f.Name].miss++;
//            if (/Blok/i.test(text) && text.includes(f.Name)) stats[f.Name].block++;
//            if (/Parowanie/i.test(text) && text.includes(f.Name)) stats[f.Name].parry++;
//            if (/Kontr/i.test(text) && text.includes(f.Name)) stats[f.Name].counter++;
//            if (/Przywrócono|zregenerowano/i.test(text) && text.includes(f.Name)) stats[f.Name].heal++;
//            if (/Głebok[ea] rani?/i.test(text) && text.includes(f.Name)) stats[f.Name].deep++;
//        });

//        // Podział na czas i treść (jeśli jest)
//        const m = text.match(/^\[(.*?)\]\s*(.*)$/);
//        let timePart = '', textPart = text;
//        if (m) {
//            timePart = `<span class="log-time">[${escapeHtml(m[1])}]</span> `;
//            textPart = m[2];
//        }

//        // Zamiana + na <br>+
//        textPart = escapeHtml(textPart).replace(/\+/g, '<br>+');

//        // Dodaj klasy specjalne
//        let cls = 'log-info';

//        if (/bardzo krytycz/i.test(textPart)) cls = 'log-damage';
//        else if (/cios krytycz/i.test(textPart)) cls = 'log-damage';
//        else if (/Przywrócono|zregenerowano/i.test(textPart)) cls = 'log-heal';
//        else if (/(emanuje|wykonuje|rzuci|aura)/i.test(textPart)) cls = 'log-buff';
//        else if (/unik|miss|nie traf/i.test(textPart)) cls = 'log-miss';

//        // Dodaj kolor dla elementu jeśli pasuje
//        const elementCls = getElementClass(textPart);
//        if (elementCls) cls += ` ${elementCls}`;

//        // Tury oznacz kolorem zależnie od drużyny
//        fighters.forEach(f => {
//            if (text.includes(f.Name) && text.includes('tura')) {
//                cls += f.Team === 1 ? ' team-1-turn' : f.Team === 2 ? ' team-2-turn' : '';
//            }
//        });

//        containerLines.push(`<div class="log-line ${cls}">${timePart}${textPart}</div>`);
//    });

//    return { stats, html: containerLines.join('') };
//}
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
