const db = require('../config/db');
const sendEmail = require('../utils/sendEmail');

exports.createBooking = (req, res) => {
    const user_id = req.user.id; 
    const { room_number, check_in, check_out } = req.body;

    if (!room_number || !check_in || !check_out) {
        return res.status(400).json({ error: 'room_number, check_in, and check_out are required' });
    }

    const start = new Date(check_in);
    const end = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ error: 'Invalid date format' });
    }
    if (start < today) {
        return res.status(400).json({ error: 'Check-in date cannot be in the past' });
    }
    if (end <= start) {
        return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }

    const roomSql = 'SELECT * FROM rooms WHERE TRIM(room_number) = ?';
    db.query(roomSql, [room_number], (err, roomResults) => {
        if (err) {
            console.error('Error fetching room:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (roomResults.length === 0) {
                return res.status(404).json({ error: 'Room not found' });
            }

        const conflictSql = 'SELECT * FROM bookings WHERE room_number = ? AND booking_status IN ("pending", "confirmed") AND (check_in < ? AND check_out > ?)';
        db.query(conflictSql, [room_number, check_out, check_in], (err, conflictResults) => {
            if (err) {
                console.error('Error checking booking conflicts:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            if (conflictResults.length > 0) {
                return res.status(400).json({ error: 'Room is already booked for the selected dates' });
            }            

        const room = roomResults[0]; 
        
        if (roomResults[0].status !== 'available') {
                return res.status(400).json({ error: `Room is currently ${roomResults[0].status}` });
        }

        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const total_amount = days * room.price;

            const bookingSql = 'INSERT INTO bookings (user_id, room_number, check_in, check_out, total_amount) VALUES (?, ?, ?, ?, ?)';
                db.query(bookingSql, [user_id, room_number, start, end, total_amount], (err, bookingResults) => {
                    if (err) {
                        console.error('Error creating booking:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    db.query("UPDATE rooms SET status = 'reserved' WHERE room_number = ?", [room_number], (err) => {
                        if (err) console.error('Error updating room status:', err);
                    });

                sendEmail({
                    to: req.user.email,
                    subject: 'Booking Confirmation',
                    html: `
                    <p>Hi,</p>
                    <p>Your booking has been created:</p>
                    <ul>
                    <li>Room: ${room_number}</li>
                    <li>Check-in: ${check_in}</li>
                    <li>Check-out: ${check_out}</li>
                    <li>Total: KES ${total_amount}</li>
                    </ul>
                    <p>Please complete payment to confirm your stay.</p>
                    `
                });

                res.status(201).json({ message: 'Booking created successfully', bookingId: bookingResults.insertId, total_amount });
            });            
        });
    });
};

exports.rescheduleBooking = (req, res) => {
    const user_id = req.user.id;
    const booking_id = req.params.booking_id;
    const { check_in, check_out } = req.body;

    if (!check_in || !check_out) {
        return res.status(400).json({ error: 'check_in and check_out are required' });
    }

    const start = new Date(check_in);
    const end = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ error: 'Invalid date format' });
    }
    if (start < today) {
        return res.status(400).json({ error: 'Check-in date cannot be in the past' });
    }
    if (end <= start) {
        return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }

    db.query('SELECT * FROM bookings WHERE booking_id = ? AND user_id = ?', [booking_id, user_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'Booking not found' });

        const booking = results[0];
        if (booking.booking_status !== 'pending') {
            return res.status(400).json({ error: 'Only unpaid bookings can be rescheduled — cancel and rebook instead' });
        }

        const conflictSql = 'SELECT * FROM bookings WHERE booking_id = ? AND room.room_number != ? AND booking_status IN ("pending", "confirmed") AND (check_in < ? AND check_out > ?)';
        db.query(conflictSql, [booking_id, room.room_number, check_out, check_in], (err, conflicts) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (conflicts.length > 0) {
                return res.status(400).json({ error: 'Room is already booked for the selected dates' });
            }

            db.query('SELECT price FROM rooms WHERE room_number = ?', [booking.room_number], (err, roomResults) => {
                if (err) return res.status(500).json({ error: 'Database error' });

                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                const total_amount = days * roomResults[0].price;

                db.query('UPDATE bookings SET check_in = ?, check_out = ?, total_amount = ? WHERE room_number = ?', [start, end, total_amount, booking.room_number], (err) => {
                    if (err) return res.status(500).json({ error: 'Database error' });
                    res.json({ message: 'Booking rescheduled', total_amount });
                });
            });
        });
    });
};

exports.completeBooking = (req, res) => {
    const bookingId = req.params.room_number;

    const sql = ` SELECT room_number FROM bookings WHERE room_number = ? `;
    db.query(sql, [bookingId], (err, booking) => {
        if (err)
            return res.status(500).json(err);

        if (booking.length === 0)
            return res.status(404).json({
                error: "Booking not found"
            });

        const roomId = booking[0].room_number;

        db.query("UPDATE bookings SET booking_status='completed' WHERE booking_id=?", [bookingId], (err) => {

                if (err)
                    return res.status(500).json(err);
                    res.json({
                            message: "Booking completed."
                    });
        });
    });
};

exports.getBookings = (req, res) => {
    const user_id = req.user.id;

    const sql = 'SELECT bookings.*, rooms.room_type, rooms.status FROM bookings JOIN rooms ON bookings.room_number = rooms.room_number WHERE bookings.user_id = ?';
    db.query(sql, [user_id], (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
};

exports.getBooking = (req, res) => {
    const user_id = req.user.id;
    const room_number = req.params.room_number;

    const sql = 'SELECT * FROM bookings WHERE id = ? AND user_id = ?';
    db.query(sql, [id, user_id],
        (err, results) => {
        if (err) {
            console.error('Error fetching booking:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json(results[0]);
    });
};

exports.getAllBookings = (req, res) => {
    const { status, guest, check_in, check_out } = req.query;

    let sql = `
        SELECT bookings.*, rooms.room_type, rooms.status AS room_status, users.fullname, users.email
        FROM bookings
        JOIN rooms ON bookings.room_number = rooms.room_number
        JOIN users ON bookings.user_id = users.id
        WHERE 1=1
    `;
    const params = [];

    if (status) {
        sql += ' AND bookings.booking_status = ?';
        params.push(status);
    }
    if (guest) {
        sql += ' AND (users.fullname LIKE ? OR users.email LIKE ?)';
        params.push(`%${guest}%`, `%${guest}%`);
    }
    if (check_in) {
        sql += ' AND bookings.check_in >= ?';
        params.push(check_in);
    }
    if (check_out) {
        sql += ' AND bookings.check_out <= ?';
        params.push(check_out);
    }

    sql += ' ORDER BY bookings.check_in DESC';

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching all bookings:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
};

exports.cancelBooking = (req, res) => {
    const user_id = req.user.id;
    const room_number = req.params.room_number;

    const bookingSql = 'SELECT * FROM bookings WHERE room_number = ? AND user_id = ?';
    db.query(bookingSql, [room_number, user_id], (err, bookingResults) => {
        if (err) {
            console.error('Error fetching booking:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (bookingResults.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingResults[0];

        db.query("UPDATE rooms SET status = 'available' WHERE room_number = ?", [booking.room_number], (err) => {
            if (err) {
                console.error('Error updating room status:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            db.query("UPDATE bookings SET booking_status = ? WHERE room_number = ? AND user_id = ?", ['cancelled', room_number, user_id], (err) => {
                if (err) {
                    console.error('Error updating booking status:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

            sendEmail({
                    to: req.user.email,
                    subject: 'Booking Confirmation',
                    html: `
                    <p>Hi,</p>
                    <p>Your booking has been cancelled:</p>
                    <ul>
                    <li>Room: ${booking.room_number}</li>
                    <li>Check-in: ${booking.check_in}</li>
                    <li>Check-out: ${booking.check_out}</li>
                    <li>Total: KES ${booking.total_amount}</li>
                    </ul>
                    `
                });

                res.status(201).json({ message: 'Booking cancelled successfully' });
            });
        });
    });
};

exports.reserveRoom = (req, res) => {
    const user_id = req.user.id;  
    const { room_number, check_in, check_out } = req.body;

    if (!room_number || !check_in || !check_out) {
        return res.status(400).json({ error: 'room_number, check_in, and check_out are required' });
    }

    const start = new Date(check_in);
    const end = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ error: 'Invalid date format' });
    }
    if (start < today) {
        return res.status(400).json({ error: 'Check-in date cannot be in the past' });
    }
    if (end <= start) {
        return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }

    db.query("SELECT * FROM rooms WHERE room_number = ?", [room_number], (err, rooms) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (rooms.length === 0) return res.status(404).json({ error: 'Room not found' });
        if (rooms[0].status !== 'available') {
            return res.status(400).json({ error: `Room is currently ${rooms[0].status}` });
        }

        const conflictSql = 'SELECT * FROM bookings WHERE room_number = ? AND booking_status IN ("pending", "confirmed") AND (check_in < ? AND check_out > ?)';
        db.query(conflictSql, [room_number, check_out, check_in], (err, conflicts) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (conflicts.length > 0) {
                return res.status(400).json({ error: 'Room is already booked for the selected dates' });
            }

            const room = rooms[0];
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            const total_amount = days * room.price;

            const sql = 'INSERT INTO bookings (user_id, room_number, check_in, check_out, total_amount) VALUES (?, ?, ?, ?, ?)';
            db.query(sql, [user_id, room_number, start, end, total_amount], (err, result) => {
                if (err) {
                    console.error('Error creating reservation:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                // Room is held immediately — this is what makes it a "reservation" rather than a plain booking
                db.query("UPDATE rooms SET status = 'reserved' WHERE room_number = ?", [room_number], (err) => {
                    if (err) console.error('Error updating room status:', err);
                });

                sendEmail({
                    to: req.user.email,
                    subject: 'Booking Confirmation',
                    html: `
                    <p>Hi,</p>
                    <p>Your reservation has been made:</p>
                    <ul>
                    <li>Room: ${room_number}</li>
                    <li>Check-in: ${check_in}</li>
                    <li>Check-out: ${check_out}</li>
                    <li>Total: KES ${total_amount}</li>
                    </ul>
                    <p>Please complete payment to confirm reservation.</p>
                    `
                });

                res.status(201).json({ message: 'Room reserved — complete payment to confirm', bookingId: result.insertId, total_amount });
            });
        });
    });
};