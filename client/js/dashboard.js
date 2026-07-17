function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}


loadBookings();

function loadBookings() {
    fetch(`${API_URL}/bookings`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        const bookingDiv = document.getElementById('booking-list');
        bookingDiv.innerHTML = '';
        document.getElementById('totalBookings').innerHTML = `Total Bookings: ${data.length}`;
        document.getElementById('confirmedBookings').innerHTML = `Confirmed Bookings: ${(Array.isArray(data) ? data : []).filter(booking => booking.booking_status === 'confirmed').length}`;
        document.getElementById('pendingBookings').innerHTML = `Pending Bookings: ${(Array.isArray(data) ? data : []).filter(booking => booking.booking_status === 'pending').length}`;
        (Array.isArray(data) ? data : (data.bookings || [])).forEach(booking => {
            bookingDiv.innerHTML += `
                <div>
                    <h3> Booking #${booking.id}</h3>
                    <p> Room: <span class="${escapeHtml(booking.status)}">${escapeHtml(booking.room_number)}</span></p>
                    <p> Type: <span class="${escapeHtml(booking.room_type)}">${escapeHtml(booking.room_type)}</span></p>
                    <p> Check-in: <span class="${escapeHtml(booking.check_in)}">${escapeHtml(booking.check_in)}</span></p>
                    <p> Check-out: <span class="${escapeHtml(booking.check_out)}">${escapeHtml(booking.check_out)}</span></p>
                    <p> Status: <span class="${escapeHtml(booking.booking_status)}">${escapeHtml(booking.booking_number)}</span></p>
                    <p> Total Price: <span class="${escapeHtml(booking.total_amount)}">KES${escapeHtml(booking.total_amount.toFixed(2))}</span></p>

                    ${booking.booking_status === 'pending' ? `<button onclick="goToPayment(${booking.id})">Pay</button>` : ''}
                    <button onclick="cancelBooking(${booking.id})">Cancel</button>
                    ${booking.booking_status === 'pending' ? `<button onclick="rescheduleBooking(${booking.id})">Reschedule</button>` : ''}

                    <hr>
                </div>`
                ;
        });
    })
};

function rescheduleBooking(id) {
    const check_in = prompt('New check-in date (YYYY-MM-DD):');
    if (!check_in) return;
    const check_out = prompt('New check-out date (YYYY-MM-DD):');
    if (!check_out) return;

    fetch(`${API_URL}/bookings/${id}/reschedule`, {
        credentials: 'include',
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ check_in, check_out })
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) {
            alert(data.error || 'Reschedule failed');
            return;
        }
        alert('Booking rescheduled successfully');
        loadBookings();
    })
    .catch(error => console.error('Error rescheduling booking:', error));
}

function cancelBooking(id) {

    fetch(`${API_URL}/bookings/${id}/cancel`, {
        credentials: 'include',
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        loadBookings();
    })
    .catch(error => {
        console.error('Error:', error);
    });
};

loadProfile();

function loadProfile(){

    fetch(`${API_URL}/auth/profile`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(user => {
        
        document.getElementById('profile').innerHTML = `
            <p><strong>Full Name:</strong> ${user.fullname}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Role:</strong> ${user.role}</p>
        `;
    })
    .catch(error => {
        console.error('Error:', error);
    });
};

loadPayments();

function loadPayments() {

    fetch(`${API_URL}/payments`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        const payments = document.getElementById('payments');
        payments.innerHTML = '';
        (Array.isArray(data) ? data : data.payments || []).forEach(payment => {
            payments.innerHTML += `
                <div>
                    <h3> Payment #${escapeHtml(payment.id)}</h3>
                    <p> Booking ID: ${escapeHtml(payment.booking_id)}</p>
                    <p> Amount: KES${escapeHtml(payment.amount.toFixed(2))}</p>
                    <p> Method: ${escapeHtml(payment.payment_method)}</p>
                    <p> Status: ${escapeHtml(payment.payment_status)}</p>
                    <p> Date: ${escapeHtml(payment.date)}</p>
                    <hr>
                </div>
            `;
        });
    })
    .catch(error => {
        console.error('Error:', error);
    });
};

function goToPayment(id) {
    window.location.href = `payment.html?booking_id=${id}`;
};
