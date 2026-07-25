function loadServicesPicker(containerId) {
    fetch(`${API_URL}/services`, { credentials: 'include' })
        .then(res => res.json())
        .then(services => {
            const container = document.getElementById(containerId);
            container.innerHTML = '<h3>Optional Services</h3>';

            services.forEach(service => {
                container.innerHTML += `
                    <label>
                        <input type="checkbox" class="service-checkbox" value="${service.id}" data-price="${service.price}">
                        ${service.name} — KES ${service.price}
                        ${service.description ? `<small>${service.description}</small>` : ''}
                    </label>
                `;
            });
        })
        .catch(error => console.error('Error loading services:', error));
}

function getSelectedServices() {
    return Array.from(document.querySelectorAll('.service-checkbox:checked'))
        .map(checkbox => ({ service_id: Number(checkbox.value), quantity: 1 }));
}

function applyPromoPreview() {
    const code = document.getElementById('promo_code').value;
    if (!code) return;

    const servicesTotal = Array.from(document.querySelectorAll('.service-checkbox:checked'))
        .reduce((sum, cb) => sum + Number(cb.dataset.price), 0);

    const roomSubtotal = window.currentBookingSubtotal || 0;   // each page sets this once it knows the room price/nights

    fetch(`${API_URL}/deals/preview-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: roomSubtotal + servicesTotal })
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        const result = document.getElementById('promoPreviewResult');
        if (!ok) {
            result.textContent = data.error;
            result.style.color = 'red';
            return;
        }
        result.textContent = `${data.dealTitle}: KES ${data.discount} off`;
        result.style.color = 'green';
    })
    .catch(error => console.error('Error checking promo code:', error));
}