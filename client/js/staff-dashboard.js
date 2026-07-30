function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

let currentUserRole = null;

loadProfileAndInit();

function loadProfileAndInit() {
    fetch(`${API_URL}/auth/profile`, { credentials: 'include' })
        .then(res => {
            if (res.status === 401) {
                window.location.href = 'login.html';
                return null;
            }
            return res.json();
        })
        .then(user => {
            if (!user) return;
            currentUserRole = user.role;
            if (currentUserRole !== 'admin' && currentUserRole !== 'receptionist') {
                document.getElementById('usersHeading').textContent = currentUserRole === 'admin' ? 'All Accounts' : 'Guests';
                document.getElementById('usersHeading').style.display = 'block';                
                window.location.href = 'dashboard.html';
                return;
            }
            loadUsers();
            loadStats();
            loadRooms();
            loadAllBookings();
            loadPendingManualPayments();
            loadEventRequests();
            if (currentUserRole === 'admin' || currentUserRole === 'receptionist') {
                document.getElementById('walkInLink').style.display = 'inline-block';
            }
            if (currentUserRole === 'admin') {
                document.getElementById('servicesHeading').style.display = 'block';
                document.getElementById('manageServices').style.display = 'block';
                loadServicesManager();
            }
            if (currentUserRole === 'receptionist') {
                document.getElementById('serviceLink').style.display = 'inline-block';
            }
            if (currentUserRole === 'admin') {
                document.getElementById('dealsHeading').style.display = 'block';
                document.getElementById('manageDeals').style.display = 'block';
                loadDealsManager();
            }
            if (currentUserRole === 'admin') {
                document.getElementById('eventSpacesHeading').style.display = 'block';
                document.getElementById('manageEventSpaces').style.display = 'block';
                loadEventSpacesManager();
            }                       
        })
        .catch(error => console.error('Error loading profile:', error));
}

function loadPendingManualPayments() {
    fetch(`${API_URL}/payments/pending-manual`, { credentials: 'include' })
        .then(res => res.json())
        .then(payments => {
            const container = document.getElementById('pendingManualPayments');
            container.innerHTML = payments.length ? '' : '<p>No pending payments.</p>';

            payments.forEach(payment => {
                container.innerHTML += `
                    <div>
                        <p>${escapeHtml(payment.fullname)} (${escapeHtml(payment.email || 'walk-in')}) — ${escapeHtml(payment.payment_method)} — KES ${escapeHtml(Number(payment.amount).toFixed(2))}</p>
                        <p>${escapeHtml(payment.check_in)} → ${escapeHtml(payment.check_out)}</p>
                        <button onclick="confirmManualPayment(${payment.id})">Confirm Payment Received</button>
                        <hr>
                    </div>
                `;
            });
        })
        .catch(error => console.error('Error loading pending payments:', error));
}

function confirmManualPayment(paymentId) {
    fetch(`${API_URL}/payments/${paymentId}/confirm-manual`, { credentials: 'include', method: 'PATCH' })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) { showToast(data.error || 'Failed to confirm payment', 'error'); return; }
            showToast('Payment confirmed', 'success');
            loadPendingManualPayments();
            loadStats();
        })
        .catch(error => console.error('Error confirming payment:', error));
}

function loadEventRequests() {
    fetch(`${API_URL}/events/bookings`, { credentials: 'include' })
        .then(res => res.json())
        .then(bookings => {
            const container = document.getElementById('eventRequestsList');
            container.innerHTML = bookings.length ? '' : '<p>No event bookings.</p>';

            bookings.forEach(b => {
                container.innerHTML += `
                    <div>
                        <p>${escapeHtml(b.space_name)} (${escapeHtml(b.type)}) — ${escapeHtml(b.guest_name)}</p>
                        <p>${escapeHtml(b.event_date)}, ${escapeHtml(b.start_time)}–${escapeHtml(b.end_time)} — ${escapeHtml(b.expected_attendees || '?')} guests</p>
                        <p>Status: ${escapeHtml(b.status)}${b.quoted_amount ? ` — KES ${escapeHtml(b.quoted_amount)}` : ''} — Payment: ${escapeHtml(b.payment_status)}</p>
                        ${b.status === 'requested' ? `
                            <input type="number" id="quote_${b.id}" placeholder="Quote amount (KES)">
                            <button onclick="sendEventQuote(${b.id})">Send Quote</button>
                        ` : ''}
                        ${b.status === 'confirmed' && b.payment_status === 'pending' ? `<button onclick="confirmEventPayment(${b.id})">Confirm Payment</button>` : ''}
                        <hr>
                    </div>
                `;
            });
        })
        .catch(error => console.error('Error loading event requests:', error));
}

function sendEventQuote(id) {
    const amount = document.getElementById(`quote_${id}`).value;

    fetch(`${API_URL}/events/bookings/${id}/quote`, {
        credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoted_amount: amount })
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) { showToast(data.error || 'Failed to send quote', 'error'); return; }
        showToast('Quote sent', 'success');
        loadEventRequests();
    })
    .catch(error => console.error('Error sending quote:', error));
}

function confirmEventPayment(id) {
    fetch(`${API_URL}/events/bookings/${id}/confirm-payment`, { credentials: 'include', method: 'PATCH' })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) { showToast(data.error || 'Failed to confirm payment', 'error'); return; }
            showToast('Payment confirmed', 'success');
            loadEventRequests();
        })
        .catch(error => console.error('Error confirming event payment:', error));
}

function loadEventSpacesManager() {
    fetch(`${API_URL}/events/spaces`, { credentials: 'include' })
        .then(res => res.json())
        .then(spaces => {
            const container = document.getElementById('manageEventSpaces');

            container.innerHTML = spaces.map(space => `
                <div>
                    <p>${escapeHtml(space.name)} — ${escapeHtml(space.type)} — up to ${escapeHtml(space.capacity)} guests — KES ${escapeHtml(space.hourly_rate)}/hr</p>
                    <button onclick="deleteEventSpace(${space.id})">Remove</button>
                </div>
                <br>
            `).join('');
            container.innerHTML += `
                <h3>New Event Space</h3>
                <input type="text" id="newSpaceName" placeholder="Name">
                <select id="newSpaceType">
                    <option value="conference">Conference Room</option>
                    <option value="wedding">Wedding Hall</option>
                    <option value="boardroom">Boardroom</option>
                </select>
                <input type="number" id="newSpaceCapacity" placeholder="Capacity">
                <input type="number" id="newSpaceRate" placeholder="Hourly rate (KES)">
                <textarea id="newSpaceDescription" placeholder="Description"></textarea>
                <input type="text" id="newSpaceImageUrl" placeholder="Image URL (optional)">
                <button onclick="addEventSpace()">Add Event Space</button>
            `;
        })
        .catch(error => console.error('Error loading event spaces:', error));
}

function addEventSpace() {
    const body = {
        name: document.getElementById('newSpaceName').value,
        type: document.getElementById('newSpaceType').value,
        capacity: document.getElementById('newSpaceCapacity').value,
        hourly_rate: document.getElementById('newSpaceRate').value,
        description: document.getElementById('newSpaceDescription').value || null,
        image_url: document.getElementById('newSpaceImageUrl').value || null
    };

    fetch(`${API_URL}/events/spaces`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) { showToast(data.error || 'Failed to add event space', 'error'); return; }
        showToast('Event space added', 'success');
        loadEventSpacesManager();
    })
    .catch(error => console.error('Error adding event space:', error));
}

function deleteEventSpace(id) {
    fetch(`${API_URL}/events/spaces/${id}`, { credentials: 'include', method: 'DELETE' })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) { showToast(data.error || 'Failed to remove event space', 'error'); return; }
            showToast('Event space removed', 'success');
            loadEventSpacesManager();
        })
        .catch(error => console.error('Error removing event space:', error));
}

function loadStats() {
    fetch(`${API_URL}/admin/stats`, { credentials: 'include' })
        .then(res => res.json())
        .then(stats => {
            const roomCounts = {};
            stats.rooms.forEach(r => roomCounts[r.status] = r.count);
            const bookingCounts = {};
            stats.bookings.forEach(b => bookingCounts[b.booking_status] = b.count);

            document.getElementById('stats').innerHTML = `
                <div><strong>Available Rooms:</strong> ${escapeHtml(roomCounts.available || 0)}</div>
                <div><strong>Occupied Rooms:</strong> ${escapeHtml(roomCounts.occupied || 0)}</div>
                <div><strong>Reserved Rooms:</strong> ${escapeHtml(roomCounts.reserved || 0)}</div>
                <div><strong>Cleaning:</strong> ${escapeHtml(roomCounts.cleaning || 0)}</div>
                <div><strong>Maintenance:</strong> ${escapeHtml(roomCounts.maintenance || 0)}</div>
                <div><strong>Pending Bookings:</strong> ${escapeHtml(bookingCounts.pending || 0)}</div>
                <div><strong>Confirmed Bookings:</strong> ${escapeHtml(bookingCounts.confirmed || 0)}</div>
                <div><strong>New Reservations Today:</strong> ${escapeHtml(stats.todayReservations)}</div>
                <div><strong>Check-ins Today:</strong> ${escapeHtml(stats.checkInsToday)}</div>
                <div><strong>Check-outs Today:</strong> ${escapeHtml(stats.checkOutsToday)}</div>
                <div><strong>Total Revenue:</strong> KES ${escapeHtml(Number(stats.totalRevenue).toFixed(2))}</div>
            `;

            renderRevenueChart(stats.revenueLast7Days);
            renderOccupancyChart(stats.occupancyLast7Days);
            renderUpcomingCheckIns(stats.upcomingCheckIns);
        })
        .catch(error => console.error('Error loading stats:', error));
}

function loadRooms() {
    fetch(`${API_URL}/rooms`, 
        {
            credentials: 'include' 
        })
        .then(res => res.json())
        .then(rooms => {
            const grid = document.getElementById('roomGrid');
            grid.innerHTML = '';

            rooms.forEach(room => {
                let actions = '';
                if (currentUserRole === 'receptionist') {
                    if (room.status === 'reserved' || room.status === 'available') {
                        actions += `<button onclick="roomAction(${room.room_number}, 'check-in')">Check In</button>`;
                    }
                    if (room.status === 'occupied') {
                        actions += `<button onclick="roomAction(${room.room_number}, 'check-out')">Check Out</button>`;
                    }
                    if (room.status === 'cleaning') {
                        actions += `<button onclick="roomAction(${room.room_number}, 'cleaning')">Finish Cleaning</button>`;
                    }
                }
                if (currentUserRole === 'admin') {
                    if (room.status === 'available') {
                        actions += `<button onclick="roomAction(${room.room_number}, 'start-maintenance')">Send to Maintenance</button>`;
                    }
                    if (room.status === 'maintenance') {
                        actions += `<button onclick="roomAction(${room.room_number}, 'finish-maintenance')">Finish Maintenance</button>`;
                    }
                }

                grid.innerHTML += `
                    <div>
                        <h3>Room ${escapeHtml(room.room_number)} — ${escapeHtml(room.room_type)}</h3>
                        <p>Status: <strong>${escapeHtml(room.status)}</strong></p>
                        <p>Price: KES ${escapeHtml(room.price)}</p>
                        ${actions}
                        <hr>
                    </div>
                `;
            });
        })
        .catch(error => console.error('Error loading rooms:', error));
}

function roomAction(roomId, action) {
    const body = action === 'start-maintenance' ? { status: 'available' } : {};

    fetch(`${API_URL}/rooms/${roomId}/${action}`, {
        credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) {
            showToast(data.error || 'Action failed');
            return;
        }
        loadRooms();
        loadStats();
    })
    .catch(error => console.error('Error performing room action:', error));
}

function loadServicesManager() {
    fetch(`${API_URL}/services`, { credentials: 'include' })
        .then(res => res.json())
        .then(services => {
            const container = document.getElementById('manageServices');
            container.innerHTML = services.map(s => `
                <div>
                    <p>${escapeHtml(s.name)} — KES ${escapeHtml(s.price)}</p>
                    <button onclick="deleteService(${s.id})">Remove</button>
                </div>
            `).join('') + `
                <br>
                <input type="text" id="newServiceName" placeholder="Service name">
                <input type="number" id="newServicePrice" placeholder="Price">
                <button onclick="addService()">Add Service</button>
            `;
        })
        .catch(error => console.error('Error loading services:', error));
}

function addService() {
    const name = document.getElementById('newServiceName').value;
    const price = document.getElementById('newServicePrice').value;

    fetch(`${API_URL}/services`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price })
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) { showToast(data.error || 'Failed to add service', 'error'); return; }
        showToast('Service added', 'success');
        loadServicesManager();
    })
    .catch(error => console.error('Error adding service:', error));
}

function deleteService(id) {
    fetch(`${API_URL}/services/${id}`, { credentials: 'include', method: 'DELETE' })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) { showToast(data.error || 'Failed to remove service', 'error'); return; }
            showToast('Service removed', 'success');
            loadServicesManager();
        })
        .catch(error => console.error('Error removing service:', error));
}

function loadDealsManager() {
    fetch(`${API_URL}/deals`, { credentials: 'include' })
        .then(res => res.json())
        .then(deals => {
            const container = document.getElementById('manageDeals');
            container.innerHTML = deals.map(deal => `
                <div>
                    <p>
                        ${escapeHtml(deal.title)} —
                        ${deal.discount_type === 'percentage' ? `${escapeHtml(deal.discount_value)}%` : `KES ${escapeHtml(deal.discount_value)}`} off
                        ${deal.promo_code ? ` — code <code>${escapeHtml(deal.promo_code)}</code>` : ''}
                    </p>
                    <p>${escapeHtml(deal.start_date)} → ${escapeHtml(deal.end_date)}</p>
                    <button onclick="deleteDeal(${deal.id})">Remove</button>
                </div>
                <br>
            `).join('');
            container.innerHTML += `
                <h3>New Deal</h3>
                <input type="text" id="newDealTitle" placeholder="Title">
                <textarea id="newDealDescription" placeholder="Description"></textarea>
                <select id="newDealDiscountType">
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount (KES)</option>
                </select>
                <input type="number" id="newDealDiscountValue" placeholder="Discount value">
                <input type="text" id="newDealPromoCode" placeholder="Promo code (optional)">
                <label>Start date</label>
                <input type="date" id="newDealStartDate">
                <label>End date</label>
                <input type="date" id="newDealEndDate">
                <input type="text" id="newDealImageUrl" placeholder="Image URL (optional)">
                <button onclick="addDeal()">Add Deal</button>
            `;
        })
        .catch(error => console.error('Error loading deals:', error));
}

function addDeal() {
    const body = {
        title: document.getElementById('newDealTitle').value,
        description: document.getElementById('newDealDescription').value || null,
        discount_type: document.getElementById('newDealDiscountType').value,
        discount_value: document.getElementById('newDealDiscountValue').value,
        promo_code: document.getElementById('newDealPromoCode').value || null,
        start_date: document.getElementById('newDealStartDate').value,
        end_date: document.getElementById('newDealEndDate').value,
        image_url: document.getElementById('newDealImageUrl').value || null
    };

    fetch(`${API_URL}/deals`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) { showToast(data.error || 'Failed to add deal', 'error'); return; }
        showToast('Deal created', 'success');
        loadDealsManager();
    })
    .catch(error => console.error('Error adding deal:', error));
}

function deleteDeal(id) {
    fetch(`${API_URL}/deals/${id}`, { credentials: 'include', method: 'DELETE' })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) { showToast(data.error || 'Failed to remove deal', 'error'); return; }
            showToast('Deal removed', 'success');
            loadDealsManager();
        })
        .catch(error => console.error('Error removing deal:', error));
}

function loadAllBookings(queryString = '') {
    fetch(`${API_URL}/admin/bookings${queryString}`, { credentials: 'include' })
        .then(res => res.json())
        .then(bookings => {
            const container = document.getElementById('allBookings');
            container.innerHTML = '';

            if (!bookings.length) {
                container.innerHTML = '<p>No bookings match your search.</p>';
                return;
            }

            bookings.forEach(booking => {
                container.innerHTML += `
                    <div>
                        <h4>Booking #${escapeHtml(booking.room_number)} — ${escapeHtml(booking.fullname)} (${escapeHtml(booking.email)})</h4>
                        <p>Room ${escapeHtml(booking.room_number)} — ${escapeHtml(booking.room_type)}</p>
                        <p>${escapeHtml(booking.check_in)} → ${escapeHtml(booking.check_out)}</p>
                        <p>Status: ${escapeHtml(booking.booking_status)}</p>
                        <p>Total: KES ${escapeHtml(Number(booking.total_amount).toFixed(2))}</p>
                        <hr>
                    </div>
                `;
            });
        })
        .catch(error => console.error('Error loading bookings:', error));
}

function searchBookings() {
    const params = new URLSearchParams();
    const status = document.getElementById('bookingStatusFilter').value;
    const guest = document.getElementById('guestFilter').value;
    const check_in = document.getElementById('bookingCheckInFilter').value;
    const check_out = document.getElementById('bookingCheckOutFilter').value;

    if (status) params.set('status', status);
    if (guest) params.set('guest', guest);
    if (check_in) params.set('check_in', check_in);
    if (check_out) params.set('check_out', check_out);

    const query = params.toString();
    loadAllBookings(query ? `?${query}` : '');
}

function clearBookingFilters() {
    document.getElementById('bookingStatusFilter').value = '';
    document.getElementById('guestFilter').value = '';
    document.getElementById('bookingCheckInFilter').value = '';
    document.getElementById('bookingCheckOutFilter').value = '';
    loadAllBookings();
}

function completeBooking(id) {
    fetch(`${API_URL}/bookings/${id}/complete`, { credentials: 'include', method: 'PUT' })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                showToast(data.error || 'Failed to complete booking');
                return;
            }
            loadAllBookings();
            loadStats();
        })
        .catch(error => console.error('Error completing booking:', error));
}

function loadUsers() {
    fetch(`${API_URL}/admin/users`, { credentials: 'include' })
        .then(res => res.json())
        .then(users => {
            const container = document.getElementById('allUsers');
            container.innerHTML = '';
            users.forEach(user => {
                container.innerHTML += `
                    <div><p>${escapeHtml(user.fullname)} — ${escapeHtml(user.email)} — <em>${escapeHtml(user.role)}</em></p></div>
                `;
            });
        })
        .catch(error => console.error('Error loading users:', error));
}

let revenueChartInstance = null;
let occupancyChartInstance = null;

function renderRevenueChart(data) {
    const labels = data.map(d => new Date(d.day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }));
    const values = data.map(d => Number(d.revenue));

    if (revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(document.getElementById('revenueChart'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Revenue (KES)', data: values, backgroundColor: '#c9a84c' }] },
        options: { responsive: true, plugins: { title: { display: true, text: 'Revenue — last 7 days' } } }
    });
}

function renderOccupancyChart(data) {
    const labels = data.map(d => new Date(d.day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }));
    const values = data.map(d => Number(d.occupied_rooms));

    if (occupancyChartInstance) occupancyChartInstance.destroy();

    occupancyChartInstance = new Chart(document.getElementById('occupancyChart'), {
        type: 'line',
        data: { labels, datasets: [{ label: 'Rooms Occupied', data: values, borderColor: '#2e4057', tension: 0.3 }] },
        options: { responsive: true, plugins: { title: { display: true, text: 'Occupancy — last 7 days' } } }
    });
}

function renderUpcomingCheckIns(checkIns) {
    const container = document.getElementById('upcomingCheckIns');
    container.innerHTML = checkIns.length ? '' : '<p>No upcoming check-ins.</p>';

    checkIns.forEach(c => {
        container.innerHTML += `<p>${escapeHtml(c.guest_name)} — Room ${escapeHtml(c.room_number)} — ${escapeHtml(c.check_in)}</p>`;
    });
}