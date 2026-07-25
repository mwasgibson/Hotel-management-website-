const axios = require('axios');
const db = require('../config/db');
const sendEmail = require('../utils/sendEmail');

function buildAuthHeader() {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    return Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
}

async function fetchAccessToken() {
    const auth = buildAuthHeader();
    const response = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        { headers: { 'Authorization': `Basic ${auth}` } }
    );
    return response.data.access_token;
}

function normalizePhoneNumber(phone) {
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.slice(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
        cleaned = '254' + cleaned;
    }
    return cleaned;
}

exports.getAccessToken = async (req, res) => {
    try {
        const token = await fetchAccessToken();
        res.json({ access_token: token });
    } catch (error) {
        console.error('Error fetching access token:', error);
        res.status(500).json({ error: 'Failed to fetch access token' });
    }
};

exports.stkPush = async (req, res) => {
    const { booking_id, phoneNumber } = req.body;

    if (!booking_id || !phoneNumber) {
        return res.status(400).json({ error: 'booking_id and phoneNumber are required' });
    }

    // Look the price up server-side — never trust a client-supplied amount for a real charge
    db.query('SELECT * FROM bookings WHERE id = ?', [booking_id, req.id], (err, bookings) => {
        if(
            req.user.role !== "admin" &&
            req.user.role !== "receptionist"
        ){
            return res.status(403).json({ error:"Unauthorized" });
        }
        if (err) return res.status(500).json({ error: 'Database error' });
        if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });

        const booking = bookings[0];

        db.query('SELECT * FROM payments WHERE booking_id = ? AND payment_status = "paid"', [booking_id], async (err, existing) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (existing.length > 0) {
                return res.status(400).json({ error: 'This booking has already been paid' });
            }

            try {
                const token = await fetchAccessToken();
                const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
                const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');
                const normalizedPhone = normalizePhoneNumber(phoneNumber);

                const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
                    "BusinessShortCode": process.env.MPESA_SHORTCODE,
                    "Password": password,
                    "Timestamp": timestamp,
                    "TransactionType": "CustomerPayBillOnline",
                    "Amount": Math.round(booking.total_amount),
                    "PartyA": normalizedPhone,
                    "PartyB": process.env.MPESA_SHORTCODE,
                    "PhoneNumber": normalizedPhone,
                    "CallBackURL": process.env.MPESA_CALLBACK_URL,
                    "AccountReference": `Booking-${booking_id}`,
                    "TransactionDesc": `Payment for booking ${booking_id}`
                }, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });

                if (response.data.ResponseCode !== '0') {
                    return res.status(400).json({ error: 'Failed to initiate M-Pesa payment' });
                }

                // Record as pending — the callback below is what actually confirms it
                const insertSql = 'INSERT INTO payments (booking_id, amount, payment_method, payment_status, checkout_request_id) VALUES (?, ?, ?, ?, ?)';
                db.query(insertSql, [booking_id, booking.total_amount, 'mpesa', 'pending', response.data.CheckoutRequestID], (err) => {
                    if (err) console.error('Error recording pending mpesa payment:', err);
                });

                res.json({ message: 'STK push sent. Please complete payment on your phone.', checkoutRequestId: response.data.CheckoutRequestID });
            } catch (error) {
                console.error('Error performing STK push:', error.response?.data || error.message);
                res.status(500).json({ error: 'Failed to perform STK push' });
            }
        });
    });
};

exports.callback = (req, res) => {
    const callbackData = req.body?.Body?.stkCallback;

    if (!callbackData) {
        console.error('Unexpected M-Pesa callback shape:', JSON.stringify(req.body));
        return res.json({ message: 'Callback received' });   // always 200 back to Safaricom, regardless
    }

    const { CheckoutRequestID, ResultCode } = callbackData;

    db.query('SELECT * FROM payments WHERE checkout_request_id = ?', [CheckoutRequestID], (err, payments) => {
        if (err || payments.length === 0) {
            console.error('Could not find payment for CheckoutRequestID:', CheckoutRequestID);
            return res.json({ message: 'Callback received' });
        }

        const payment = payments[0];

        if (ResultCode === 0) {
            db.query('UPDATE payments SET payment_status = "paid" WHERE id = ?', [payment.id], (err) => {
                if (err) console.error('Error updating payment status:', err);
            });
            db.query('UPDATE bookings SET booking_status = "confirmed" WHERE id = ?', [payment.booking_id], (err) => {
                if (err) console.error('Error updating booking status:', err);
            });
            db.query('SELECT users.email FROM bookings JOIN users ON bookings.user_id = users.id WHERE bookings.id = ?', [payment.booking_id], (err, rows) => {
                if (!err && rows.length > 0) {
                    sendEmail({
                        to: rows[0].email,
                        subject: 'Payment Received',
                        html: `<p>We've received your M-Pesa payment of KES ${payment.amount}. Your reservation is now confirmed.</p>`
                    });
                }
            });
        } else {
            db.query('UPDATE payments SET payment_status = "Failed" WHERE id = ?', [payment.id], (err) => {
                if (err) console.error('Error updating payment status:', err);
            });
        }

        res.json({ message: 'Callback received' });
    });
};