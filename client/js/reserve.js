const reserveParams = new URLSearchParams(window.location.search);
const preselectedRoomForReserve = reserveParams.get('room_number');
if (preselectedRoomForReserve) {
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('room_number').value = preselectedRoomForReserve;
    });
}

function reserveRoom() {
    const token = getCookie('token');

    fetch(`${API_URL}/bookings/reserve`, {
        credentials: 'include',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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