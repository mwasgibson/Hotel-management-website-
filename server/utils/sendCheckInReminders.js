const db = require('../config/db');
const sendEmail = require('./sendEmail');

function sendCheckInReminders() {
    const sql = `
        SELECT bookings.id, bookings.check_in, bookings.room_number, users.email, users.fullname
        FROM bookings
        JOIN users ON bookings.user_id = users.id
        WHERE bookings.booking_status = 'confirmed'
        AND DATE(bookings.check_in) = CURDATE() + INTERVAL 1 DAY
        AND bookings.reminder_sent = 0
    `;

    db.query(sql, (err, bookings) => {
        if (err) {
            console.error('Error checking for check-in reminders:', err);
            return;
        }
        if (bookings.length === 0) return;
        bookings.forEach(booking => {
            sendEmail({
                to: booking.email,
                subject: 'Your stay is tomorrow!',
                html: `<p>Hi ${booking.fullname},</p><p>Just a reminder — your check-in for Room ${booking.room_number} is tomorrow, ${new Date(booking.check_in).toDateString()}. We look forward to hosting you!</p>`
            });
            db.query('UPDATE bookings SET reminder_sent = 1 WHERE id = ?', [booking.id], (err) => {
                if (err) console.error(`Error marking reminder sent for booking ${booking.id}:`, err);
            });
        });
        console.log(`Sent ${bookings.length} check-in reminder(s).`);
    });
}

module.exports = sendCheckInReminders;