const db = require('../config/db');

const EXPIRY_MINUTES = 30;

function expireStaleReservations() {
    const findSql = `SELECT id, room_number FROM bookings WHERE booking_status = 'pending' AND created_at < (NOW() - INTERVAL ? MINUTE)`;

    db.query(findSql, [EXPIRY_MINUTES], (err, staleBookings) => {
        if (err) {
            console.error('Error checking for expired reservations:', err);
            return;
        }
        if (staleBookings.length === 0) return;

        staleBookings.forEach(booking => {
            db.query("UPDATE bookings SET booking_status = 'cancelled' WHERE room_number = ?", [booking.room_number], (err) => {
                if (err) console.error(`Error expiring booking ${booking.room_number}:`, err);
            });
            // only release the room if it's still 'reserved' — don't touch it if it's since become occupied some other way
            db.query("UPDATE rooms SET status = 'available' WHERE room_number = ? AND status = 'reserved'", [booking.room_number], (err) => {
                if (err) console.error(`Error releasing room for booking ${booking.room_number}:`, err);
            });
        });

        console.log(`Expired ${staleBookings.length} unpaid reservation(s).`);
    });
}

module.exports = expireStaleReservations;