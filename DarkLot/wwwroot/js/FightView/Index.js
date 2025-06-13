document.addEventListener('DOMContentLoaded', () => {
    console.log('[Battles] DOM ready');

    const container = document.getElementById('battles-container');
    const pageSize = 10;
    let currentPage = parseInt(container.dataset.page, 10) || 1;

    // 1) Pobiera pełną listę aktualnej strony i zwraca ostatni element
    async function fetchFill() {
        const res = await fetch(`/FightView/GetPageJson?page=${currentPage}&pageSize=${pageSize}`);
        if (!res.ok) throw new Error(res.statusText);
        const arr = await res.json();
        // jeżeli pełnych 10 rekordów, to brakujący to arr[9]
        return arr.length === pageSize ? arr[arr.length - 1] : null;
    }

    // 2) Buduje HTML jednej karty
    function buildCard(b) {
        return `
        <div class="battle-card">
          <div class="battle-header">
            <div style="flex:1;display:flex;align-items:center;gap:10px;">
              <a href="/FightView/Details?battleId=${b.id}" class="battle-player">
                ${b.creatorNickName}
              </a> ·
              <a href="/FightView/Details?battleId=${b.id}" class="battle-player">
                zobacz log walki
              </a>
              ${b.winnerName
                ? `<span class="battle-winner" style="margin-left:10px;font-weight:bold;color:green;">
                     ${b.winnerName}
                   </span>`
                : ''}
            </div>
            <div class="battle-meta">
              <div>${b.serverName}</div>
              <div>
                ${new Date(b.creationTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                ${new Date(b.creationTime).toLocaleDateString('pl-PL')}
              </div>
              <span class="material-icons delete-btn" data-id="${b.id}">delete</span>
            </div>
          </div>
          <div class="battle-start">${b.battleStart}</div>
        </div>`;
    }

    // 3) Rysuje paginację w JS
    function renderPagination(current, total) {
        if (total <= 1) return '';

        // 1. Zbierz “elementy” paginacji: numery i ewentualne "..."
        const items = [];
        items.push(1);

        if (current > 3) {
            items.push('...');
        }

        // strony od max(2, current-1) do min(total-1, current+1)
        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);
        for (let i = start; i <= end; i++) {
            items.push(i);
        }

        if (current < total - 2) {
            items.push('...');
        }

        if (total > 1) {
            items.push(total);
        }

        // 2. Zbuduj HTML
        let html = '';

        // «
        html += `<li class="page-item ${current === 1 ? 'disabled' : ''}">
               <a class="page-link" href="?page=${current - 1}">«</a>
             </li>`;

        for (const item of items) {
            if (item === '...') {
                html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
            } else {
                html += `<li class="page-item ${current === item ? 'active' : ''}">
                       <a class="page-link" href="?page=${item}">${item}</a>
                     </li>`;
            }
        }

        // »
        html += `<li class="page-item ${current === total ? 'disabled' : ''}">
               <a class="page-link" href="?page=${current + 1}">»</a>
             </li>`;

        return html;
    }


    // 4) Obsługa kliknięcia delete
    container.addEventListener('click', async e => {
        const btn = e.target.closest('.delete-btn');
        if (!btn) return;
        const battleId = btn.dataset.id;
        const card = btn.closest('.battle-card');
        const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

        // 4.1) Wyślij DELETE
        const resDel = await fetch(`/FightView/Delete?battleId=${battleId}`, {
            method: 'DELETE',
            headers: { 'RequestVerificationToken': token }
        });
        if (!resDel.ok) {
            console.error('DELETE failed', await resDel.text());
            return;
        }

        // 4.2) Animacja „exit”
        card.classList.add('exit');
        card.addEventListener('animationend', async () => {
            card.remove();

            // 4.3) Pobranie brakującego rekordu
            try {
                const fill = await fetchFill();
                if (fill) {
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = buildCard(fill).trim();
                    const newCard = wrapper.firstElementChild;
                    newCard.classList.add('enter');
                    container.appendChild(newCard);
                    newCard.addEventListener('animationend', () => newCard.classList.remove('enter'), { once: true });
                }
            } catch (err) {
                console.warn('fetchFill failed', err);
            }

            // 4.4) Odświeżenie paginacji / ewentualne przejście na poprzednią stronę
            try {
                const infoRes = await fetch(`/FightView/GetPagingInfo?page=${currentPage}&pageSize=${pageSize}`);
                if (!infoRes.ok) throw new Error(infoRes.statusText);
                const { currentPage: newPage, totalPages: newTotal } = await infoRes.json();

                // jeśli strona przekroczyła zakres, przejdź na ostatnią dostępną
                if (newPage > newTotal) {
                    const target = newTotal > 0 ? newTotal : 1;
                    return window.location.href = `?page=${target}`;
                }

                // podmień tylko paginację inline
                currentPage = newPage;
                container.dataset.page = newPage;
                const nav = document.getElementById('battles-pagination');
                nav.innerHTML = `<ul class="pagination justify-content-center">
                             ${renderPagination(newPage, newTotal)}
                           </ul>`;
            } catch (err) {
                console.warn('could not refresh pagination', err);
            }
        }, { once: true });
    });
});