function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

if (!token) {
    window.location.href = 'login.html';
}

loadBookings();

function loadBookings() {
    fetch(`${API_URL}/bookings`, {
        credentials: 'include',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const bookingDiv = document.getElementById('booking-list');
        bookingDiv.innerHTML = '';
        document.getElementById('totalBookings').innerHTML = `Total Bookings: ${data.length}`;
        document.getElementById('confirmedBookings').innerHTML = `Confirmed Bookings: ${data.filter(booking => booking.booking_status === 'confirmed').length}`;
        document.getElementById('pendingBookings').innerHTML = `Pending Bookings: ${data.filter(booking => booking.booking_status === 'pending').length}`;
        data.forEach(booking => {
            bookingDiv.innerHTML += `
                <div>
                    <h3> Booking #${booking.id}</h3>
                    <p> Room: <span class="${escapeHtml(booking.room_status)}">${escapeHtml(booking.room_number)}</span></p>
                    <p> Type: <span class="${escapeHtml(booking.room_type)}">${escapeHtml(booking.room_type)}</span></p>
                    <p> Check-in: <span class="${escapeHtml(booking.check_in)}">${escapeHtml(booking.check_in)}</span></p>
                    <p> Check-out: <span class="${escapeHtml(booking.check_out)}">${escapeHtml(booking.check_out)}</span></p>
                    <p> Status: <span class="${escapeHtml(booking.booking_status)}">${escapeHtml(booking.booking_number)}</span></p>
                    <p> Total Price: <span class="${escapeHtml(booking.total_amount)}">KES${escapeHtml(booking.total_amount.toFixed(2))}</span></p>

                    ${booking.booking_status === 'pending' ? `<button onclick="goToPayment(${booking.id})">Pay</button>` : ''}
                    <button onclick="cancelBooking(${booking.id})">Cancel</button>

                    <hr>
                </div>`
                ;
        });
    })
};

function cancelBooking(id) {

    fetch(`${API_URL}/bookings/${id}`, {
        credentials: 'include',
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
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

function Logout() {

    res.clearCookie('token'),
    window.location.href = 'login.html';
};

loadProfile();

function loadProfile(){

    fetch(`${API_URL}/auth/profile`, {
        credentials: 'include',
        headers: {
            'Authorization': `Bearer ${token}`
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
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const payments = document.getElementById('payments');
        payments.innerHTML = '';
        data.forEach(payment => {
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