const db = require('../config/db');
const { attachServicesToBooking } = require('../utils/bookingServices.js');
const logAudit = require('../utils/auditLogger');
const moveToTrash = require('../utils/trashLogger');

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
        logAudit({ req, action: 'CREATE', entityType: 'service', entityId: result.insertId, description: `Created service "${name}"` }).catch(err => console.error('Audit log error:', err));
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
            logAudit({ req, action: 'UPDATE', entityType: 'service', entityId: id, description: `Updated service "${name}"` }).catch(err => console.error('Audit log error:', err));
            res.json({ message: 'Service updated' });
        });
};

exports.deleteService = (req, res) => {
    const { id } = req.params;

    db.query('SELECT * FROM services WHERE id = ?', [id], (selectErr, rows) => {
        if (selectErr) {
            console.error('Error fetching service before deletion:', selectErr);
            return res.status(500).json({ error: 'Database error' });
        }
        if (rows.length === 0) return res.status(404).json({ error: 'Service not found' });

        const service = rows[0];

        moveToTrash({
            entityType: 'service',
            entityId: service.id,
            entityData: service,
            deletedBy: req.user?.id || null
        }).then(() => {
            db.query('UPDATE services SET active = 0 WHERE id = ?', [id], (err, result) => {
                if (err) {
                    console.error('Error deleting service:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                if (result.affectedRows === 0) return res.status(404).json({ error: 'Service not found' });
                logAudit({ req, action: 'DELETE', entityType: 'service', entityId: id, description: `Moved service "${service.name}" to trash` }).catch(err => console.error('Audit log error:', err));
                res.json({ message: 'Service moved to trash' });
            });
        }).catch(err => {
            console.error('Error moving service to trash:', err);
            res.status(500).json({ error: 'Could not move service to trash' });
        });
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

exports.addServiceToBooking = async (req, res) => {
    try {
        let bookingId;
        const { services } = req.body;
        if (!services || services.length === 0) {
            return res.status(400).json({ error: 'No services selected' });
        }
        if (req.user.role === 'admin' || req.user.role === 'receptionist') {
            bookingId = req.body.booking_id;
            if (!bookingId) return res.status(400).json({ error: 'Booking required' });
        } else {
            const booking = await new Promise((resolve, reject) => {
                db.query(`SELECT id FROM bookings WHERE user_id=? AND booking_status='confirmed' LIMIT 1`, [req.user.id], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });
            if (booking.length === 0) return res.status(404).json({ error: 'No active booking' });
            bookingId = booking[0].id;
        }
        const total = await attachServicesToBooking(bookingId, services);
        res.json({ message: 'Services added successfully', services_total: total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
