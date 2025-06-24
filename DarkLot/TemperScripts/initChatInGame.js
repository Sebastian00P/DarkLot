// ==UserScript==
// @name          DarkLot Clan Chat Overlay
// @namespace     http://tampermonkey.net/
// @version       2025-06-25.01
// @description   Chat klanowy z poprawnym wyświetlaniem daty i godziny (UTC→ lokalny + data) oraz drag&drop, wyborem klanu, toggle/show-hide, poprawiona kolejność i scroll (backend wybiera klan z sesji)
// @author        Dark-Sad
// @match         https://lelwani.margonem.pl/*
// @grant         none
// @run-at        document-idle
// ==/UserScript==

(async function () {
    'use strict';

    const API_BASE = 'https://localhost:7238/api/chatapi';
    const STORAGE_KEY = 'dl_chat_pos';
    const STORAGE_VIS = 'dl_chat_vis';
    const REFRESH_INTERVAL = 500; // ms

    async function apiGet(path) {
        const res = await fetch(API_BASE + path, { credentials: 'include' });
        if (!res.ok) { console.error('[DL CHAT] GET failed:', res.status); return []; }
        try { return await res.json(); }
        catch { console.warn('[DL CHAT] invalid JSON'); return []; }
    }

    async function apiPost(body) {
        const res = await fetch(API_BASE, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) console.error('[DL CHAT] POST failed:', res.status);
    }

    // Pobierz listę klanów
    const clans = await apiGet('/clans');
    if (!clans.length) return;
    let activeClan = clans[0].id;

    // Stwórz kontener chatu
    const chat = document.createElement('div');
    chat.id = 'dl-chat';
    chat.style.cssText = `
        position:fixed; width:280px; height:400px;
        background:rgba(0,0,0,0.85); color:white;
        border:1px solid #18a8ff; border-radius:6px;
        display:flex; flex-direction:column;
        font-family:Arial,sans-serif; z-index:999999;
    `;

    // Header: tytuł, wybór klanu, toggle
    const header = document.createElement('div');
    header.style.cssText = `
        cursor:move; padding:4px; background:#111;
        display:flex; align-items:center; gap:4px;
    `;
    const title = document.createElement('span');
    title.textContent = 'Czat klanowy';
    title.style.flex = '1'; title.style.fontSize = '14px';
    const clanSelect = document.createElement('select');
    clanSelect.style.cssText = `
        background:#222; color:white; border:none;
        padding:2px; font-size:12px;
    `;
    clans.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.name;
        clanSelect.append(opt);
    });
    clanSelect.value = activeClan;
    clanSelect.onchange = () => { activeClan = clanSelect.value; refresh(); };
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '–';
    toggleBtn.style.cssText = `
        background:none; border:none; color:#18a8ff;
        cursor:pointer; font-size:16px; line-height:1;
    `;
    header.append(title, clanSelect, toggleBtn);
    chat.appendChild(header);

    // Okno wiadomości
    const windowEl = document.createElement('div');
    windowEl.id = 'dl-chat-window';
    windowEl.style.cssText = `
        flex:1; overflow-y:auto; padding:6px;
        font-size:12px; background:#000;
    `;
    windowEl.addEventListener('wheel', e => {
        windowEl.scrollTop += e.deltaY;
        e.preventDefault();
    }, { passive: false });
    chat.appendChild(windowEl);

    // Input + send
    const inputWrapper = document.createElement('div');
    inputWrapper.style.cssText = `
        display:flex; border-top:1px solid #333;
        background:#111;
    `;
    const input = document.createElement('input');
    input.type = 'text'; input.placeholder = 'Wpisz wiadomość…';
    input.style.cssText = `
        flex:1; padding:6px; background:#222;
        border:none; color:white; font-size:12px;
    `;
    const sendBtn = document.createElement('button');
    sendBtn.textContent = '▶';
    sendBtn.style.cssText = `
        width:30px; background:#18a8ff;
        border:none; color:#000; cursor:pointer;
        font-size:14px;
    `;
    inputWrapper.append(input, sendBtn);
    chat.appendChild(inputWrapper);

    document.body.appendChild(chat);

    // Toggle show/hide
    let showBtn = null;
    function setHidden(hidden) {
        if (hidden) {
            chat.style.display = 'none';
            if (!showBtn) {
                showBtn = document.createElement('button');
                showBtn.textContent = '✉';
                showBtn.style.cssText = `
                    position:fixed; bottom:20px; right:20px;
                    width:40px; height:40px;
                    background:#18a8ff; color:#000;
                    border:none; border-radius:50%;
                    cursor:pointer; font-size:20px;
                    z-index:999999;
                `;
                showBtn.onclick = () => {
                    setHidden(false);
                    localStorage.setItem(STORAGE_VIS, '0');
                };
                document.body.appendChild(showBtn);
            }
        } else {
            chat.style.display = 'flex';
            if (showBtn) {
                showBtn.remove();
                showBtn = null;
            }
        }
    }
    toggleBtn.onclick = () => {
        const hidden = localStorage.getItem(STORAGE_VIS) === '1';
        setHidden(!hidden);
        localStorage.setItem(STORAGE_VIS, hidden ? '0' : '1');
    };
    if (localStorage.getItem(STORAGE_VIS) === '1') {
        setHidden(true);
    }

    // Draggable
    (function (el, handle) {
        let dx = 0, dy = 0, dragging = false;
        handle.onmousedown = e => {
            dragging = true;
            dx = e.clientX - el.offsetLeft;
            dy = e.clientY - el.offsetTop;
            e.preventDefault();
        };
        document.onmousemove = e => {
            if (!dragging) return;
            el.style.left = (e.clientX - dx) + 'px';
            el.style.top = (e.clientY - dy) + 'px';
        };
        document.onmouseup = () => {
            if (dragging) {
                dragging = false;
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    x: chat.offsetLeft,
                    y: chat.offsetTop
                }));
            }
        };
    })(chat, header);

    // Przywróć pozycję
    const pos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (pos.x != null) {
        chat.style.left = pos.x + 'px';
        chat.style.top = pos.y + 'px';
    } else {
        chat.style.right = '20px';
        chat.style.bottom = '20px';
    }

    // Refresh & send
    function formatDateTime(isoString) {
        // parsuj jako UTC, potem wyświetl lokalnie z datą i godziną
        const d = new Date(isoString + 'Z');
        const Y = d.getFullYear();
        const M = String(d.getMonth() + 1).padStart(2, '0');
        const D = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${Y}-${M}-${D} ${hh}:${mm}`;
    }

    async function refresh() {
        let msgs = await apiGet('/' + activeClan);
        // odwróć, żeby najstarsze u góry
        msgs = msgs.slice().reverse();
        windowEl.innerHTML = '';
        msgs.forEach(m => {
            const ts = formatDateTime(m.sentAt);
            const div = document.createElement('div');
            div.style.marginBottom = '4px';
            div.innerHTML = `
                <strong>${m.nickName}</strong>: ${m.message}
                <span style="float:right;color:#888;font-size:10px;">${ts}</span>
            `;
            windowEl.appendChild(div);
        });
        windowEl.scrollTop = windowEl.scrollHeight;
    }

    sendBtn.onclick = async () => {
        const txt = input.value.trim();
        if (!txt) return;
        await apiPost({ clanId: activeClan, message: txt });
        input.value = '';
        refresh();
    };
    input.onkeydown = e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendBtn.click();
        }
    };

    refresh();
    setInterval(refresh, REFRESH_INTERVAL);

})();
