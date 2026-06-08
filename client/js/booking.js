function bookRoom() {
    
    const token = localStorage.getItem('token');

    fetch('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            room_id: document.getElementById('room_id').value,
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