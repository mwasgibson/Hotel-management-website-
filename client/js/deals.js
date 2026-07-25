function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

fetch(`${API_URL}/deals`, { credentials: 'include' })
    .then(res => res.json())
    .then(deals => {
        const container = document.getElementById('deals');
        if (!deals.length) {
            container.innerHTML = '<p>No active promotions right now — check back soon.</p>';
            return;
        }
        deals.forEach(deal => {
            const discountText = deal.discount_type === 'percentage' ? `${deal.discount_value}% off` : `KES ${deal.discount_value} off`;
            container.innerHTML += `
                <div class="card">
                    ${deal.image_url ? `<img src="${escapeHtml(deal.image_url)}" alt="${escapeHtml(deal.title)}">` : ''}
                    <h3>${escapeHtml(deal.title)}</h3>
                    <p>${escapeHtml(deal.description || '')}</p>
                    <p><strong>${discountText}</strong>${deal.promo_code ? ` — use code <code>${escapeHtml(deal.promo_code)}</code>` : ''}</p>
                    <p class="countdown" data-end="${deal.end_date}">Calculating time left...</p>
                </div>
            `;
        });
        startCountdowns();
    })
    .catch(error => {
        console.error('Error loading deals:', error);
        document.getElementById('deals').innerHTML = '<p>Unable to load deals right now.</p>';
    });

function startCountdowns() {
    const elements = document.querySelectorAll('.countdown');

    function update() {
        const now = new Date().getTime();
        elements.forEach(el => {
            const end = new Date(el.dataset.end).getTime();
            const diff = end - now;
            if (diff <= 0) {
                el.textContent = 'This deal has ended';
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            el.textContent = `Ends in ${days}d ${hours}h ${minutes}m`;
        });
    }

    update();
    setInterval(update, 60000);   // minute-level precision is plenty; no need to redraw every second
}