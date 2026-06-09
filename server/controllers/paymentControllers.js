const db = require('../config/db');

exports.payBookings = (req, res) => {

    const {booking_id} = req.body;

    const sql = 'SELECT * FROM bookings WHERE id = ?';

    db.query(sql, [booking_id], (err, bookings) => {
        if (err) {
            console.error('Error fetching booking:', err);
            return res.status(500).json({ error: 'Failed to fetch booking' });
        }
        res.status(201).json({ message: 'Payment created successfully', paymentId: result.insertId });
    });

    if (bookings.length === 0) {
        return res.status(404).json({error: 'No bookings found for the user'});
    }

    const booking = bookings[0];

    const sql = 'INSERT INTO payments (booking_id, amount, payment_method, payment_status) VALUES (?,?,?,?)';

    

}