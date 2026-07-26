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
        const [
            roomStats, bookingStats, revenueResult, checkInsToday, checkOutsToday,
            revenueLast7Days, occupancyLast7Days, upcomingCheckIns, todayReservations
        ] = await Promise.all([
            query('SELECT status, COUNT(*) AS count FROM rooms GROUP BY status'),
            query('SELECT booking_status, COUNT(*) AS count FROM bookings GROUP BY booking_status'),
            query('SELECT SUM(amount) AS total_revenue FROM payments WHERE payment_status = "Paid"'),
            query(`SELECT COUNT(*) AS count FROM bookings WHERE DATE(check_in) = CURDATE() AND booking_status IN ('pending','confirmed')`),
            query(`SELECT COUNT(*) AS count FROM bookings WHERE DATE(check_out) = CURDATE() AND booking_status = 'confirmed'`),

            // Revenue per day, last 7 days
            query(`
                SELECT DATE(payments.created_at) AS day, SUM(payments.amount) AS revenue
                FROM payments
                WHERE payments.payment_status = 'Paid' AND payments.created_at >= (CURDATE() - INTERVAL 6 DAY)
                GROUP BY DATE(payments.created_at)
                ORDER BY day
            `),

            // Rooms occupied per day, last 7 days (a room counts as occupied that day if a confirmed booking spans it)
            query(`
                SELECT d.day, COUNT(DISTINCT bookings.room_number) AS occupied_rooms
                FROM (
                    SELECT CURDATE() - INTERVAL n DAY AS day
                    FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) days
                ) d
                LEFT JOIN bookings ON bookings.booking_status = 'confirmed'
                    AND d.day >= bookings.check_in AND d.day < bookings.check_out
                GROUP BY d.day
                ORDER BY d.day
            `),

            // Next 5 check-ins coming up
            query(`
                SELECT bookings.id, bookings.check_in, bookings.room_number,
                COALESCE(users.fullname, walk_in_guests.fullname) AS guest_name
                FROM bookings
                LEFT JOIN users ON bookings.user_id = users.id
                LEFT JOIN walk_in_guests ON bookings.walk_in_guest_id = walk_in_guests.id
                WHERE bookings.booking_status = 'confirmed' AND bookings.check_in >= CURDATE()
                ORDER BY bookings.check_in ASC
                LIMIT 5
            `),

            query(`SELECT COUNT(*) AS count FROM bookings WHERE DATE(created_at) = CURDATE()`)
        ]);

        res.json({
            rooms: roomStats,
            bookings: bookingStats,
            totalRevenue: revenueResult[0].total_revenue || 0,
            checkInsToday: checkInsToday[0].count,
            checkOutsToday: checkOutsToday[0].count,
            todayReservations: todayReservations[0].count,
            revenueLast7Days,
            occupancyLast7Days,
            upcomingCheckIns
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.getAllUsers = (req, res) => {
    let sql = 'SELECT id, fullname, email, role FROM users ORDER BY id DESC';
    const params = [];

    if (req.user.role === 'receptionist') {
        sql = 'SELECT id, fullname, email, role FROM users WHERE role = ? ORDER BY id DESC';
        params.push('guest');
    }
    // admin gets the unfiltered query above — sees everyone, including other staff

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
};