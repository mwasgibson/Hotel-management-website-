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
                window.location.href = 'dashboard.html';
                return;
            }
            loadStats();
            loadRooms();
            loadAllBookings();
            loadUsers();
        })
        .catch(error => console.error('Error loading profile:', error));
}

function loadStats() {
    fetch(`${API_URL}/admin/stats`, 
        {
            credentials: 'include' 
        })
        .then(res => res.json())
        .then(stats => {
            const roomCounts = {};
            (stats.rooms || []).forEach(r => roomCounts[r.status] = r.count);
            const bookingCounts = {};
            (stats.rooms || []).forEach(b => bookingCounts[b.booking_status] = b.count);

            document.getElementById('stats').innerHTML = `
                <div><strong>Available Rooms:</strong> ${escapeHtml(roomCounts.available || 0)}</div>
                <div><strong>Occupied Rooms:</strong> ${escapeHtml(roomCounts.occupied || 0)}</div>
                <div><strong>Reserved Rooms:</strong> ${escapeHtml(roomCounts.reserved || 0)}</div>
                <div><strong>Cleaning:</strong> ${escapeHtml(roomCounts.cleaning || 0)}</div>
                <div><strong>Maintenance:</strong> ${escapeHtml(roomCounts.maintenance || 0)}</div>
                <div><strong>Pending Bookings:</strong> ${escapeHtml(bookingCounts.pending || 0)}</div>
                <div><strong>Confirmed Bookings:</strong> ${escapeHtml(bookingCounts.confirmed || 0)}</div>
                <div><strong>Check-ins Today:</strong> ${escapeHtml(stats.checkInsToday)}</div>
                <div><strong>Check-outs Today:</strong> ${escapeHtml(stats.checkOutsToday)}</div>
                <div><strong>Total Revenue:</strong> KES ${escapeHtml(Number(stats.totalRevenue).toFixed(2))}</div>
            `;
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
                        actions += `<button onclick="roomAction(${room.id}, 'check-in')">Check In</button>`;
                    }
                    if (room.status === 'occupied') {
                        actions += `<button onclick="roomAction(${room.id}, 'check-out')">Check Out</button>`;
                    }
                    if (room.status === 'cleaning') {
                        actions += `<button onclick="roomAction(${room.id}, 'cleaning')">Finish Cleaning</button>`;
                    }
                }

                if (currentUserRole === 'admin') {
                    if (room.status === 'available') {
                        actions += `<button onclick="roomAction(${room.id}, 'start-maintenance')">Send to Maintenance</button>`;
                    }
                    if (room.status === 'maintenance') {
                        actions += `<button onclick="roomAction(${room.id}, 'finish-maintenance')">Finish Maintenance</button>`;
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
            alert(data.error || 'Action failed');
            return;
        }
        loadRooms();
        loadStats();
    })
    .catch(error => console.error('Error performing room action:', error));
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
                        <h4>Booking #${escapeHtml(booking.id)} — ${escapeHtml(booking.fullname)} (${escapeHtml(booking.email)})</h4>
                        <p>Room ${escapeHtml(booking.room_number)} — ${escapeHtml(booking.room_type)}</p>
                        <p>${escapeHtml(booking.check_in)} → ${escapeHtml(booking.check_out)}</p>
                        <p>Status: ${escapeHtml(booking.booking_status)}</p>
                        <p>Total: KES ${escapeHtml(Number(booking.total_amount).toFixed(2))}</p>
                        ${booking.booking_status === 'confirmed' ? `<button onclick="completeBooking(${booking.id})">Mark Completed</button>` : ''}
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
                alert(data.error || 'Failed to complete booking');
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