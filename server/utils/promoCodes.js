const db = require('../config/db');

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

// Throws on an invalid/expired code rather than silently returning 0 discount —
// callers need to distinguish "no code entered" from "code entered but wrong"
async function validateAndApplyPromoCode(code, subtotal) {
    if (!code) return { discount: 0, deal: null };

    const today = new Date().toISOString().slice(0, 10);
    const deals = await query(
        'SELECT * FROM deals WHERE promo_code = ? AND active = 1 AND start_date <= ? AND end_date >= ?',
        [code, today, today]
    );

    if (deals.length === 0) {
        const err = new Error('Invalid or expired promo code');
        err.isPromoError = true;
        throw err;
    }

    const deal = deals[0];
    const discount = deal.discount_type === 'percentage'
        ? subtotal * (deal.discount_value / 100)
        : deal.discount_value;

    return { discount: Math.round(Math.min(discount, subtotal)), deal };   // never discount below zero
}

module.exports = { validateAndApplyPromoCode };