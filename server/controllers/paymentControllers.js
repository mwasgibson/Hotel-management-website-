const db = require('../config/db');

exports.payBookings = (req, res) => {
    const { booking_id, payment_method } = req.body;
    const sql = 'SELECT bookings.* FROM bookings WHERE bookings.id = ? and bookings.user_id = ?';

    db.query(sql, [booking_id, req.user.id], (err, bookings) => {
        if (err) {
            console.error('Error fetching booking:', err);
            return res.status(500).json({ error: 'Failed to fetch booking' });
        }
        if (bookings.length === 0) {
            return res.status(404).json({ error: 'No bookings found for the user' });
        }

        const booking = bookings[0];
        const checkPaymentSql = 'SELECT * FROM payments WHERE booking_id = ?';

        db.query(checkPaymentSql, [booking_id], (err, payments) => {
            if (err) {
                console.error('Error checking existing payment:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            if (payments.length > 0) {
                return res.status(400).json({ error: 'Payment already exists for this booking' });
            }

            const paymentSql = 'INSERT INTO payments (booking_id, amount, payment_method, payment_status) VALUES (?,?,?,?)';
            db.query(paymentSql, [booking_id, booking.total_amount, payment_method, 'Paid'], (err, result) => {
                if (err) {
                    console.error('Error creating payment:', err);
                    return res.status(500).json({ error: 'Failed to create payment' });
                }

                db.query('UPDATE bookings SET booking_status = "confirmed" WHERE id = ?', [booking_id], (err) => {
                    if (err) {
                        console.error('Error updating booking status:', err);
                        return res.status(500).json({ error: 'Failed to update booking status' });
                    }
                    res.status(201).json({ message: 'Payment created successfully', paymentId: result.insertId });
                });
            });
        });
    });
};

exports.getPayments = (req, res) => {

    const sql = 'SELECT payments.*, bookings.user_id FROM payments JOIN bookings ON payments.booking_id = bookings.id WHERE bookings.user_id = ?';

    db.query(sql, [req.user.id], (err, results) => {

        if (err) {
            console.error('Error fetching payments:', err);
            return res.status(500).json({ error: 'Failed to fetch payments' });
        }

        res.status(200).json({ payments: results });
    });
};