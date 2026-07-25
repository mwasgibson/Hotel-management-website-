const db = require('../config/db');
const sendEmail = require('../utils/sendEmail');

function hasTimeOverlap(existing, requestedStart, requestedEnd) {
    return existing.some(row => requestedStart < row.end_time && requestedEnd > row.start_time);
}

exports.requestEventBooking = (req, res) => {
    const user_id = req.user.id;
    const { event_space_id, event_date, start_time, end_time, purpose, expected_attendees } = req.body;

    if (!event_space_id || !event_date || !start_time || !end_time) {
        return res.status(400).json({ error: 'event_space_id, event_date, start_time, and end_time are required' });
    }
    if (end_time <= start_time) {
        return res.status(400).json({ error: 'end_time must be after start_time' });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (event_date < today) {
        return res.status(400).json({ error: 'event_date cannot be in the past' });
    }

    db.query('SELECT * FROM event_spaces WHERE id = ? AND active = 1', [event_space_id], (err, spaces) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (spaces.length === 0) return res.status(404).json({ error: 'Event space not found' });

        if (expected_attendees && expected_attendees > spaces[0].capacity) {
            return res.status(400).json({ error: `This space holds up to ${spaces[0].capacity} guests` });
        }

        const conflictSql = `SELECT start_time, end_time FROM event_bookings WHERE event_space_id = ? AND event_date = ? AND status IN ('requested', 'quoted', 'confirmed')`;
        db.query(conflictSql, [event_space_id, event_date], (err, existing) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (hasTimeOverlap(existing, start_time, end_time)) {
                return res.status(400).json({ error: 'This space is already booked or pending for an overlapping time' });
            }

            const sql = 'INSERT INTO event_bookings (event_space_id, user_id, event_date, start_time, end_time, purpose, expected_attendees) VALUES (?, ?, ?, ?, ?, ?, ?)';
            db.query(sql, [event_space_id, user_id, event_date, start_time, end_time, purpose || null, expected_attendees || null], (err, result) => {
                if (err) {
                    console.error('Error creating event request:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.status(201).json({ message: 'Request submitted — our team will send you a quote shortly.', id: result.insertId });
            });
        });
    });
};

exports.getMyEventBookings = (req, res) => {
    const sql = `
        SELECT event_bookings.*, event_spaces.name AS space_name, event_spaces.type
        FROM event_bookings
        JOIN event_spaces ON event_bookings.event_space_id = event_spaces.id
        WHERE event_bookings.user_id = ?
        ORDER BY event_bookings.event_date DESC
    `;
    db.query(sql, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
};

exports.getAllEventBookings = (req, res) => {
    const { status } = req.query;
    let sql = `
        SELECT event_bookings.*, event_spaces.name AS space_name, event_spaces.type,
               COALESCE(users.fullname, walk_in_guests.fullname) AS guest_name,
               COALESCE(users.email, walk_in_guests.email) AS guest_email,
               walk_in_guests.phone AS guest_phone
        FROM event_bookings
        JOIN event_spaces ON event_bookings.event_space_id = event_spaces.id
        LEFT JOIN users ON event_bookings.user_id = users.id
        LEFT JOIN walk_in_guests ON event_bookings.walk_in_guest_id = walk_in_guests.id
        WHERE 1=1
    `;
    const params = [];
    if (status) { sql += ' AND event_bookings.status = ?'; params.push(status); }
    sql += ' ORDER BY event_bookings.event_date DESC';

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
};

// Staff sets a price on a 'requested' booking, moving it to 'quoted'
exports.sendQuote = (req, res) => {
    const { id } = req.params;
    const { quoted_amount } = req.body;

    if (!quoted_amount || isNaN(quoted_amount) || Number(quoted_amount) <= 0) {
        return res.status(400).json({ error: 'A positive quoted_amount is required' });
    }

    db.query('SELECT * FROM event_bookings WHERE id = ?', [id], (err, bookings) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (bookings.length === 0) return res.status(404).json({ error: 'Event booking not found' });
        if (bookings[0].status !== 'requested') {
            return res.status(400).json({ error: 'Only pending requests can be quoted' });
        }

        db.query('UPDATE event_bookings SET status = "quoted", quoted_amount = ? WHERE id = ?', [quoted_amount, id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            db.query('SELECT users.email FROM event_bookings JOIN users ON event_bookings.user_id = users.id WHERE event_bookings.id = ?', [id], (err, rows) => {
                if (!err && rows.length > 0) {
                    sendEmail({
                        to: rows[0].email,
                        subject: 'Your Event Space Quote',
                        html: `<p>We've prepared a quote of KES ${quoted_amount} for your event booking request. Log in to your dashboard to confirm.</p>`
                    });
                }
            });

            res.json({ message: 'Quote sent' });
        });
    });
};

// Guest (or staff on a walk-in's behalf) accepts the quote
exports.confirmEventBooking = (req, res) => {
    const { id } = req.params;

    db.query('SELECT * FROM event_bookings WHERE id = ?', [id], (err, bookings) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (bookings.length === 0) return res.status(404).json({ error: 'Event booking not found' });

        const booking = bookings[0];
        if (booking.user_id && booking.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'receptionist') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        if (booking.status !== 'quoted') {
            return res.status(400).json({ error: 'Only quoted bookings can be confirmed' });
        }

        db.query('UPDATE event_bookings SET status = "confirmed" WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Event booking confirmed' });
        });
    });
};

exports.cancelEventBooking = (req, res) => {
    const { id } = req.params;

    db.query('SELECT * FROM event_bookings WHERE id = ?', [id], (err, bookings) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (bookings.length === 0) return res.status(404).json({ error: 'Event booking not found' });

        const booking = bookings[0];
        if (booking.user_id && booking.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'receptionist') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        db.query('UPDATE event_bookings SET status = "cancelled" WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Event booking cancelled' });
        });
    });
};

// Staff manually confirms payment was received (deposit/full) — same pattern as cash/card confirmation elsewhere
exports.confirmEventPayment = (req, res) => {
    const { id } = req.params;

    db.query('UPDATE event_bookings SET payment_status = "paid" WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Event booking not found' });
        res.json({ message: 'Event payment confirmed' });
    });
};