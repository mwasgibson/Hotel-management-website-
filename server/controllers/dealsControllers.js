const db = require('../config/db');
const { validateAndApplyPromoCode } = require('../utils/promoCodes');
const logAudit = require('../utils/auditLogger');

exports.getDeals = (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    db.query('SELECT * FROM deals WHERE active = 1 AND end_date >= ? ORDER BY end_date ASC', [today], (err, results) => {
        if (err) {
            console.error('Error fetching deals:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
};

// Admin-only: returns every deal (active, inactive, expired) so the CMS can manage the full set.
exports.getAllDeals = (req, res) => {
    db.query('SELECT * FROM deals ORDER BY end_date DESC', (err, results) => {
        if (err) {
            console.error('Error fetching all deals:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
};

exports.getDeal = (req, res) => {
    db.query('SELECT * FROM deals WHERE id = ?', [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching deal:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) return res.status(404).json({ error: 'Deal not found' });
        res.json(results[0]);
    });
};

exports.addDeal = (req, res) => {
    const { title, description, discount_type, discount_value, promo_code, start_date, end_date, image_url } = req.body;

    if (!title || !discount_type || !discount_value || !start_date || !end_date) {
        return res.status(400).json({ error: 'title, discount_type, discount_value, start_date, and end_date are required' });
    }
    if (!['percentage', 'fixed'].includes(discount_type)) {
        return res.status(400).json({ error: 'discount_type must be percentage or fixed' });
    }
    if (isNaN(discount_value) || Number(discount_value) <= 0) {
        return res.status(400).json({ error: 'discount_value must be a positive number' });
    }
    if (new Date(end_date) <= new Date(start_date)) {
        return res.status(400).json({ error: 'end_date must be after start_date' });
    }

    const sql = 'INSERT INTO deals (title, description, discount_type, discount_value, promo_code, start_date, end_date, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [title, description || null, discount_type, discount_value, promo_code || null, start_date, end_date, image_url || null], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That promo code is already in use' });
            console.error('Error adding deal:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        db.query('SELECT * FROM deals WHERE id = ?', [result.insertId], (err2, rows) => {
            if (err2) {
                console.error('Error fetching created deal:', err2);
                return res.status(201).json({ message: 'Deal created', id: result.insertId });
            }
            logAudit({ req, action: 'CREATE', entityType: 'deal', entityId: result.insertId, description: `Created deal "${title}"` }).catch(err => console.error('Audit log error:', err));
            res.status(201).json(rows[0]);
        });
    });
};

exports.updateDeal = (req, res) => {
    const { id } = req.params;
    const { title, description, discount_type, discount_value, promo_code, start_date, end_date, image_url, active } = req.body;

    if (!title || !discount_type || !discount_value || !start_date || !end_date) {
        return res.status(400).json({ error: 'title, discount_type, discount_value, start_date, and end_date are required' });
    }

    const sql = 'UPDATE deals SET title=?, description=?, discount_type=?, discount_value=?, promo_code=?, start_date=?, end_date=?, image_url=?, active=? WHERE id=?';
    db.query(sql, [title, description || null, discount_type, discount_value, promo_code || null, start_date, end_date, image_url || null, active !== undefined ? active : 1, id], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That promo code is already in use' });
            console.error('Error updating deal:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Deal not found' });
        db.query('SELECT * FROM deals WHERE id = ?', [id], (err2, rows) => {
            if (err2) {
                console.error('Error fetching updated deal:', err2);
                return res.json({ message: 'Deal updated' });
            }
            logAudit({ req, action: 'UPDATE', entityType: 'deal', entityId: id, description: `Updated deal "${title}"` }).catch(err => console.error('Audit log error:', err));
            res.json(rows[0]);
        });
    });
};

exports.deleteDeal = (req, res) => {
    db.query('SELECT * FROM deals WHERE id = ?', [req.params.id], (selectErr, rows) => {
        if (selectErr) {
            console.error('Error fetching deal before deletion:', selectErr);
            return res.status(500).json({ error: 'Database error' });
        }
        if (rows.length === 0) return res.status(404).json({ error: 'Deal not found' });

        db.query('UPDATE deals SET active = 0 WHERE id = ?', [req.params.id], (err, result) => {
            if (err) {
                console.error('Error deleting deal:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Deal not found' });
            logAudit({ req, action: 'DELETE', entityType: 'deal', entityId: req.params.id, description: `Removed deal "${rows[0].title}"` }).catch(err => console.error('Audit log error:', err));
            res.json({ message: 'Deal removed' });
        });
    });
};

exports.restoreDeal = (req, res) => {
    db.query('SELECT * FROM deals WHERE id = ?', [req.params.id], (selectErr, rows) => {
        if (selectErr) {
            console.error('Error fetching deal before restore:', selectErr);
            return res.status(500).json({ error: 'Database error' });
        }
        if (rows.length === 0) return res.status(404).json({ error: 'Deal not found' });

        db.query('UPDATE deals SET active = 1 WHERE id = ?', [req.params.id], (err, result) => {
            if (err) {
                console.error('Error restoring deal:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Deal not found' });
            db.query('SELECT * FROM deals WHERE id = ?', [req.params.id], (err2, updatedRows) => {
                if (err2) return res.json({ message: 'Deal restored' });
                logAudit({ req, action: 'RESTORE', entityType: 'deal', entityId: req.params.id, description: `Restored deal "${updatedRows[0].title}"` }).catch(err => console.error('Audit log error:', err));
                res.json(updatedRows[0]);
            });
        });
    });
};

// Lets the frontend preview a discount before the guest commits to booking
exports.previewPromoCode = async (req, res) => {
    const { code, subtotal } = req.body;

    if (!code || subtotal === undefined) {
        return res.status(400).json({ error: 'code and subtotal are required' });
    }

    try {
        const result = await validateAndApplyPromoCode(code, Number(subtotal));
        res.json({ discount: result.discount, dealTitle: result.deal?.title || null });
    } catch (err) {
        if (err.isPromoError) return res.status(400).json({ error: err.message });
        console.error('Error validating promo code:', err);
        res.status(500).json({ error: 'Database error' });
    }
};
