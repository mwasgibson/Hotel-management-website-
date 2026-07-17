function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

const params = new URLSearchParams(window.location.search);
const bookingId = params.get('booking_id'); 

let bookingAmount = 0;   

    fetch(`${API_URL}/bookings/${bookingId}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        bookingAmount = data.total_amount;
        document.getElementById('bookingId').innerHTML = `
            <p>Booking ID: ${escapeHtml(data.id)}</p>
            <p>Room: ${escapeHtml(data.room_number)}</p>
            <p>Check-in: ${escapeHtml(data.check_in)}</p>
            <p>Check-out: ${escapeHtml(data.check_out)}</p>
            <p>Total Price: KES${escapeHtml(data.total_amount.toFixed(2))}</p>
        `;
    })
    .catch(error => {
        console.error('Error:', error);
    });

function payBooking() {

    const payment_method = document.getElementById('payment_method').value;
    let extraData = {};

    if(payment_method === 'mpesa') {

        const phone = document.getElementById('phone').value;
        const amount = document.getElementById('amount').value;

        fetch(`${API_URL}/mpesa/stkpush`, {
            credentials: 'include',

            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber: phone,
                amount: amount
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log("STK Push Response:", data);
        })
        .catch(error => {
            console.error("Error performing STK push:", error);
        });
    }

    if (payment_method === 'mpesa') {
        extraData.phone = document.getElementById('phone').value;
    } else if (payment_method === 'paypal') {
        extraData.paypal_email = document.getElementById('paypal_email').value;
    }

    fetch(`${API_URL}/payments`, {
        credentials: 'include',

        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            booking_id: bookingId, payment_method, ...extraData
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Payment successful:', data);
        window.location.href = 'dashboard.html';
    })
    .catch(error => {
        console.error('Error:', error);       
    });
}

function showPaymentFields() {

    const fields = document.getElementById('paymentFields');
    document.getElementById('paypal_button_container').style.display = "none"; 

    const method = document.getElementById('payment_method').value;
    if (method === 'paypal') {
        document.getElementById('paypal_button_container').style.display = "block";
        fields.innerHTML = `
            <p>You will be redirected to PayPal checkout</p>
        `;
    } else if (method === 'mpesa') {
        fields.innerHTML = `
            <input type="text" id="phone" placeholder="Phone Number" required>
        `;
    } else {
        fields.innerHTML = `
            <p>Payment will be recorded as cash</p>
            `;
    }
}
showPaymentFields();

paypal.Buttons({

    createOrder() {
        
        return fetch(`${API_URL}/paypal/create-order`, {
            credentials: 'include',
            
            method: 'POST',
            headers: {
                'Content-Typ': 'application/json'
            },

            body: JSON.stringify({
                booking_id: bookingId,
                amount: bookingAmount
            })
        })
        .then(res => res.json())
        .then(order => order.id);
    },
    onApprove(data){

        return fetch(`${API_URL}/paypal/capture-order`, {
            credentials: 'include',

            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                orderID: data.orderID 
            })
        })
        .then(res=>res.json())
        .then(details=>{
            alert("Payment Successful");
        });
    }   
}).render("#paypal_button_container");
