const db = require('../config/db');
const sendEmail = require('../utils/sendEmail');

// Cash: recorded as pending — only staff confirming it at reception flips it to Paid
exports.payBookings = (req, res) => {
    const { booking_id } = req.body;

    db.query('SELECT bookings.* FROM bookings WHERE bookings.id = ? AND bookings.user_id = ?', [booking_id, req.user.id], (err, bookings) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (bookings.length === 0) return res.status(404).json({ error: 'No bookings found for the user' });

        const booking = bookings[0];

        db.query('SELECT * FROM payments WHERE booking_id = ?', [booking_id], (err, payments) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (payments.length > 0) {
                return res.status(400).json({ error: 'A payment record already exists for this booking' });
            }

            db.query('INSERT INTO payments (booking_id, amount, payment_method, payment_status) VALUES (?,?,?,?)',
                [booking_id, booking.total_amount, 'cash', 'pending'], (err, result) => {
                    if (err) return res.status(500).json({ error: 'Failed to create payment' });
                    res.status(201).json({ message: 'Recorded — please pay at reception to confirm your booking.', paymentId: result.insertId });
                });
        });
    });
};

// Staff-only: mark a pending cash payment as actually received
exports.confirmCashPayment = (req, res) => {
    const { id } = req.params;

    db.query('SELECT * FROM payments WHERE id = ?', [id], (err, payments) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (payments.length === 0) return res.status(404).json({ error: 'Payment not found' });

        const payment = payments[0];
        if (payment.payment_method !== 'cash') {
            return res.status(400).json({ error: 'Only cash payments can be confirmed this way' });
        }
        if (payment.payment_status === 'Paid') {
            return res.status(400).json({ error: 'This payment is already confirmed' });
        }

        db.query('UPDATE payments SET payment_status = "Paid" WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            db.query('UPDATE bookings SET booking_status = "confirmed" WHERE id = ?', [payment.booking_id], (err) => {
                if (err) return res.status(500).json({ error: 'Database error' });

                db.query('SELECT users.email FROM bookings JOIN users ON bookings.user_id = users.id WHERE bookings.id = ?', [payment.booking_id], (err, rows) => {
                    if (!err && rows.length > 0) {
                        sendEmail({
                            to: rows[0].email,
                            subject: 'Payment Received',
                            html: `<p>Your cash payment of KES ${payment.amount} has been confirmed at reception. Your reservation is now confirmed.</p>`
                        });
                    }
                });

                res.json({ message: 'Cash payment confirmed' });
            });
        });
    });
};

// Used by the frontend to poll for M-Pesa confirmation
exports.getPaymentStatus = (req, res) => {
    const { booking_id } = req.params;

    db.query(
        'SELECT payments.*, bookings.user_id FROM payments JOIN bookings ON payments.booking_id = bookings.id WHERE payments.booking_id = ? ORDER BY payments.id DESC LIMIT 1',
        [booking_id],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (results.length === 0) return res.status(404).json({ error: 'No payment found for this booking' });
            if (results[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

            res.json({ status: results[0].payment_status, method: results[0].payment_method });
        }
    );
};

exports.getAllPendingCashPayments = (req, res) => {
    const sql = `
        SELECT payments.*, bookings.check_in, bookings.check_out, users.fullname, users.email
        FROM payments
        JOIN bookings ON payments.booking_id = bookings.id
        JOIN users ON bookings.user_id = users.id
        WHERE payments.payment_method = 'cash' AND payments.payment_status = 'pending'
        ORDER BY payments.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
};

exports.getPayments = (req, res) => {
    const sql = 'SELECT payments.*, bookings.user_id FROM payments JOIN bookings ON payments.booking_id = bookings.id WHERE bookings.user_id = ?';
    db.query(sql, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch payments' });
        res.status(200).json({ payments: results });
    });
};