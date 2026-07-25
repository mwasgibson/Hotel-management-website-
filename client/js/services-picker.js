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