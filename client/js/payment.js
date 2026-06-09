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
    let extraData = {};

    if (payment_method === 'card') {
        extraData.card_number = {
            card_number: document.getElementById('card_number').value,
            expiry_date: document.getElementById('expiry_date').value,
            cvv: document.getElementById('cvv').value
        };
    } else if (payment_method === 'mpesa') {
        extraData.phone = {
            phone: document.getElementById('phone').value
        };
    } else if (payment_method === 'paypal') {
        extraData.paypal_email = {
            paypal_email: document.getElementById('paypal_email').value
        };
    }

    fetch(`http://localhost:3000/api/payments`, {

        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            booking_id: bookingId, payment_method, ...extraData
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

function showPaymentFields() {

    const method = document.getElementById('payment_method').value;
    const fields = document.getElementById('paymentFields');

    if (method === 'card') {
        fields.innerHTML = `
            <input type="text" id="card_number" placeholder="Card Number" required>
            <input type="text" id="expiry_date" placeholder="MM/YY" required>
            <input type="text" id="cvv" placeholder="CVV" required>
        `;
    } else if (method === 'mpesa') {
        fields.innerHTML = `
            <input type="text" id="phone" placeholder="Phone Number" required>
        `;
    } else if (method === 'paypal') {
        fields.innerHTML = `
            <p>You will be redirected to PayPal checkout</p>
        `;
    } else {
        fields.innerHTML = `
            <p>Payment will be recorded as cash</p>
            `;
    }
}
showPaymentFields();