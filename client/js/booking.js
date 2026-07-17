function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

const bookingParams = new URLSearchParams(window.location.search);
const preselectedRoomNumber = bookingParams.get('room_number');
const preselectedRoomType = bookingParams.get('room_type');
const preselectedPrice = bookingParams.get('price');

document.addEventListener('DOMContentLoaded', () => {
    if (preselectedRoomNumber) {
        // Arrived from the room details page — lock the room in, no picking needed
        document.getElementById('room_number_hidden').value = preselectedRoomNumber;
        document.getElementById('room_number').style.display = 'none';

        const display = document.getElementById('selectedRoomDisplay');
        display.style.display = 'block';
        display.innerHTML = `<p>Booking: Room ${escapeHtml(preselectedRoomNumber)} — ${escapeHtml(preselectedRoomType)} (KES ${escapeHtml(preselectedPrice)}/night)</p>`;
    } else {
        loadRoomOptions();   // landed here directly — fall back to manual selection
    }
});

let preselectedRoom = null;

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
        })
        .catch(error => console.error('Error loading rooms:', error));
}

function getSelectedRoomNumber() {
    return preselectedRoomNumber || document.getElementById('room_number').value;
}

function bookRoom() {
    const token = getCookie('token');

    fetch(`${API_URL}/bookings`, {
        credentials: 'include',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
            room_number: getSelectedRoomNumber(),
            check_in: document.getElementById('check_in').value,
            check_out: document.getElementById('check_out').value
        })
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) {
            alert(data.error || 'Booking failed');
            return;
        }
       // window.location.href = `payment.html?booking_id=${data.bookingId}`;
    })
    .catch(error => {
        console.error('Error booking room:', error);
        alert('Unable to connect to the server.');
    });
}
/*
function reserveRoom(roomId) {

    const user_id = document.getElementById("user_id").value;
    const check_in = document.getElementById("check_in").value;
    const check_out = document.getElementById("check_out").value;

    fetch(`${API_URL}/bookings/reserve`, {
        credentials: 'include',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            user_id,
            room_number: roomId,
            check_in,
            check_out
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        location.reload();
    })
    .catch(console.error);

} */ //still don't know if i should remove it