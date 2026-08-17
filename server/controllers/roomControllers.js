const db = require('../config/db');
const { calculateDynamicPrice } = require('../utils/dynamicPricing');
const logAudit = require('../utils/auditLogger');
const moveToTrash = require('../utils/trashLogger');

const VALID_ROOM_TYPES = ['Standard', 'Single', 'Double', 'Suite', 'Deluxe', 'Executive'];
const VALID_ROOM_STATUSES = ['available', 'reserved', 'occupied', 'cleaning', 'maintenance'];

function audit(req, action, entityId, description) {
    logAudit({ req, action, entityType: 'room', entityId, description })
        .catch(err => console.error('Audit log error:', err));
}

function validateRoomInput(body, { partial = false } = {}) {
    const { room_number, room_type, price, capacity, status, description } = body;
    const errors = [];
    if (!room_number && room_number !== 0) errors.push('room_number is required');
    if (!room_type) errors.push('room_type is required');
    else if (!VALID_ROOM_TYPES.includes(room_type)) errors.push(`room_type must be one of: ${VALID_ROOM_TYPES.join(', ')}`);
    if (price === undefined || price === null || price === '') errors.push('price is required');
    else if (isNaN(price) || Number(price) <= 0) errors.push('price must be a positive number');
    if (capacity === undefined || capacity === null || capacity === '') errors.push('capacity is required');
    else if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) errors.push('capacity must be a positive whole number');
    if (status !== undefined && status !== '' && !VALID_ROOM_STATUSES.includes(status)) errors.push(`status must be one of: ${VALID_ROOM_STATUSES.join(', ')}`);
    if (description !== undefined && typeof description !== 'string') errors.push('description must be text');
    return errors;
}

exports.getRooms = (req, res) => {
    const { room_type, min_price, max_price, capacity, check_in, check_out } = req.query;
    let sql = 'SELECT * FROM rooms WHERE 1=1';
    const params = [];
    if (room_type) { sql += ' AND room_type = ?'; params.push(room_type); }
    if (min_price) { sql += ' AND price >= ?'; params.push(min_price); }
    if (max_price) { sql += ' AND price <= ?'; params.push(max_price); }
    if (capacity) { sql += ' AND capacity >= ?'; params.push(capacity); }
    if (check_in && check_out) {
        sql += ` AND room_number NOT IN (SELECT room_number FROM bookings WHERE booking_status IN ('pending', 'confirmed') AND check_in < ? AND check_out > ?)`;
        params.push(check_out, check_in);
    }
    sql += ' ORDER BY price ASC';
    db.query(sql, params, (err, results) => {
        if (err) { console.error('Error fetching rooms:', err); return res.status(500).json({ error: 'Failed to fetch rooms' }); }
        res.json(results);
    });
};

exports.getRoom = (req, res) => {
    db.query('SELECT * FROM rooms WHERE room_number = ?', [req.params.room_number], (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch room' });
        if (results.length === 0) return res.status(404).json({ error: 'Room not found' });
        res.json(results[0]);
    });
};

exports.getRoomQuote = async (req, res) => {
    const { room_number } = req.params;
    const { check_in, check_out } = req.query;
    if (!check_in || !check_out) return res.status(400).json({ error: 'check_in and check_out are required' });
    const start = new Date(check_in), end = new Date(check_out);
    if (isNaN(start) || isNaN(end) || end <= start) return res.status(400).json({ error: 'Invalid date range' });
    db.query('SELECT * FROM rooms WHERE room_number = ?', [room_number], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'Room not found' });
        const room = results[0];
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        try {
            const pricing = await calculateDynamicPrice(room.price, start);
            res.json({ basePrice: room.price, pricePerNight: pricing.adjustedPrice, nights, totalPrice: pricing.adjustedPrice * nights, appliedReasons: pricing.appliedReasons });
        } catch (error) {
            console.error('Error calculating quote:', error);
            res.json({ basePrice: room.price, pricePerNight: room.price, nights, totalPrice: room.price * nights, appliedReasons: [] });
        }
    });
};

exports.addRooms = (req, res) => {
    const errors = validateRoomInput(req.body);
    if (errors.length > 0) return res.status(400).json({ error: errors.join('; ') });
    const { room_number, room_type, price, capacity, description } = req.body;
    const status = req.body.status || 'available';
    db.query('INSERT INTO rooms (room_number, room_type, price, capacity, status, description) VALUES (?, ?, ?, ?, ?, ?)', [room_number, room_type, price, capacity, status, description], (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A room with this room_number already exists' });
            console.error('Error adding room:', err); return res.status(500).json({ error: 'Failed to add room' });
        }
        audit(req, 'CREATE', room_number, `Created room ${room_number}`);
        res.status(201).json({ message: 'Room added successfully', id: results.insertId });
    });
};

exports.updateRoom = (req, res) => {
    const { room_number } = req.params;
    const errors = validateRoomInput(req.body);
    if (errors.length > 0) return res.status(400).json({ error: errors.join('; ') });
    const { room_type, price, capacity, status, description } = req.body;
    db.query('UPDATE rooms SET room_number = ?, room_type = ?, price = ?, capacity = ?, status = ?, description = ? WHERE room_number = ?', [room_number, room_type, price, capacity, status, description, room_number], (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A room with this room_number already exists' });
            console.error('Error updating room:', err); return res.status(500).json({ error: 'Failed to update room' });
        }
        if (results.affectedRows === 0) return res.status(404).json({ error: 'Room not found' });
        audit(req, 'UPDATE', room_number, `Updated room ${room_number}`);
        res.json({ message: 'Room updated successfully' });
    });
};

exports.deleteRoom = (req, res) => {
    const { room_number } = req.params;
    db.query('SELECT * FROM rooms WHERE room_number = ?', [room_number], (selectErr, rows) => {
        if (selectErr) return res.status(500).json({ error: 'Database error' });
        if (rows.length === 0) return res.status(404).json({ error: 'Room not found' });
        const room = rows[0];
        moveToTrash({ entityType: 'room', entityId: room.room_number, entityData: room, deletedBy: req.user?.id || null })
            .then(() => {
                db.query('UPDATE rooms SET active = 0 WHERE room_number = ?', [room_number], (err, results) => {
                    if (err) return res.status(500).json({ error: 'Failed to delete room' });
                    if (results.affectedRows === 0) return res.status(404).json({ error: 'Room not found' });
                    audit(req, 'DELETE', room_number, `Moved room ${room_number} to trash`);
                    res.json({ message: 'Room moved to trash' });
                });
            })
            .catch(err => { console.error('Error moving room to trash:', err); res.status(500).json({ error: 'Could not move room to trash' }); });
    });
};

exports.restoreRoom = (req, res) => {
    db.query('UPDATE rooms SET active = 1 WHERE room_number = ?', [req.params.room_number], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.affectedRows === 0) return res.status(404).json({ error: 'Room not found' });
        audit(req, 'RESTORE', req.params.room_number, `Restored room ${req.params.room_number}`);
        res.json({ message: 'Room restored successfully' });
    });
};

exports.checkIn = (req, res) => {
    const roomId = req.params.room_number;
    db.query('SELECT room_number FROM rooms WHERE room_number = ?', [roomId], (err, roomRows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (roomRows.length === 0) return res.status(404).json({ error: 'Room not found' });
        const roomNumber = roomRows[0].room_number;
        db.query(`SELECT * FROM bookings WHERE room_number = ? AND booking_status = 'confirmed' ORDER BY check_in DESC LIMIT 1`, [roomNumber], (err, bookingResults) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (bookingResults.length === 0) return res.status(404).json({ error: 'No confirmed booking found for this room' });
            const booking = bookingResults[0];
            db.query('UPDATE bookings SET actual_check_in = NOW() WHERE room_number = ?', [booking.room_number], err => { if (err) console.error('Error recording check-in time:', err); });
            db.query('UPDATE rooms SET status = ? WHERE room_number = ?', ['occupied', roomId], err => {
                if (err) return res.status(500).json({ error: 'Database error' });
                audit(req, 'CHECK_IN', roomId, `Checked guest into room ${roomId}`);
                res.json({ message: 'Guest checked in.' });
            });
        });
    });
};

exports.checkOut = (req, res) => {
    const roomId = req.params.room_number;
    db.query('SELECT room_number FROM rooms WHERE room_number = ?', [roomId], (err, roomRows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (roomRows.length === 0) return res.status(404).json({ error: 'Room not found' });
        const roomNumber = roomRows[0].room_number;
        db.query(`SELECT * FROM bookings WHERE room_number = ? AND booking_status = 'confirmed' ORDER BY check_in DESC LIMIT 1`, [roomNumber], (err, bookingResults) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (bookingResults.length === 0) return res.status(404).json({ error: 'No active booking found for this room' });
            const booking = bookingResults[0];
            db.query(`UPDATE bookings SET actual_check_out = NOW(), booking_status = 'completed' WHERE id = ?`, [booking.id], err => { if (err) console.error('Error recording check-out:', err); });
            db.query("UPDATE rooms SET status = 'cleaning' WHERE room_number = ?", [roomId], err => {
                if (err) return res.status(500).json({ error: 'Database error' });
                audit(req, 'CHECK_OUT', roomId, `Checked guest out of room ${roomId}`);
                res.json({ message: 'Guest checked out.' });
            });
        });
    });
};

exports.finishCleaning = (req, res) => {
    const roomId = req.params.room_number;
    db.query("UPDATE rooms SET status='available' WHERE room_number=? AND status='cleaning'", [roomId], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) return res.status(400).json({ error: 'Room is not under cleaning.' });
        audit(req, 'CLEANING_COMPLETE', roomId, `Finished cleaning room ${roomId}`);
        res.json({ message: 'Room is now available.' });
    });
};

exports.startMaintenance = (req, res) => {
    if (req.body.status !== 'available') return res.status(400).json({ error: 'Room is not available for maintenance.' });
    db.query("UPDATE rooms SET status='maintenance' WHERE room_number=?", [req.params.room_number], err => {
        if (err) return res.status(500).json(err);
        audit(req, 'MAINTENANCE_START', req.params.room_number, `Sent room ${req.params.room_number} to maintenance`);
        res.json({ message: 'Room sent to maintenance.' });
    });
};

exports.finishMaintenance = (req, res) => {
    db.query("UPDATE rooms SET status='available' WHERE room_number=?", [req.params.room_number], err => {
        if (err) return res.status(500).json(err);
        audit(req, 'MAINTENANCE_COMPLETE', req.params.room_number, `Completed maintenance for room ${req.params.room_number}`);
        res.json({ message: 'Maintenance completed.' });
    });
};