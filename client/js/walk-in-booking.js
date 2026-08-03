function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

loadRoomOptions();

function loadRoomOptions() {
    fetch(`${API_URL}/rooms`, { credentials: 'include' })
        .then(res => res.json())
        .then(rooms => {
            const select = document.getElementById('room_number');
            select.innerHTML = '<option value="">Select a room</option>';
            rooms.filter(room => room.status === 'available').forEach(room => {
                select.innerHTML += `<option value="${room.room_number}">Room ${room.room_number} — ${room.room_type} (KES ${room.price}/night)</option>`;
            });
        })
        .catch(error => console.error('Error loading rooms:', error));
}

const paymentMethod = document.getElementById("payment_method");
paymentMethod.addEventListener("change", () => {
    document.getElementById("mpesaFields").style.display =
        paymentMethod.value === "mpesa"
            ? "block"
            : "none";
});

loadServicesPicker('servicesPicker');

function toggleWalkInPaymentFields() {
    const method = document.getElementById('payment_method').value;
    document.getElementById('mpesaPhoneField').style.display = method === 'mpesa' ? 'block' : 'none';
    document.getElementById('paymentReceivedLabel').style.display = method === 'mpesa' ? 'none' : 'block';
}

toggleWalkInPaymentFields();   // set the correct initial state on page load

function createWalkInBooking() {
    const payment_method = document.getElementById('payment_method').value;
    const body = {
        fullname: document.getElementById('fullname').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value || null,
        room_number: document.getElementById('room_number').value,
        check_in: document.getElementById('check_in').value,
        check_out: document.getElementById('check_out').value,
        payment_method,
        payment_received: payment_method === 'mpesa' ? false : document.getElementById('payment_received').checked,
        services: typeof getSelectedServices === 'function' ? getSelectedServices() : [],
        promo_code: document.getElementById('promo_code')?.value || null
    };

    fetch(`${API_URL}/bookings/walk-in`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) {
            showToast(data.error || 'Failed to create reservation', 'error');
            return;
        }

        if (payment_method === 'mpesa') {
            const phone = document.getElementById('phone').value;
            if (!phone) {
                showToast('Enter a phone number to send the M-Pesa prompt', 'error');
                return;
            }
            sendWalkInStkPush(data.bookingId, phone, data);
        } else {
            showToast('Walk-in reservation created', 'success');
            renderWalkInResult(data);
        }
    })
    .catch(error => {
        console.error('Error creating walk-in booking:', error);
        showToast('Unable to connect to the server.', 'error');
    });
}

function sendSTKPush(bookingId, phone){
    showToast('Sending M-Pesa prompt to guest\'s phone...', 'info');

    fetch(`${API_URL}/mpesa/stkpush`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, phoneNumber: phone })
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) {
            showToast(data.error || 'Failed to send M-Pesa prompt', 'error');
            return;
        }
        showToast('Prompt sent — waiting for the guest to complete payment...', 'info');
        pollWalkInPaymentStatus(bookingId, bookingData);
    })
    .catch(error => {
        console.error('Error sending STK push:', error);
        showToast('Unable to connect to the server.', 'error');
    });
}

function pollPayment(bookingId){
    let attempts = 0;
    const maxAttempts = 40;   // ~2 minutes at 3s intervals

    const interval = setInterval(() => {
        attempts++;

        fetch(`${API_URL}/payments/status/${bookingId}`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'paid') {
                    clearInterval(interval);
                    showToast('Payment confirmed!', 'success');
                    renderWalkInResult(bookingData);
                } else if (data.status === 'Failed') {
                    clearInterval(interval);
                    showToast('Payment failed or was cancelled on the guest\'s phone.', 'error');
                }
            })
            .catch(error => console.error('Error checking payment status:', error));

        if (attempts >= maxAttempts) {
            clearInterval(interval);
            showToast('Still waiting on confirmation — check the staff dashboard shortly.', 'info');
        }
    }, 3000);
}

function showWalkInTab(tab, btn) {
    document.getElementById('roomBookingTab').style.display = tab === 'room' ? 'block' : 'none';
    document.getElementById('eventBookingTab').style.display = tab === 'event' ? 'block' : 'none';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

let eventSpacesCache = [];

function loadEventSpaceOptions() {
    fetch(`${API_URL}/events/spaces`, { credentials: 'include' })
        .then(res => res.json())
        .then(spaces => {
            eventSpacesCache = spaces;
            const select = document.getElementById('event_space_id');
            select.innerHTML = '<option value="">Select a space</option>';
            spaces.forEach(space => {
                select.innerHTML += `<option value="${space.id}">${escapeHtml(space.name)} — KES ${escapeHtml(space.hourly_rate)}/hr</option>`;
            });
        })
        .catch(error => console.error('Error loading event spaces:', error));
}

loadEventSpaceOptions();

['event_space_id', 'event_start_time', 'event_end_time'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateSuggestedQuote);
});

function computeSuggestedQuote(hourlyRate, startTime, endTime) {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const hours = (endH + endM / 60) - (startH + startM / 60);
    if (hours <= 0) return 0;
    return Math.round(hours * hourlyRate);
}

function updateSuggestedQuote() {
    const spaceId = document.getElementById('event_space_id').value;
    const start = document.getElementById('event_start_time').value;
    const end = document.getElementById('event_end_time').value;
    if (!spaceId || !start || !end) return;

    const space = eventSpacesCache.find(s => s.id == spaceId);
    if (!space) return;

    const suggested = computeSuggestedQuote(space.hourly_rate, start, end);
    document.getElementById('suggestedQuoteDisplay').textContent = suggested > 0 ? `Suggested: KES ${suggested}` : 'End time must be after start time';
    if (suggested > 0) document.getElementById('event_quoted_amount').value = suggested;
}

function createWalkInEventBooking() {
    const body = {
        fullname: document.getElementById('event_fullname').value,
        phone: document.getElementById('event_phone').value,
        email: document.getElementById('event_email').value || null,
        event_space_id: document.getElementById('event_space_id').value,
        event_date: document.getElementById('event_date').value,
        start_time: document.getElementById('event_start_time').value,
        end_time: document.getElementById('event_end_time').value,
        expected_attendees: document.getElementById('event_attendees').value || null,
        purpose: document.getElementById('event_purpose').value || null,
        quoted_amount: document.getElementById('event_quoted_amount').value
    };

    fetch(`${API_URL}/events/bookings/walk-in`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) { showToast(data.error || 'Failed to create event reservation', 'error'); return; }
        showToast('Event reservation created', 'success');
        document.getElementById('eventResult').innerHTML = `<p>Event booking #${escapeHtml(data.id)} created and quoted.</p>`;
        document.querySelector('#eventBookingTab form').reset();
    })
    .catch(error => console.error('Error creating walk-in event booking:', error));
}

function printReceipt(data) {
    document.getElementById('result').innerHTML = `
        <p>Booking #${escapeHtml(data.bookingId)} — Total: KES ${escapeHtml(Number(data.total_amount).toFixed(2))} — Status: ${escapeHtml(data.booking_status)}</p>
        <button type="button" onclick='printReceipt(${JSON.stringify(data)})'>Print Receipt</button>
    `;
    document.querySelector('form').reset();
    toggleWalkInPaymentFields();
    loadRoomOptions();
}