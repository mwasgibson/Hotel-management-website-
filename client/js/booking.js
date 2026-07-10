const API_URL ="https://bookish-yodel-97gx7r7xqgxjcxrx4-3000.app.github.dev/api";

function bookRoom() {

    fetch(`${API_URL}/bookings`, {
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
    .then(response => response.json())
    .then(data => {
        console.log('Room booked successfully:', data);
    })
    .catch(error => {
        console.error('Error booking room:', error);
    });
}