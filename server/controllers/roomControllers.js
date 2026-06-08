const db = require('../config/db');

exports.getRooms = (req, res) => {
    
    const sql = 'SELECT * FROM rooms';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching rooms:', err);
            res.status(500).json({ error: 'Failed to fetch rooms' });
        } else {
            res.json(results);
        }
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
        description
    } = req.body;

    const sql = 'INSERT INTO rooms (room_number, room_type, price, capacity, description) VALUES (?, ?, ?, ?, ?)';

    db.query(sql, [room_number, room_type, price, capacity, description], (err, results) => {
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
        description
    } = req.body;

    const sql = 'UPDATE rooms SET room_number = ?, room_type = ?, price = ?, capacity = ?, description = ? WHERE id = ?';

    db.query(sql, [room_number, room_type, price, capacity, description, id], (err, results) => {
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
