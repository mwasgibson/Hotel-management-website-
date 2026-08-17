const db = require('../config/db');
const logAudit = require('../utils/auditLogger');
const moveToTrash = require('../utils/trashLogger');

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
        logAudit({ req, action: 'CREATE', entityType: 'event_space', entityId: result.insertId, description: `Created event space "${name}"` }).catch(err => console.error('Audit log error:', err));
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
        logAudit({ req, action: 'UPDATE', entityType: 'event_space', entityId: id, description: `Updated event space "${name}"` }).catch(err => console.error('Audit log error:', err));
        res.json({ message: 'Event space updated' });
    });
};

exports.deleteEventSpace = (req, res) => {
    const id = req.params.id;

    db.query('SELECT * FROM event_spaces WHERE id = ?', [id], (selectErr, rows) => {
        if (selectErr) {
            console.error('Error fetching event space before deletion:', selectErr);
            return res.status(500).json({ error: 'Database error' });
        }
        if (rows.length === 0) return res.status(404).json({ error: 'Event space not found' });

        moveToTrash({
            entityType: 'event_space',
            entityId: id,
            entityData: rows[0],
            deletedBy: req.user?.id || null
        }).then(() => {
            db.query('UPDATE event_spaces SET active = 0 WHERE id = ?', [id], (err, result) => {
                if (err) {
                    console.error('Error deleting event space:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                if (result.affectedRows === 0) return res.status(404).json({ error: 'Event space not found' });
                logAudit({ req, action: 'DELETE', entityType: 'event_space', entityId: id, description: `Removed event space "${rows[0].name}"` }).catch(err => console.error('Audit log error:', err));
                res.json({ message: 'Event space removed' });
            });
        }).catch(err => {
            console.error('Error moving event space to trash:', err);
            res.status(500).json({ error: 'Could not move event space to trash' });
        });
    });
};
