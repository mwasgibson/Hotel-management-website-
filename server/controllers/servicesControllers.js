const db = require('../config/db');

exports.getServices = (req, res) => {
    db.query('SELECT * FROM services WHERE active = 1 ORDER BY name', (err, results) => {
        if (err) {
            console.error('Error fetching services:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
};

exports.addService = (req, res) => {
    const { name, price, description } = req.body;

    if (!name || price === undefined || price === null || isNaN(price) || Number(price) <= 0) {
        return res.status(400).json({ error: 'name and a positive price are required' });
    }

    db.query('INSERT INTO services (name, price, description) VALUES (?, ?, ?)', [name, price, description || null], (err, result) => {
        if (err) {
            console.error('Error adding service:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ message: 'Service added', id: result.insertId });
    });
};

exports.updateService = (req, res) => {
    const { id } = req.params;
    const { name, price, description, active } = req.body;

    if (!name || price === undefined || price === null || isNaN(price) || Number(price) <= 0) {
        return res.status(400).json({ error: 'name and a positive price are required' });
    }

    db.query('UPDATE services SET name = ?, price = ?, description = ?, active = ? WHERE id = ?',
        [name, price, description || null, active !== undefined ? active : 1, id], (err, result) => {
            if (err) {
                console.error('Error updating service:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Service not found' });
            res.json({ message: 'Service updated' });
        });
};

exports.deleteService = (req, res) => {
    const { id } = req.params;
    // soft-delete — a booking_services row may already reference this service, and hard-deleting would break that history
    db.query('UPDATE services SET active = 0 WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error deleting service:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Service not found' });
        res.json({ message: 'Service removed' });
    });
};

exports.getBookingServices = (req, res) => {
    const { booking_id } = req.params;
    const sql = `
        SELECT booking_services.*, services.name
        FROM booking_services
        JOIN services ON booking_services.service_id = services.id
        WHERE booking_services.booking_id = ?
    `;
    db.query(sql, [booking_id], (err, results) => {
        if (err) {
            console.error('Error fetching booking services:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
};