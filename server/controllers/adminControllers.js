const db = require('../config/db');

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

exports.getStats = async (req, res) => {
    try {
        const [roomStats, bookingStats, revenueResult, checkInsToday, checkOutsToday] = await Promise.all([
            query('SELECT status, COUNT(*) AS count FROM rooms GROUP BY status'),
            query('SELECT booking_status, COUNT(*) AS count FROM bookings GROUP BY booking_status'),
            query('SELECT SUM(amount) AS total_revenue FROM payments WHERE payment_status = "Paid"'),
            query(`SELECT COUNT(*) AS count FROM bookings WHERE DATE(check_in) = CURDATE() AND booking_status IN ('pending','confirmed')`),
            query(`SELECT COUNT(*) AS count FROM bookings WHERE DATE(check_out) = CURDATE() AND booking_status = 'confirmed'`)
        ]);

        res.json({
            rooms: roomStats,
            bookings: bookingStats,
            totalRevenue: revenueResult[0].total_revenue || 0,
            checkInsToday: checkInsToday[0].count,
            checkOutsToday: checkOutsToday[0].count
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.getAllUsers = (req, res) => {
    db.query('SELECT id, fullname, email, role FROM users ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
};