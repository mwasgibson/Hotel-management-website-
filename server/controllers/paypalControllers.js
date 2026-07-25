const paypal = require('@paypal/checkout-server-sdk');
const db = require('../config/db');
const sendEmail = require('../utils/sendEmail');

function environment() {
    return new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
}
const client = new paypal.core.PayPalHttpClient(environment());

const USD_TO_KES_RATE = Number(process.env.USD_TO_KES_RATE || 130);   // approximate — swap for a live FX API before this ever handles real money

exports.createOrder = async (req, res) => {
    const { booking_id } = req.body;
    if (!booking_id) return res.status(400).json({ error: 'booking_id is required' });

    db.query('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [booking_id, req.user.id], async (err, bookings) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });

        const booking = bookings[0];
        const usdAmount = (booking.total_amount / USD_TO_KES_RATE).toFixed(2);

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                reference_id: booking_id.toString(),
                amount: { currency_code: 'USD', value: usdAmount }
            }]
        });

        try {
            const order = await client.execute(request);
            res.json(order.result);
        } catch (err) {
            console.error('Error creating PayPal order:', err);
            res.status(500).json({ error: err.message });
        }
    });
};

exports.captureOrder = async (req, res) => {
    const { orderID, booking_id } = req.body;

    try {
        const request = new paypal.orders.OrdersCaptureRequest(orderID);
        request.requestBody({});
        const capture = await client.execute(request);

        if (capture.result.status !== 'COMPLETED') {
            return res.status(400).json({ error: 'Payment was not completed' });
        }

        db.query('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [booking_id, req.user.id], (err, bookings) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });

            const booking = bookings[0];

            db.query('SELECT * FROM payments WHERE booking_id = ? AND payment_status = "paid"', [booking_id], (err, existing) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                if (existing.length > 0) {
                    return res.json(capture.result);   // already recorded — avoid a duplicate row
                }

                db.query('INSERT INTO payments (booking_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?)',
                    [booking_id, booking.total_amount, 'paypal', 'paid'], (err) => {
                        if (err) console.error('Error recording paypal payment:', err);
                    });

                db.query('UPDATE bookings SET booking_status = "confirmed" WHERE id = ?', [booking_id], (err) => {
                    if (err) console.error('Error updating booking status:', err);
                });

                sendEmail({
                    to: req.user.email,
                    subject: 'Payment Received',
                    html: `<p>We've received your PayPal payment of KES ${booking.total_amount}. Your reservation is now confirmed.</p>`
                });

                res.json(capture.result);
            });
        });
    } catch (error) {
        console.error('Error capturing PayPal order:', error);
        res.status(500).json({ error: error.message });
    }
};