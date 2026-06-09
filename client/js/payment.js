const token = localStorage.getItem('token');
const params = new URLSearchParams(window.location.search);
const bookingId = params.get('booking');    

    fetch(`http://localhost:3000/api/bookings/${bookingId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        
        document.getElementById('bookingInfo').innerHTML = `
            <p>Booking ID: ${data.id}</p>
            <p>Room: ${data.room_number}</p>
            <p>Check-in: ${data.check_in}</p>
            <p>Check-out: ${data.check_out}</p>
            <p>Total Price: KES${data.total_price.toFixed(2)}</p>
        `;
    })
    .catch(error => {
        console.error('Error:', error);
    });

function payBooking() {

    const payment_method = document.getElementById('payment_method').value;

    fetch(`http://localhost:3000/api/payments`, {

        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            booking_id: bookingId, payment_method
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Payment successful:', data);
    })
    .catch(error => {
        console.error('Error:', error);

    window.location.href = 'dashboard.html';    
    });
}