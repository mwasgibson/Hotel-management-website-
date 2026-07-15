const db = require('../config/db');

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

    const roomSql = 'SELECT * FROM rooms WHERE id = ?';
    db.query(roomSql, [room_number], (err, roomResults) => {
        if (err) {
            console.error('Error fetching room:', err);
            return res.status(500).json({ error: 'Database error' });
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

            if (roomResults.length === 0) {
                return res.status(404).json({ error: 'Room not found' });
            }

        const room = roomResults[0];        

        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const total_amount = days * room.price;

        const bookingSql = 'INSERT INTO bookings (user_id, room_id, check_in, check_out, total_amount) VALUES (?, ?, ?, ?, ?)';
        db.query(bookingSql, [user_id, room_number, start, end, total_amount], (err, bookingResults) => {
            if (err) {
                console.error('Error creating booking:', err);
                return res.status(500).json({ error: 'Database error' });
            }

                res.status(201).json({ message: 'Booking created successfully', bookingId: bookingResults.insertId, total_amount});
            });
        });
    });
};

exports.getBookings = (req, res) => {

    const user_id = req.user.id;

    const sql = 'SELECT bookings.*, rooms.room_type, rooms.status FROM bookings JOIN rooms ON bookings.room_number = rooms.id WHERE bookings.user_id = ?';
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

    const sql = 'SELECT * FROM bookings WHERE id = ? AND user_id = ?';
    db.query(sql, [req.params.id, user_id], (err, results) => {
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

exports.cancelBooking = (req, res) => {

    const user_id = req.user.id;
    const { id } = req.params;

    const bookingSql = 'SELECT * FROM bookings WHERE id = ? AND user_id = ?';
    db.query(bookingSql, [id, user_id], (err, bookingResults) => {
        if (err) {
            console.error('Error fetching booking:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (bookingResults.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingResults[0];

        db.query("UPDATE rooms SET status = 'available' WHERE id = ?", [booking.room_number], (err) => {
            if (err) {
                console.error('Error updating room status:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            db.query("UPDATE bookings SET booking_status = 'cancelled' WHERE id = ?", [id], (err) => {
                if (err) {
                    console.error('Error updating booking status:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({ message: 'Booking cancelled successfully' });

            });
        });
    });
};
