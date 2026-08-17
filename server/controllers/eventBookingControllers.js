const db = require('../config/db');
const sendEmail = require('../utils/sendEmail');
const logAudit = require('../utils/auditLogger');

function hasTimeOverlap(existing, requestedStart, requestedEnd) {
    return existing.some(row => requestedStart < row.end_time && requestedEnd > row.start_time);
}

exports.createWalkInEventBooking = (req, res) => {
    const { walk_in_guest_id, fullname, phone, email, event_space_id, event_date, start_time, end_time, purpose, expected_attendees, quoted_amount } = req.body;

    if (!event_space_id || !event_date || !start_time || !end_time || !quoted_amount) return res.status(400).json({ error: 'event_space_id, event_date, start_time, end_time, and quoted_amount are required' });
    if (end_time <= start_time) return res.status(400).json({ error: 'end_time must be after start_time' });
    if (isNaN(quoted_amount) || Number(quoted_amount) <= 0) return res.status(400).json({ error: 'quoted_amount must be a positive number' });

    const today = new Date().toISOString().slice(0, 10);
    if (event_date < today) return res.status(400).json({ error: 'event_date cannot be in the past' });

    function proceedWithGuest(guestId) {
        db.query('SELECT * FROM event_spaces WHERE id = ? AND active = 1', [event_space_id], (err, spaces) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (spaces.length === 0) return res.status(404).json({ error: 'Event space not found' });
            if (expected_attendees && expected_attendees > spaces[0].capacity) return res.status(400).json({ error: `This space holds up to ${spaces[0].capacity} guests` });

            const conflictSql = `SELECT start_time, end_time FROM event_bookings WHERE event_space_id = ? AND event_date = ? AND status IN ('requested', 'quoted', 'confirmed')`;
            db.query(conflictSql, [event_space_id, event_date], (err, existing) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                if (hasTimeOverlap(existing, start_time, end_time)) return res.status(400).json({ error: 'This space is already booked or pending for an overlapping time' });

                const sql = 'INSERT INTO event_bookings (event_space_id, walk_in_guest_id, event_date, start_time, end_time, purpose, expected_attendees, status, quoted_amount) VALUES (?, ?, ?, ?, ?, ?, ?, "quoted", ?)';
                db.query(sql, [event_space_id, guestId, event_date, start_time, end_time, purpose || null, expected_attendees || null, quoted_amount], (err, result) => {
                    if (err) {
                        console.error('Error creating walk-in event booking:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    logAudit({ req, action: 'CREATE', entityType: 'event_booking', entityId: result.insertId, description: `Created walk-in event booking for space ${event_space_id} on ${event_date}` }).catch(err => console.error('Audit log error:', err));
                    res.status(201).json({ message: 'Walk-in event reservation created', id: result.insertId });
                });
            });
        });
    }

    if (walk_in_guest_id) {
        proceedWithGuest(walk_in_guest_id);
    } else {
        if (!fullname || !phone) return res.status(400).json({ error: 'Provide walk_in_guest_id, or fullname and phone for a new walk-in guest' });
        db.query('INSERT INTO walk_in_guests (fullname, phone, email) VALUES (?, ?, ?)', [fullname, phone, email || null], (err, guestResult) => {
            if (err) {
                console.error('Error creating walk-in guest:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            proceedWithGuest(guestResult.insertId);
        });
    }
};

exports.requestEventBooking = (req, res) => {
    const user_id = req.user.id;
    const { event_space_id, event_date, start_time, end_time, purpose, expected_attendees } = req.body;
    if (!event_space_id || !event_date || !start_time || !end_time) return res.status(400).json({ error: 'event_space_id, event_date, start_time, and end_time are required' });
    if (end_time <= start_time) return res.status(400).json({ error: 'end_time must be after start_time' });

    const today = new Date().toISOString().slice(0, 10);
    if (event_date < today) return res.status(400).json({ error: 'event_date cannot be in the past' });

    db.query('SELECT * FROM event_spaces WHERE id = ? AND active = 1', [event_space_id], (err, spaces) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (spaces.length === 0) return res.status(404).json({ error: 'Event space not found' });
        if (expected_attendees && expected_attendees > spaces[0].capacity) return res.status(400).json({ error: `This space holds up to ${spaces[0].capacity} guests` });

        const conflictSql = `SELECT start_time, end_time FROM event_bookings WHERE event_space_id = ? AND event_date = ? AND status IN ('requested', 'quoted', 'confirmed')`;
        db.query(conflictSql, [event_space_id, event_date], (err, existing) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (hasTimeOverlap(existing, start_time, end_time)) return res.status(400).json({ error: 'This space is already booked or pending for an overlapping time' });

            const sql = 'INSERT INTO event_bookings (event_space_id, user_id, event_date, start_time, end_time, purpose, expected_attendees) VALUES (?, ?, ?, ?, ?, ?, ?)';
            db.query(sql, [event_space_id, user_id, event_date, start_time, end_time, purpose || null, expected_attendees || null], (err, result) => {
                if (err) {
                    console.error('Error creating event request:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                logAudit({ req, action: 'CREATE', entityType: 'event_booking', entityId: result.insertId, description: `Created event booking request for ${event_date}` }).catch(err => console.error('Audit log error:', err));
                res.status(201).json({ message: 'Request submitted — our team will send you a quote shortly.', id: result.insertId });
            });
        });
    });
};

exports.getMyEventBookings = (req, res) => {
    const sql = `SELECT event_bookings.*, event_spaces.name AS space_name, event_spaces.type FROM event_bookings JOIN event_spaces ON event_bookings.event_space_id = event_spaces.id WHERE event_bookings.user_id = ? ORDER BY event_bookings.event_date DESC`;
    db.query(sql, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
};

exports.getAllEventBookings = (req, res) => {
    const { status } = req.query;
    let sql = `SELECT event_bookings.*, event_spaces.name AS space_name, event_spaces.type, event_spaces.hourly_rate, COALESCE(users.fullname, walk_in_guests.fullname) AS guest_name, COALESCE(users.email, walk_in_guests.email) AS guest_email, walk_in_guests.phone AS guest_phone FROM event_bookings JOIN event_spaces ON event_bookings.event_space_id = event_spaces.id LEFT JOIN users ON event_bookings.user_id = users.id LEFT JOIN walk_in_guests ON event_bookings.walk_in_guest_id = walk_in_guests.id WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND event_bookings.status = ?'; params.push(status); }
    sql += ' ORDER BY event_bookings.event_date DESC';
    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
};

exports.sendQuote = (req, res) => {
    const { id } = req.params;
    const { quoted_amount } = req.body;
    if (!quoted_amount || isNaN(quoted_amount) || Number(quoted_amount) <= 0) return res.status(400).json({ error: 'A positive quoted_amount is required' });

    db.query('SELECT * FROM event_bookings WHERE id = ?', [id], (err, bookings) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (bookings.length === 0) return res.status(404).json({ error: 'Event booking not found' });
        if (bookings[0].status !== 'requested') return res.status(400).json({ error: 'Only pending requests can be quoted' });

        db.query('UPDATE event_bookings SET status = "quoted", quoted_amount = ? WHERE id = ?', [quoted_amount, id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            logAudit({ req, action: 'QUOTE', entityType: 'event_booking', entityId: id, description: `Sent quote of KES ${quoted_amount} for event booking` }).catch(err => console.error('Audit log error:', err));

            db.query('SELECT users.email FROM event_bookings JOIN users ON event_bookings.user_id = users.id WHERE event_bookings.id = ?', [id], (err, rows) => {
                if (!err && rows.length > 0) sendEmail({ to: rows[0].email, subject: 'Your Event Space Quote', html: `<p>We've prepared a quote of KES ${quoted_amount} for your event booking request. Log in to your dashboard to confirm.</p>` });
            });
            res.json({ message: 'Quote sent' });
        });
    });
};

exports.confirmEventBooking = (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM event_bookings WHERE id = ?', [id], (err, bookings) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (bookings.length === 0) return res.status(404).json({ error: 'Event booking not found' });
        const booking = bookings[0];
        if (booking.user_id && booking.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'receptionist') return res.status(403).json({ error: 'Not authorized' });
        if (booking.status !== 'quoted') return res.status(400).json({ error: 'Only quoted bookings can be confirmed' });

        db.query('UPDATE event_bookings SET status = "confirmed" WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            logAudit({ req, action: 'CONFIRM', entityType: 'event_booking', entityId: id, description: 'Confirmed event booking' }).catch(err => console.error('Audit log error:', err));
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
        if (booking.user_id && booking.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'receptionist') return res.status(403).json({ error: 'Not authorized' });

        db.query('UPDATE event_bookings SET status = "cancelled" WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            logAudit({ req, action: 'CANCEL', entityType: 'event_booking', entityId: id, description: 'Cancelled event booking' }).catch(err => console.error('Audit log error:', err));
            res.json({ message: 'Event booking cancelled' });
        });
    });
};

exports.confirmEventPayment = (req, res) => {
    const { id } = req.params;
    db.query('UPDATE event_bookings SET payment_status = "paid" WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Event booking not found' });
        logAudit({ req, action: 'PAYMENT_CONFIRMED', entityType: 'event_booking', entityId: id, description: 'Confirmed event booking payment' }).catch(err => console.error('Audit log error:', err));
        res.json({ message: 'Event payment confirmed' });
    });
};