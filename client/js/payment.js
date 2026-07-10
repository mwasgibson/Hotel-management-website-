const token = localStorage.getItem('token');
const params = new URLSearchParams(window.location.search);
const bookingId = params.get('booking'); 
let bookingAmount = 0;   

    fetch(`${"https://bookish-yodel-97gx7r7xqgxjcxrx4-3000.app.github.dev/api"}/api/bookings/${bookingId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        bookingAmount = data.total_amount;
        document.getElementById('bookingInfo').innerHTML = `
            <p>Booking ID: ${data.id}</p>
            <p>Room: ${data.room_number}</p>
            <p>Check-in: ${data.check_in}</p>
            <p>Check-out: ${data.check_out}</p>
            <p>Total Price: KES${data.total_amount.toFixed(2)}</p>
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

        fetch(`${"https://bookish-yodel-97gx7r7xqgxjcxrx4-3000.app.github.dev/api"}/api/mpesa/stkpush`, {

            method: "POST",
            headers: {
                "Content-Type": "application/json"
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
        extraData.phone = {
            phone: document.getElementById('phone').value
        };
    } else if (payment_method === 'paypal') {
        extraData.paypal_email = {
            paypal_email: document.getElementById('paypal_email').value
        };
    }

    fetch(`${"https://bookish-yodel-97gx7r7xqgxjcxrx4-3000.app.github.dev/api"}/api/payments/payments`, {

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
    .then(error => {
        console.error('Error:', error);

    window.location.href = 'dashboard.html';    
    });
}

function showPaymentFields() {

    const method = document.getElementById('payment_method').value;
    const fields = document.getElementById('paymentFields');
    document.getElementById('mpesa_button_container').style.display = "none"; 

    if (method === 'mpesa') {
        document.getElementById('mpesa_button_container').style.display = "block";
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

paypal.Buttons({

    createOrder() {
        
        return fetch(`${"https://bookish-yodel-97gx7r7xqgxjcxrx4-3000.app.github.dev/api"}/api/paypal/paypal/create-order`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
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

        return fetch(`${"https://bookish-yodel-97gx7r7xqgxjcxrx4-3000.app.github.dev/api"}/api/paypal/paypal/capture-order`, {

            method: "POST",
            headers: {
                "Content-Type": "application/json"
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
}).render("#paypal-button-container");