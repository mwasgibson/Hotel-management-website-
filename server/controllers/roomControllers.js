const db = require('../config/db');

exports.getRooms = (req, res) => {
    const { room_type, min_price, max_price, capacity, check_in, check_out } = req.query;

    let sql = 'SELECT * FROM rooms WHERE 1=1';
    const params = [];

    if (room_type) {
        sql += ' AND room_type = ?';
        params.push(room_type);
    }
    if (min_price) {
        sql += ' AND price >= ?';
        params.push(min_price);
    }
    if (max_price) {
        sql += ' AND price <= ?';
        params.push(max_price);
    }
    if (capacity) {
        sql += ' AND capacity >= ?';
        params.push(capacity);
    }
    // Only show rooms with no conflicting booking in the requested date range
    if (check_in && check_out) {
        sql += ` AND id NOT IN (
            SELECT room_number FROM bookings
            WHERE booking_status IN ('pending', 'confirmed')
            AND check_in < ? AND check_out > ?
        )`;
        params.push(check_out, check_in);
    }

    sql += ' ORDER BY price ASC';

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching rooms:', err);
            return res.status(500).json({ error: 'Failed to fetch rooms' });
        }
        res.json(results);
    });
};

exports.getRoom = (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM rooms WHERE id = ?';

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error fetching room:', err);
            res.status(500).json({ error: 'Failed to fetch room' });
        } else {
            if (results.length === 0) {
                res.status(404).json({ error: 'Room not found' });
            } else {
                res.json(results[0]);
            }
        }
    });
};

exports.addRooms = (req, res) => {
    const {
        room_number,
        room_type,
        price,
        capacity,
        status,
        description
    } = req.body;

    const sql = 'INSERT INTO rooms (room_number, room_type, price, capacity, status, description) VALUES (?, ?, ?, ?, ?, ?)';

    db.query(sql, [room_number, room_type, price, capacity, status, description], (err, results) => {
        if (err) {
            console.error('Error adding room:', err);
            res.status(500).json({ error: 'Failed to add room' });
        } else {
            res.status(201).json({ message: 'Room added successfully', id: results.insertId });
        }
    });
};

exports.updateRoom = (req, res) => {
    const { id } = req.params;
    const {
        room_number,
        room_type,
        price,
        capacity,
        status,
        description
    } = req.body;

    const sql = 'UPDATE rooms SET room_number = ?, room_type = ?, price = ?, capacity = ?, status = ?, description = ? WHERE id = ?';

    db.query(sql, [room_number, room_type, price, capacity, status, description, id], (err, results) => {
        if (err) {
            console.error('Error updating room:', err);
            res.status(500).json({ error: 'Failed to update room' });
        } else {
            if (results.affectedRows === 0) {
                res.status(404).json({ error: 'Room not found' });
            } else {
                res.json({ message: 'Room updated successfully' });
            }
        }
    });
};

exports.deleteRoom = (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM rooms WHERE id = ?';

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error deleting room:', err);
            res.status(500).json({ error: 'Failed to delete room' });
        } else {
            if (results.affectedRows === 0) {
                res.status(404).json({ error: 'Room not found' });
            } else {
                res.json({ message: 'Room deleted successfully' });
            }
        }
    });
};

exports.checkIn = (req, res) => {
    const bookingId = req.params.id;

    const sql = 'SELECT room_number, booking_status FROM bookings WHERE id = ?';
    db.query(sql, [bookingId], (err, bookingResults) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (bookingResults.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingResults[0];

        if (booking.booking_status !== 'completed') {
            return res.status(400).json({ error: 'Booking must be completed before check-in' });
        }

        db.query(`UPDATE bookings SET actual_check_in = NOW() WHERE id=?`, [bookingId], (err) => {
                if (err)
                    return res.status(500).json(err);
        });
            db.query('UPDATE rooms SET status = ? WHERE id = ?', ['occupied', booking.room_number], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Room not found' });
                }
                res.json({ message: 'Guest checked in.' });
            });            
    });
};

exports.checkOut = (req, res) => {
    const bookingId = req.params.id;

    db.query("SELECT room_number FROM bookings WHERE id=?", [bookingId],(err, booking) => {
            if (err)
                return res.status(500).json(err);

            const roomId = booking[0].room_number;

            db.query(`UPDATE bookings SET actual_check_out = NOW() WHERE id=?`, [bookingId], (err) => {
                    if (err)
                        return res.status(500).json(err);
            });
                db.query("UPDATE rooms SET status='cleaning' WHERE id=?", [roomId], () => {
                    res.json({ message: "Guest checked out." });
                });
    });
};

exports.finishCleaning = (req, res) => {
    const roomId = req.params.id;

    db.query("UPDATE rooms SET status='available' WHERE id=? AND status='cleaning'", [roomId], (err, result) => {
            if (err)
                return res.status(500).json(err);

            if (result.affectedRows === 0)
                return res.status(400).json({ error: "Room is not under cleaning." });
            res.json({ message: "Room is now available." });
        });
};

exports.startMaintenance = (req, res) => {
    const {status} = req.body;

    if (status !== 'available'){
        return res.status(400).json({ error: "Room is not available for maintenance." });
    }

    db.query("UPDATE rooms SET status='maintenance' WHERE id=?", [req.params.id], (err) => {
            if (err)
                return res.status(500).json(err);
            res.json({ message: "Room sent to maintenance." });
    });
};

exports.finishMaintenance = (req, res) => {

    db.query("UPDATE rooms SET status='available' WHERE id=?", [req.params.id], (err) => {
            if (err)
                return res.status(500).json(err);
            res.json({ message: "Maintenance completed." });
    });
};