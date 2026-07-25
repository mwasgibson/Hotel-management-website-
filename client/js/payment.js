function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

const params = new URLSearchParams(window.location.search);
const bookingId = params.get('booking_id');

let bookingAmount = 0;

if (bookingId) {
    fetch(`${API_URL}/bookings/${bookingId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            bookingAmount = data.total_amount;
            document.getElementById('bookingId').innerHTML = `
                <p>Booking ID: ${escapeHtml(data.id)}</p>
                <p>Room: ${escapeHtml(data.room_number)}</p>
                <p>Check-in: ${escapeHtml(data.check_in)}</p>
                <p>Check-out: ${escapeHtml(data.check_out)}</p>
                <p>Total Price: KES ${escapeHtml(Number(data.total_amount).toFixed(2))}</p>
            `;
            fetch(`${API_URL}/services/booking/${bookingId}`, { credentials: 'include' })
                .then(res => res.json())
                .then(bookingServices => {
                    if (bookingServices.length === 0) return;
                    const list = bookingServices.map(s => `<li>${escapeHtml(s.name)} x${escapeHtml(s.quantity)} — KES ${escapeHtml(Number(s.price_at_booking * s.quantity).toFixed(2))}</li>`).join('');
                    document.getElementById('bookingId').innerHTML += `<p>Services:</p><ul>${list}</ul>`;
                })
                .catch(error => console.error('Error loading booking services:', error));
        })
        .catch(error => console.error('Error:', error));
}

function payBooking() {
    const payment_method = document.getElementById('payment_method').value;

    if (payment_method === 'paypal') return;   // handled entirely by the PayPal button below

    if (payment_method === 'cash') {
        fetch(`${API_URL}/payments`, {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: bookingId })
        })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                showToast(data.error || 'Failed to record payment', 'error');
                return;
            }
            showToast('Recorded — please pay at reception to confirm your booking.', 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 1800);
        })
        .catch(error => console.error('Error:', error));
        return;
    }

    if (payment_method === 'mpesa') {
        const phone = document.getElementById('phone').value;
        if (!phone) {
            showToast('Please enter a phone number', 'error');
            return;
        }

        const payButton = document.getElementById('payButton');
        if (payButton) { payButton.disabled = true; payButton.textContent = 'Sending prompt...'; }

        fetch(`${API_URL}/mpesa/stkpush`, {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: bookingId, phoneNumber: phone })
        })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                showToast(data.error || 'Failed to send M-Pesa prompt', 'error');
                if (payButton) { payButton.disabled = false; payButton.textContent = 'Pay'; }
                return;
            }
            showToast('Check your phone to complete the M-Pesa payment.', 'info');
            if (payButton) payButton.textContent = 'Waiting for confirmation...';
            pollPaymentStatus();
        })
        .catch(error => {
            console.error('Error performing STK push:', error);
            showToast('Unable to connect to the server.', 'error');
            if (payButton) { payButton.disabled = false; payButton.textContent = 'Pay'; }
        });
    }
}

function pollPaymentStatus() {
    let attempts = 0;
    const maxAttempts = 40;   // ~2 minutes at 3s intervals

    const interval = setInterval(() => {
        attempts++;

        fetch(`${API_URL}/payments/status/${bookingId}`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'paid') {
                    clearInterval(interval);
                    showToast('Payment confirmed!', 'success');
                    setTimeout(() => window.location.href = 'dashboard.html', 1500);
                } else if (data.status === 'Failed') {
                    clearInterval(interval);
                    showToast('Payment failed or was cancelled. Please try again.', 'error');
                    const payButton = document.getElementById('payButton');
                    if (payButton) { payButton.disabled = false; payButton.textContent = 'Pay'; }
                }
            })
            .catch(error => console.error('Error checking payment status:', error));

        if (attempts >= maxAttempts) {
            clearInterval(interval);
            showToast("Still waiting on confirmation — check your dashboard shortly.", 'info');
        }
    }, 3000);
}

function showPaymentFields() {
    const fields = document.getElementById('paymentFields');
    document.getElementById('paypal_button_container').style.display = "none";

    const method = document.getElementById('payment_method').value;
    if (method === 'paypal') {
        document.getElementById('paypal_button_container').style.display = "block";
        fields.innerHTML = `<p>You will be redirected to PayPal checkout</p>`;
    } else if (method === 'mpesa') {
        fields.innerHTML = `<input type="text" id="phone" placeholder="Phone Number (e.g. 0712345678)" required>`;
    } else {
        fields.innerHTML = `<p>You'll pay in cash at reception. Your booking stays pending until front-desk staff confirm your payment.</p>`;
    }
}
showPaymentFields();

paypal.Buttons({
    createOrder() {
        return fetch(`${API_URL}/paypal/create-order`, {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: bookingId })
        })
        .then(res => res.json())
        .then(order => order.id);
    },
    onApprove(data) {
        return fetch(`${API_URL}/paypal/capture-order`, {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID, booking_id: bookingId })
        })
        .then(res => res.json().then(resData => ({ ok: res.ok, resData })))
        .then(({ ok, resData }) => {
            if (!ok) {
                showToast(resData.error || 'Payment could not be completed', 'error');
                return;
            }
            showToast("Payment successful!", 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 1500);
        });
    }
}).render("#paypal_button_container");