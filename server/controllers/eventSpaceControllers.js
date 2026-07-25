const db = require('../config/db');

exports.getEventSpaces = (req, res) => {
    const { type, min_capacity } = req.query;
    let sql = 'SELECT * FROM event_spaces WHERE active = 1';
    const params = [];

    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (min_capacity) { sql += ' AND capacity >= ?'; params.push(min_capacity); }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching event spaces:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
};

exports.getEventSpace = (req, res) => {
    db.query('SELECT * FROM event_spaces WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'Event space not found' });
        res.json(results[0]);
    });
};

// Returns booked time ranges for a given space + date range, so the frontend can render an availability calendar
exports.getEventSpaceAvailability = (req, res) => {
    const { id } = req.params;
    const { from, to } = req.query;

    if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });

    const sql = `
        SELECT event_date, start_time, end_time, status
        FROM event_bookings
        WHERE event_space_id = ? AND status IN ('requested', 'quoted', 'confirmed') AND event_date BETWEEN ? AND ?
        ORDER BY event_date, start_time
    `;
    db.query(sql, [id, from, to], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
};

exports.addEventSpace = (req, res) => {
    const { name, type, capacity, hourly_rate, description, image_url } = req.body;

    if (!name || !type || !capacity || !hourly_rate) {
        return res.status(400).json({ error: 'name, type, capacity, and hourly_rate are required' });
    }
    if (!['conference', 'wedding', 'boardroom'].includes(type)) {
        return res.status(400).json({ error: 'type must be conference, wedding, or boardroom' });
    }
    if (isNaN(capacity) || Number(capacity) <= 0 || isNaN(hourly_rate) || Number(hourly_rate) <= 0) {
        return res.status(400).json({ error: 'capacity and hourly_rate must be positive numbers' });
    }

    const sql = 'INSERT INTO event_spaces (name, type, capacity, hourly_rate, description, image_url) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [name, type, capacity, hourly_rate, description || null, image_url || null], (err, result) => {
        if (err) {
            console.error('Error adding event space:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ message: 'Event space added', id: result.insertId });
    });
};

exports.updateEventSpace = (req, res) => {
    const { id } = req.params;
    const { name, type, capacity, hourly_rate, description, image_url, active } = req.body;

    if (!name || !type || !capacity || !hourly_rate) {
        return res.status(400).json({ error: 'name, type, capacity, and hourly_rate are required' });
    }

    const sql = 'UPDATE event_spaces SET name=?, type=?, capacity=?, hourly_rate=?, description=?, image_url=?, active=? WHERE id=?';
    db.query(sql, [name, type, capacity, hourly_rate, description || null, image_url || null, active !== undefined ? active : 1, id], (err, result) => {
        if (err) {
            console.error('Error updating event space:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Event space not found' });
        res.json({ message: 'Event space updated' });
    });
};

exports.deleteEventSpace = (req, res) => {
    db.query('UPDATE event_spaces SET active = 0 WHERE id = ?', [req.params.id], (err, result) => {
        if (err) {
            console.error('Error deleting event space:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Event space not found' });
        res.json({ message: 'Event space removed' });
    });
};