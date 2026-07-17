const reserveParams = new URLSearchParams(window.location.search);
const preselectedRoomForReserve = reserveParams.get('room_number');
if (preselectedRoomForReserve) {
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('room_number').value = preselectedRoomForReserve;
    });
}

function loadRoomOptions() {
    fetch(`${API_URL}/rooms`, { credentials: 'include' })
        .then(res => res.json())
        .then(rooms => {
            const select = document.getElementById('room_number');
            select.innerHTML = '<option value="">Select a room</option>';

            rooms
                .filter(room => room.status === 'available')
                .forEach(room => {
                    select.innerHTML += `<option value="${room.room_number}">Room ${room.room_number} — ${room.room_type} (KES ${room.price}/night)</option>`;
                });

            // if we arrived here from the room detail page, pre-select that room
            if (preselectedRoom) {
                select.value = preselectedRoom;
            }
        })
        .catch(error => console.error('Error loading rooms:', error));
}

loadRoomOptions();

function reserveRoom() {
    const token = getCookie('token');

    fetch(`${API_URL}/bookings/reserve`, {
        credentials: 'include',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            room_number: document.getElementById('room_number').value,
            check_in: document.getElementById('check_in').value,
            check_out: document.getElementById('check_out').value
        })
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) {
            alert(data.error || 'Reservation failed');
            return;
        }
        window.location.href = `payment.html?booking_id=${data.bookingId}`;
    })
    .catch(error => {
        console.error('Error reserving room:', error);
        alert('Unable to connect to the server.');
    });
}