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
            room_number: document.getElementById('room_number').value,
            check_in: document.getElementById('check_in').value,
            check_out: document.getElementById('check_out').value
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Room booked successfully:', data);
        window.location.href = `payment.html?booking_id=${data.booking_id}`;
    })
    .catch(error => {
        console.error('Error booking room:', error);
    });
}

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

}