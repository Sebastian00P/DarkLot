document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img[tip]').forEach(img => {
        // 1) Pobierz zakodowany atrybut
        const rawTip = img.getAttribute('tip');
        // 2) Zdekoduj HTML entities (przywróć prawdziwe cudzysłowy itd.)
        const jsonString = htmlDecode(rawTip);
        let data;
        try {
            data = JSON.parse(jsonString);
        } catch (e) {
            console.warn('Invalid tip JSON:', e, jsonString);
            return;
        }

        // --- Wyciągnij rarity z danych
        const rarity = getRarityFromData(data);

        // --- Nadaj border na rodzica eq-item
        const parent = img.closest('.eq-item');
        if (parent) {
            parent.classList.remove('item-border-legendary', 'item-border-heroic', 'item-border-unique', 'item-border-common');
            if (rarity === 'legendary') parent.classList.add('item-border-legendary');
            else if (rarity === 'heroic') parent.classList.add('item-border-heroic');
            else if (rarity === 'unique') parent.classList.add('item-border-unique');
            else parent.classList.add('item-border-common');
        }

        // --- Tooltip
        tippy(img, {
            content: buildTooltipHtml(data, rarity),
            allowHTML: true,
            interactive: true,
            theme: 'noborder', // custom theme
            delay: [100, 50],
            maxWidth: 350,
            offset: [0, 10]
        });
    });

    // Inicjalizacja innych tooltipów na stronie (jeśli masz)
    tippy('.player.hastip', {
        theme: 'noborder',
        delay: [100, 50],
        maxWidth: 200
    });
});

// Wyciąga rarity z obiektu data lub z pola stat
function getRarityFromData(data) {
    if (data.rarity) return data.rarity.toLowerCase();
    if (data.Rarity) return data.Rarity.toLowerCase();
    if (data.rzadkosc) return data.rzadkosc.toLowerCase();
    // Szukaj w polu stat, np. rarity=heroic
    if (data.stat) {
        const match = data.stat.match(/rarity=([a-zA-Z]+)/i);
        if (match) return match[1].toLowerCase();
    }
    return 'common';
}

// Tworzy HTML do tooltippa
function buildTooltipHtml(data) {
    const stats = data._cachedStats || parseStatString(data.stat);

    // --- Nazwy klas i labeli rarity
    const rarityMap = {
        'legendary': { name: '* legendarny *', cls: 'tip-legendary' },
        'heroic': { name: '* heroiczny *', cls: 'tip-heroic' },
        'unique': { name: '* unikat *', cls: 'tip-unique' },
        'common': { name: '* zwykły *', cls: 'tip-common' },
    };
    let rarity = (stats.rarity || stats.rzadkosc || 'common').toLowerCase();
    let rarityLabel = rarityMap[rarity] ? `<div class="tip-rarity ${rarityMap[rarity].cls}">${rarityMap[rarity].name}</div>` : '';

    // --- Rozwinięcie skrótów profesji (reqp)
    const profMap = {
        m: "Mag",
        w: "Wojownik",
        p: "Paladyn",
        h: "Łowca",
        t: "Tropiciel",
        b: "Tancerz Ostrzy"
    };

    // --- Zaczynamy budowę html
    let html = `<div class="tip-title">${escapeHtml(data.name)}</div>${rarityLabel}`;
    if (stats.typ || data.type) {
        html += `<div>Typ: ${escapeHtml(stats.typ || data.type)}</div>`;
    }
    if (stats.pdmg) {
        html += `<div>Atak fizyczny: <span class="tip-plus">${numberWithSpaces(stats.pdmg)}</span></div>`;
    }
    // --- Obrażenia dystansowe (acdmg) — STRZAŁY, ŁUKI, KUSZE
    if (stats.acdmg) {
        html += `<div>Niszczy <span class="tip-num">${numberWithSpaces(stats.acdmg)} punktów pancerza podczas ciosu</span></div>`;
    }
   
    // --- Obrażenia dystansowe (dmg — na łukach itp. z min i max)
    if (stats.dmg) {
        const [min, max] = ('' + stats.dmg).split(',');
        html += `<div>Obrażenia fizyczne <span class="tip-num">${numberWithSpaces(min)} - ${numberWithSpaces(max)}</span></div>`;
    }
    // --- Obrażenia od trucizny (poison)
    if (stats.poison) {
        const [spow, dmg] = ('' + stats.poison).split(',');
        if (dmg) {
            html += `<div>Obrażenia od trucizny <span class="tip-plus">+${numberWithSpaces(dmg)}</span></div>`;
        }
        if (spow && spow !== "0") {
            html += `<div>Spowalnia cel o <span class="tip-spow">${Number(spow) / 100}</span></div>`;
        }
    }
    // --- Pancerz
    if (stats.ac) html += `<div>Pancerz: ${escapeHtml(stats.ac)}</div>`;
    // --- Pozostałe staty
    if (stats.runes) html += `<div>Runy: ${numberWithSpaces(stats.runes)}</div>`;

    if (stats.act) html += `<div>Odporność na truciznę +${escapeHtml(stats.act)}%</div>`;
    if (stats.resfire) html += `<div>Odporność na ogień +${escapeHtml(stats.resfire)}%</div>`;
    if (stats.crit) html += `<div>Cios krytyczny +${escapeHtml(stats.crit)}%</div>`;
    if (stats.critmval) html += `<div>Siła krytyka magicznego +${escapeHtml(stats.critmval)}%</div>`;
    if (stats.da) html += `<div>Wszystkie cechy +${escapeHtml(stats.da)}</div>`;
    if (stats.dz) html += `<div>Zręczność +${escapeHtml(stats.dz)}</div>`;
    if (stats.evade) html += `<div>Unik +${escapeHtml(stats.evade)}</div>`;
    if (stats.heal) html += `<div>Przywraca ${escapeHtml(stats.heal)} punktów życia podczas walki</div>`;
    if (stats.hp || stats['życie']) html += `<div>Życie +${escapeHtml(stats.hp || stats['życie'])}</div>`;
    if (stats.legbon) html += `<div><i class="legbon">Krytyczna osłona: przyjmowane ciosy krytyczne są o 20% słabsze.</i></div>`;
    if (stats.light) html += `<div>Obrażenia od błyskawic 1-${escapeHtml(stats.light.replace(',', ','))}</div>`;
    if (stats.manabon) html += `<div>Mana +${escapeHtml(stats.manabon)}</div>`;
    if (stats.sa) html += `<div>SA +${Number(stats.sa) / 100}</div>`;
    if (stats.slow) html += `<div>Obniża SA przeciwnika o ${Number(stats.slow) / 100}</div>`;
    if (stats.ds) html += `<div>Siła +${escapeHtml(stats.ds)}</div>`;

    if (stats.leczy) html += `<div>Leczy ${escapeHtml(stats.leczy)} punktów życia</div>`;

    // --- Ilość, dzielenie, pojemność
    if (stats.amount) html += `<div>Ilość: ${escapeHtml(stats.amount)}${stats.cansplit ? ' (Można dzielić)' : ''}</div>`;
    if (stats.capacity) html += `<div>Maksimum ${escapeHtml(stats.capacity)} sztuk razem</div>`;

    // --- Specjalne właściwości
    if (stats.teleport) html += `<div><i class="idesc">Teleportuje gracza</i></div>`;
    if (stats.permbound) html += `<div>Związany z właścicielem na stałe</div>`;
    if (stats.binds) html += `<div>Wiąże po założeniu</div>`;

    // --- Opis (italic)
    if (stats.opis) html += `<div><i class="idesc">${escapeHtml(stats.opis)}</i></div>`;

    // --- Wymagania
    if (stats.lvl) html += `<div class="tip-req"><b>Wymagany poziom: ${escapeHtml(stats.lvl)}</b></div>`;
    if (stats.reqp) {
        const prof = stats.reqp
            .split('')
            .map(code => profMap[code] || code)
            .join(', ');
        html += `<div class="tip-req"><b>Wymagana profesja: ${prof}</b></div>`;
    }

    // --- Wartość (pr)
    const prValue = Number(data.pr || stats.pr);
    if (!isNaN(prValue) && prValue > 0) {
        html += `<div><span">Wartość:</span> <b>${formatGold(prValue)}</b> 🪙</div>`;
    }

    return `<div class="tip-inner">${html}</div>`;
}


function getRarityFromStat(statStr) {
    // Przeszukaj string stat pod kątem "rarity"
    if (!statStr) return null;
    const match = statStr.match(/rarity=([^;]+)/i);
    return match ? match[1].toLowerCase() : null;
}

// Przykład mapowania statów dla parseStatString:
function parseStatString(str) {
    if (!str) return {};
    return str.split(';').filter(s => s).reduce((acc, pair) => {
        const [k, v] = pair.split('=');
        acc[k.toLowerCase()] = v === undefined ? true : v;
        return acc;
    }, {});
}

// Escapuje html
function escapeHtml(text) {
    const str = text == null ? '' : String(text);
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Dekoduje encje html
function htmlDecode(input) {
    const txt = document.createElement('textarea');
    txt.innerHTML = input;
    return txt.value;
}

function numberWithSpaces(x) {
    if (!x) return '';
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function numberWithSpaces(x) {
    if (!x) return '';
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatGold(value) {
    if (value >= 1e6)
        return (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'm';
    if (value >= 1e3)
        return (value / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return numberWithSpaces(value);
}
