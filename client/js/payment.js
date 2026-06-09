function payBooking() {

    const token = localStorage.getItem('token');
    const booking_id = document.getElementById('booking_id').value;

    fetch('http://localhost:3000/api/payments', {
        
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ booking_id })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Payment successful:', data);
    })
    .catch(error => {
        console.error('Error occurred while processing payment:', error);
    });
}