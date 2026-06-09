const { response } = require("express");

const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'login.html';
}

loadBookings();

function loadBookings() {
    fetch('http://localhost:3000/api/bookings', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const bookingDiv = document.getElementById('booking-list');
        bookingDiv.innerHTML = '';
        data.forEach(booking => {
            bookingDiv.innerHTML += `
                <div>
                    <h3> Booking #${booking.id}</h3>
                    <p> Room: ${booking.room_number}</p>
                    <p> Type: ${booking.room_type}</p>
                    <p> Check-in: ${booking.check_in}</p>
                    <p> Check-out: ${booking.check_out}</p>
                    <p> Status: ${booking.booking_status}</p>

                    <button onclick="cancelBooking(${booking.id})">Cancel</button>

                    <hr>
                </div>`
                ;
        });
    })
};

function cancelBooking(id) {

    fetch(`http://localhost:3000/api/bookings/cancel/${id}`, {
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

    fetch('http://localhost:3000/api/profile', {
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

    fetch('http://localhost:3000/api/payments', {
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
                    <p> Amount: $${payment.amount.toFixed(2)}</p>
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
