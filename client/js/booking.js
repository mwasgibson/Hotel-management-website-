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
    })
    .catch(error => {
        console.error('Error booking room:', error);
    });
}