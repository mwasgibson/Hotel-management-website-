const db = require('../config/db');

exports.createBooking = (req, res) => {
    const user_id = req.user.id; 

    const { room_id, start_date, end_date } = req.body;

    const roomSql = 'SELECT * FROM rooms WHERE id = ?';
    db.query(roomSql, [room_id], (err, roomResults) => {
        if (err) {
            console.error('Error fetching room:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (roomResults.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const room = roomResults[0];

        if (room.status !== 'available') {
            return res.status(400).json({ error: 'Room is not available' });
        }

        const start = new Date(start_date);
        const end = new Date(end_date);
        
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const total_amount = days * room.price;

        const bookingSql = 'INSERT INTO bookings (user_id, room_id, start_date, end_date, total_amount) VALUES (?, ?, ?, ?, ?)';
        db.query(bookingSql, [user_id, room_id, start_date, end_date, total_amount], (err, bookingResults) => {
            if (err) {
                console.error('Error creating booking:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            db.query('UPDATE rooms SET status = reserved WHERE id = ?', [room_id], (err) => {
                if (err) {
                    console.error('Error updating room status:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                res.status(201).json({ message: 'Booking created successfully', bookingId: bookingResults.insertId, total_amount});
            });
        }
        );
    }
    );
};

exports.getBookings = (req, res) => {

    const user_id = req.user.id;

    const sql = 'SELECT bookings.*, rooms.room_number, rooms.room_type FROM bookings JOIN rooms ON bookings.room_id = rooms.id WHERE bookings.user_id = ?';
    db.query(sql, [user_id], (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json(results);
    });
};

exports.getBooking = (req, res) => {

    const user_id = req.params.id;

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

    const { id } = req.params;

    const bookingSql = 'SELECT * FROM bookings WHERE id = ?';
    db.query(bookingSql, [id], (err, bookingResults) => {
        if (err) {
            console.error('Error fetching booking:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (bookingResults.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingResults[0];

        db.query('UPDATE rooms SET booking_status = 'cancelled' WHERE id = ?', [booking.room_id], (err) => {
            if (err) {
                console.error('Error updating room status:', err);
                return res.status(500).json({ error: 'Database error' });
            }
        db.query('UPDATE bookings SET status = 'cancelled' WHERE id = ?', [id], (err) => {
            if (err) {
                console.error('Error updating booking status:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({ message: 'Booking cancelled successfully' });

        });