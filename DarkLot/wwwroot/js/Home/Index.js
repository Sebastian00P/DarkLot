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
            delay: [0, 0],
            maxWidth: 450,
            offset: [0, 10],
        });
    });

    // Inicjalizacja innych tooltipów na stronie (jeśli masz)
    tippy('.player.hastip', {
        theme: 'noborder',
        delay: [100, 50],
        maxWidth: 200
    });

    tippy('[data-tippy-content]:not([tip])', {
        theme: 'light-border',
        delay: [100, 30],
        placement: 'top',
        maxWidth: 300
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

    // Nazwy klas i labeli rarity
    const rarityMap = {
        'legendary': { name: '* legendarny *', cls: 'tip-legendary' },
        'heroic': { name: '* heroiczny *', cls: 'tip-heroic' },
        'unique': { name: '* unikat *', cls: 'tip-unique' },
        'common': { name: '* zwykły *', cls: 'tip-common' },
    };
    let rarity = (stats.rarity || stats.rzadkosc || 'common').toLowerCase();
    let rarityLabel = rarityMap[rarity] ? `<div class="tip-rarity ${rarityMap[rarity].cls}">${rarityMap[rarity].name}</div>` : '';
    const rarityClass = rarityMap[rarity] ? rarityMap[rarity].cls : 'tip-common';

    // Rozwinięcie skrótów profesji
    const profMap = {
        m: "Mag",
        w: "Wojownik",
        p: "Paladyn",
        h: "Łowca",
        t: "Tropiciel",
        b: "Tancerz Ostrzy"
    };

    const legBonMap = {
        facade: 'Fasada opieki: przyjmowane ciosy są o 13% słabsze',
        curse: 'Klątwa: po otrzymaniu obrażeń nakłada klątwę na atakującego',
        lastheal: 'Ostatni ratunek: kiedy po otrzymanym ataku zostanie graczowi mniej niż 18% życia, zostaje jednorazowo uleczony do 30-50% swojego życia.',
        critred: 'Redukcja krytyków: obrażenia z ciosów krytycznych zmniejszone o X%',
        holytouch: 'Dotyk anioła: podczas ataku 7% szansy na regenrację 6% życia przez trzy najbliższe tury',
        verycrit: 'Wielki krytyk: zwiększa szansę na cios krytyczny o X%',
        cleanse: 'Oczyszczenie: po użyciu umiejętności leczy z negatywnych efektów',
        glare: 'Oślepienie: atak ma szansę oślepić przeciwnika',
        // DODAJ DOWOLNĄ ILOŚĆ SWOICH, przykłady wyżej
    };


    // Budowa HTML
    let html = `<div class="tip-title ${rarityClass}">${escapeHtml(data.name)}</div>${rarityLabel}`;
    const itemType = guessItemType(data, stats);
    if (itemType) {
        html += `<div>Typ: ${escapeHtml(itemType)}</div>`;
    }
    if (stats.ac) html += `<div>Pancerz: <span class="tip-value">${escapeHtml(stats.ac)}</span></div>`;

    if (stats.pdmg) {
        html += `<div>Atak fizyczny: <span class="tip-value">${numberWithSpaces(stats.pdmg)}</span></div>`;
    }
    if (stats.dmg) {
        const [min, max] = ('' + stats.dmg).split(',');
        html += `<div>Obrażenia fizyczne <span class="tip-value">${numberWithSpaces(min)} - ${numberWithSpaces(max)}</span></div>`;
    }
   
   
    if (stats.frost) {
        const [saReduce, frostDmg] = ('' + stats.frost).split(',');
        if (frostDmg) {
            html += `<div>Obrażenia od zimna <span class="tip-value">${numberWithSpaces(frostDmg)}</span></div>`;
        }
        if (saReduce && Number(saReduce) > 0) {
            html += `<div>Zmniejsza o<span class="tip-value"> ${(Number(saReduce) / 100).toFixed(2)} </span>szybkość ataku celu</div>`;
        }
    }

    if (stats.fire) html += `<div>Obrażenia od ognia <span class="tip-value">~${numberWithSpaces(stats.fire)}</span></div>`;
    if (stats.light) html += `<div>Obrażenia od błyskawic <span class="tip-value">1-${escapeHtml(stats.light.replace(',', ','))}</span></div>`;
    if (stats.acdmg) {
        html += `<div>Niszczy <span class="tip-value">${numberWithSpaces(stats.acdmg)}</span> punktów pancerza podczas ciosu</div>`;
    }
    if (stats.poison) {
        const [spow, dmg] = ('' + stats.poison).split(',');
        if (dmg) {
            html += `<div>Obrażenia od trucizny <span class="tip-value">+${numberWithSpaces(dmg)}</span></div>`;
        }
        if (spow && spow !== "0") {
            html += `<div>Spowalnia cel o <span class="tip-value">${Number(spow) / 100}</span></div>`;
        }
    }
    if (stats.critval) html += `<div>Moc ciosku krytycznego fizycznego <span class="tip-value">+${escapeHtml(stats.critval)}%</span></div>`;

    if (stats.absorb) html += `<div>Absorbuje do <span class="tip-value">${numberWithSpaces(stats.absorb)}</span> obrażeń fizycznych</div>`;
    if (stats.absorbm) html += `<div>Absorbuje do <span class="tip-value">${numberWithSpaces(stats.absorbm)}</span> obrażen magicznych</div>`;
    if (stats.contra) {
        html += `<div><span class="tip-value">+${escapeHtml(stats.contra)}%</span> szans na kontratak po ciosie krytycznym</div>`;
    }
    if (stats.blok) html += `<div>Blok <span class="tip-value">+${escapeHtml(stats.blok)}</span></div>`;
    if (stats.pierceb) html += `<div><span class="tip-value">+${escapeHtml(stats.pierceb)}%</span> szans na zablokowanie przebicia</div>`;
    if (stats.pierce) {
        html += `<div>Przebicie pancerza <span class="tip-value">+${escapeHtml(stats.pierce)}%</span></div>`;
    }
    if (stats.hp || stats['życie']) html += `<div>Życie <span class="tip-value">+${escapeHtml(stats.hp || stats['życie'])}</span></div>`;
    if (stats.leczy) html += `<div>Leczy <span class="tip-value">${escapeHtml(stats.leczy)}</span> punktów życia</div>`;
    if (stats.heal) html += `<div>Przywraca <span class="tip-value">${escapeHtml(stats.heal)}</span> punktów życia podczas walki</div>`;
    
    if (stats.da) html += `<div>Wszystkie cechy <span class="tip-value">+${escapeHtml(stats.da)}</span></div>`;
    if (stats.ds) html += `<div>Siła <span class="tip-value">+${escapeHtml(stats.ds)}</span></div>`;
    if (stats.dz) html += `<div>Zręczność <span class="tip-value">+${escapeHtml(stats.dz)}</span></div>`;
    if (stats.di) html += `<div>Intelekt <span class="tip-value">+${numberWithSpaces(stats.di)}</span></div>`;

    if (stats.evade) html += `<div>Unik <span class="tip-value">+${escapeHtml(stats.evade)}</span></div>`;
    if (stats.act) html += `<div>Odporność na truciznę <span class="tip-value">+${escapeHtml(stats.act)}%</span></div>`;
    if (stats.resfire) html += `<div>Odporność na ogień <span class="tip-value">+${escapeHtml(stats.resfire)}%</span></div>`;
    if (stats.reslight) html += `<div>Odporność na błyskawice <span class="tip-value">+${escapeHtml(stats.reslight)}%</span></div>`;
    if (stats.resfrost) html += `<div>Odporność na zimno <span class="tip-value">+${escapeHtml(stats.resfrost)}%</span></div>`;
    if (stats.resdmg) html += `<div>Niszczenie odporności magicznych o <span class="tip-value">${escapeHtml(stats.resdmg)}%</span> podczas ciosu</div>`;
    if (stats.enfatig) {
        const [chance, energy] = ('' + stats.enfatig).split(',');
        html +=
            `<div><span class="tip-value">+${escapeHtml(chance)}%</span>` +
            ` szans na utratę <span class="tip-value">${escapeHtml(energy)}</span>` +
            ` energii przez przeciwnika podczas obrony</div>`;
    }
    if (stats.manafatig) {
        const [chance, mana] = ('' + stats.manafatig).split(',');
        html +=
            `<div><span class="tip-value">+${escapeHtml(chance)}%</span>` +
            ` szans na zniszczenie <span class="tip-value">${escapeHtml(mana)}</span>` +
            ` many przez przeciwnika podczas obrony</div>`;
    }

    if (stats.crit) html += `<div>Cios krytyczny <span class="tip-value">+${escapeHtml(stats.crit)}%</span></div>`;
    if (stats.critmval) html += `<div>Siła krytyka magicznego <span class="tip-value">+${escapeHtml(stats.critmval)}%</span></div>`;
    if (stats.hpbon) {
        html += `<div><span class="tip-value">+${escapeHtml(stats.hpbon)}</span> życia za 1 pkt siły</div>`;
    }
    if (stats.lowevade) {
        html += `<div>Podczas ataku unik przeciwnika jest mniejszy o <span class="tip-value">${escapeHtml(stats.lowevade)}</span></div>`;
    }
    if (stats.sa) html += `<div>SA <span class="tip-value">+${Number(stats.sa) / 100}</span></div>`;
    if (stats.slow) html += `<div>Obniża SA przeciwnika o <span class="tip-value">${Number(stats.slow) / 100}</span></div>`;

    if (stats.manabon) html += `<div>Mana <span class="tip-value">+${escapeHtml(stats.manabon)}</span></div>`;
    if (stats.energybon) html += `<div>Energia <span class="tip-value">+${escapeHtml(stats.energybon)}</span></div>`;
    if (stats.runes) html += `<div>Dodaje <span class="tip-value">+${numberWithSpaces(stats.runes)}</span> Smoczych Run</div>`;
    if (stats.wound) {
        const [chance, dmg] = ('' + stats.wound).split(',');
        html += `<div>Głęboka rana, <span class="tip-value">${chance}%</span> szans na <span class="tip-value">+${numberWithSpaces(dmg)}</span> obrażeń</div>`;
    }

    // Ilość, dzielenie, pojemność
    if (stats.amount) html += `<div>Ilość: <span class="tip-value">${escapeHtml(stats.amount)}</span>${stats.cansplit ? ' (Można dzielić)' : ''}</div>`;
    if (stats.capacity) html += `<div>Maksimum <span class="tip-value">${escapeHtml(stats.capacity)}</span> sztuk razem</div>`;
    if (stats.gold && Number(stats.gold) > 0) {
        html += `<div><span>Złoto </span> <b class="tip-value">+${formatGold(stats.gold)}</b></div>`;
    }
    if (stats.bag) {
        html += `<div>Mieści <span class="tip-value">${escapeHtml(stats.bag)}</span> przedmiotów</div>`;
    }
    // Specjalne właściwości
    if (stats.teleport) html += `<div><i class="idesc">Teleportuje gracza</i></div>`;
    if (stats.afterheal) {
        const parts = stats.afterheal.split(",");
        if (parts.length === 2) {
            const chance = parts[0].trim();
            const healAmount = parts[1].trim();
            html += `<div> <b>${chance}%</b> szans na wyleczenie <b>${healAmount}</b> obrażeń po walce</div>`;
        }
    }
    if (stats.respred) {
        html += `<div>Przyśpiesza wracanie do siebie o <b>${stats.respred}%</b></div>`;       
    }

    if (stats.legbon) {
        let bon = ('' + stats.legbon).split(',')[0];
        let value = ('' + stats.legbon).split(',')[1];
        let desc = legBonMap[bon] || 'Nieznana właściwość legendarna';
        html += `<div class="text-center"><i class="legbon tip-legendary">${desc.replace('X', value || '?')}</i></div>`;
    }

    if (stats.opis) html += `<div><i class="idesc">${escapeHtml(stats.opis)}</i></div>`;
   
    if (stats.permbound) html += `<div>Związany z właścicielem na stałe</div>`;
    if (stats.binds) html += `<div>Wiąże po założeniu</div>`;

    // Opis (italic)
   
   
    // Wymagania
    if (stats.lvl) html += `<div class="tip-req"><b>Wymagany poziom: <span class="tip-req">${escapeHtml(stats.lvl)}</span></b></div>`;
    if (stats.reqp) {
        const prof = stats.reqp
            .split('')
            .map(code => profMap[code] || code)
            .join(', ');
        html += `<div class="tip-req"><b>Wymagana profesja: <span class="tip-req">${prof}</span></b></div>`;
    }

    // Wartość (pr)
    const prValue = Number(data.pr || stats.pr);
    if (!isNaN(prValue) && prValue > 0) {
        html += `<div><span>Wartość:</span> <b class="tip-value">${formatGold(prValue)}</b> 🪙</div>`;
    }

    return `<div class="tip-inner">${html}</div>`;
}

function guessItemType(data, stats) {
    if (stats.typ) return stats.typ;
    if (data.type) return data.type;
    if (!data.icon) return null;

    // Ikony broni i pancerza
    if (data.icon.startsWith("luk/")) return "Dystansowa";
    if (data.icon.startsWith("top/")) return "Dwuręczna";
    if (data.icon.startsWith("tar/")) return "Tarcza";
    if (data.icon.startsWith("zbr/")) return "Zbroja";
    if (data.icon.startsWith("hel/")) return "Hełm";
    if (data.icon.startsWith("nas/")) return "Naszyjnik";
    if (data.icon.startsWith("but/")) return "Buty";
    if (data.icon.startsWith("rek/")) return "Rękawice";
    if (data.icon.startsWith("pie/")) return "Pierścień";
    if (data.icon.startsWith("tal/")) return "Talizman";
    if (data.icon.startsWith("mie/")) return "Broń";
    if (data.icon.startsWith("bro/")) return "Broń";
    if (data.icon.startsWith("roz/")) return "Różdżka";
    if (data.icon.startsWith("arr/")) return "Strzały";
    if (data.icon.startsWith("orb/")) return "Orb";
    if (data.icon.startsWith("bag/")) return "Torba";
    if (data.icon.startsWith("pap/")) return "Teleport";
    if (data.icon.startsWith("zlo/")) return "Złoto";
    // Możesz dodać więcej własnych reguł

    return null;
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
