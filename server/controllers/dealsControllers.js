const db = require('../config/db');
const { validateAndApplyPromoCode } = require('../utils/promoCodes');

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
        res.status(201).json({ message: 'Deal created', id: result.insertId });
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
        res.json({ message: 'Deal updated' });
    });
};

exports.deleteDeal = (req, res) => {
    db.query('UPDATE deals SET active = 0 WHERE id = ?', [req.params.id], (err, result) => {
        if (err) {
            console.error('Error deleting deal:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Deal not found' });
        res.json({ message: 'Deal removed' });
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