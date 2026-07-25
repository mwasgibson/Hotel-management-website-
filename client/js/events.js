function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

loadEventSpaces();

function loadEventSpaces() {
    const type = document.getElementById('filter_type').value;
    const capacity = document.getElementById('filter_capacity').value;

    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (capacity) params.set('min_capacity', capacity);

    fetch(`${API_URL}/events/spaces?${params.toString()}`, { credentials: 'include' })
        .then(res => res.json())
        .then(spaces => {
            const container = document.getElementById('eventSpaces');
            container.innerHTML = '';

            if (!spaces.length) {
                container.innerHTML = '<p>No event spaces match your filters.</p>';
                return;
            }

            spaces.forEach(space => {
                container.innerHTML += `
                    <div class="card">
                        ${space.image_url ? `<img src="${escapeHtml(space.image_url)}" alt="${escapeHtml(space.name)}">` : ''}
                        <h3>${escapeHtml(space.name)}</h3>
                        <p>${escapeHtml(space.type)} — up to ${escapeHtml(space.capacity)} guests</p>
                        <p>KES ${escapeHtml(space.hourly_rate)}/hour</p>
                        <p>${escapeHtml(space.description || '')}</p>
                        <button type="button" onclick="openRequestForm(${space.id}, '${escapeHtml(space.name)}')">Request a Quote</button>
                    </div>
                `;
            });
        })
        .catch(error => console.error('Error loading event spaces:', error));
}

function openRequestForm(spaceId, spaceName) {
    document.getElementById('eventSpaces').innerHTML = `
        <h2>Request: ${escapeHtml(spaceName)}</h2>
        <form>
            <input type="date" id="event_date">
            <label>Start time</label>
            <input type="time" id="start_time">
            <label>End time</label>
            <input type="time" id="end_time">
            <input type="number" id="expected_attendees" placeholder="Expected attendees">
            <textarea id="purpose" placeholder="Tell us about your event"></textarea>
            <button type="button" onclick="submitRequest(${spaceId})">Submit Request</button>
        </form>
    `;
}

function submitRequest(spaceId) {
    const body = {
        event_space_id: spaceId,
        event_date: document.getElementById('event_date').value,
        start_time: document.getElementById('start_time').value,
        end_time: document.getElementById('end_time').value,
        expected_attendees: document.getElementById('expected_attendees').value || null,
        purpose: document.getElementById('purpose').value || null
    };

    fetch(`${API_URL}/events/bookings`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(response => response.json().then(data => ({ status: response.status, ok: response.ok, data })))
    .then(({ status, ok, data }) => {
        if (!ok) {
            if (status === 401) { window.location.href = 'login.html'; return; }
            showToast(data.error || 'Failed to submit request', 'error');
            return;
        }
    showToast(data.message, 'success');
    loadEventSpaces();
})
    .catch(error => console.error('Error submitting event request:', error));
}