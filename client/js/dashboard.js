const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'login.html';
}

loadBookings();

function loadBookings() {
    fetch(`${"https://bookish-yodel-97gx7r7xqgxjcxrx4-3000.app.github.dev/api"}/bookings`, {
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
                    <p> Room: <span class="${booking.room_status}">${booking.room_number}</span></p>
                    <p> Type: <span class="${booking.room_type}">${booking.room_type}</span></p>
                    <p> Check-in: <span class="${booking.check_in}">${booking.check_in}</span></p>
                    <p> Check-out: <span class="${booking.check_out}">${booking.check_out}</span></p>
                    <p> Status: <span class="${booking.booking_status}">${booking.booking_number}</span></p>
                    <p> Total Price: <span class="${booking.total_price}">KES${booking.total_price.toFixed(2)}</span></p>

                    ${booking.booking_status === 'pending' ? `<button onclick="goToPayment(${booking.id})">Pay</button>` : ''}
                    <button onclick="cancelBooking(${booking.id})">Cancel</button>

                    <hr>
                </div>`
                ;
        });
    })
};

function cancelBooking(id) {

    fetch(`${"https://bookish-yodel-97gx7r7xqgxjcxrx4-3000.app.github.dev/api"}/cancel/${id}`, {
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

    localStorage.removeItem('token');
    window.location.href = 'login.html';
};

loadProfile();

function loadProfile(){

    fetch(`${"https://bookish-yodel-97gx7r7xqgxjcxrx4-3000.app.github.dev/api"}/profile`, {
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

    fetch(`${"https://bookish-yodel-97gx7r7xqgxjcxrx4-3000.app.github.dev/api"}/payments`, {
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
                    <h3> Payment #${payment.id}</h3>
                    <p> Booking ID: ${payment.booking_id}</p>
                    <p> Amount: KES${payment.amount.toFixed(2)}</p>
                    <p> Method: ${payment.payment_method}</p>
                    <p> Status: ${payment.payment_status}</p>
                    <p> Date: ${payment.date}</p>
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