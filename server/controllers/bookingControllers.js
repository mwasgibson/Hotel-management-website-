const db = require('../config/db');
const { calculateDynamicPrice } = require('../utils/dynamicPricing');
const sendEmail = require('../utils/sendEmail');
const { attachServicesToBooking } = require('../utils/bookingServices');
const { validateAndApplyPromoCode } = require('../utils/promoCodes');

exports.createBooking = (req, res) => {
    const user_id = req.user.id; 
    const { room_number, check_in, check_out } = req.body;
    const { services } = req.body;
    const { services, promo_code } = req.body;

    if (!room_number || !check_in || !check_out) {
        return res.status(400).json({ error: 'room_number, check_in, and check_out are required' });
    }

    const start = new Date(check_in);
    const end = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ error: 'Invalid date format' });
    }
    if (start < today) {
        return res.status(400).json({ error: 'Check-in date cannot be in the past' });
    }
    if (end <= start) {
        return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }

    const roomSql = 'SELECT * FROM rooms WHERE TRIM(room_number) = ?';
    db.query(roomSql, [room_number], (err, roomResults) => {
        if (err) {
            console.error('Error fetching room:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (roomResults.length === 0) {
                return res.status(404).json({ error: 'Room not found' });
            }

        const conflictSql = 'SELECT * FROM bookings WHERE room_number = ? AND booking_status IN ("pending", "confirmed") AND (check_in < ? AND check_out > ?)';
        db.query(conflictSql, [room_number, check_out, check_in], async (err, conflictResults) => {
            if (err) {
                console.error('Error checking booking conflicts:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            if (conflictResults.length > 0) {
                return res.status(400).json({ error: 'Room is already booked for the selected dates' });
            }            

            const room = roomResults[0]; 
        
            if (roomResults[0].status !== 'available') {
                return res.status(400).json({ error: `Room is currently ${roomResults[0].status}` });
            }

            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
            let total_amount;
            try {
                const pricing = await calculateDynamicPrice(room.price, start);
                total_amount = pricing.adjustedPrice * days;
            } catch (pricingErr) {
                console.error('Error calculating dynamic price:', pricingErr);
                total_amount = room.price * days;   // fall back to flat pricing
            }

            const bookingSql = 'INSERT INTO bookings (user_id, room_number, check_in, check_out, total_amount) VALUES (?, ?, ?, ?, ?)';
                db.query(bookingSql, [user_id, room_number, start, end, total_amount], async (err, bookingResults) => {
                    if (err) {
                        console.error('Error creating booking:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    db.query("UPDATE rooms SET status = 'reserved' WHERE room_number = ?", [room_number], (err) => {
                        if (err) console.error('Error updating room status:', err);
                    });

                    let servicesTotal = 0;
                    try {
                        servicesTotal = await attachServicesToBooking(bookingResults.insertId, services);
                    } catch (serviceErr) {
                        console.error('Error attaching services:', serviceErr);
                        // don't fail the booking over this — the room booking itself is what matters most
                    }

                    const subtotalBeforeDiscount = total_amount + servicesTotal;

                    let discount = 0;
                    try {
                        const promoResult = await validateAndApplyPromoCode(promo_code, subtotalBeforeDiscount);
                        discount = promoResult.discount;
                    } catch (promoErr) {
                        if (promoErr.isPromoError) {
                            return res.status(400).json({ error: promoErr.message });   // bad code — reject the whole booking rather than silently ignoring it
                        }
                        console.error('Error applying promo code:', promoErr);
                    }

                    const finalTotal = subtotalBeforeDiscount - discount;
                    db.query('UPDATE bookings SET total_amount = ?, promo_code_used = ? WHERE id = ?', [finalTotal, promo_code || null, bookingResults.insertId], (err) => {
                        if (err) console.error('Error updating total with promo code:', err);
                    });   

                    sendEmail({
                        to: req.user.email,
                        subject: 'Booking Confirmation',
                        html: `
                        <p>Hi,</p>
                        <p>Your booking has been created:</p>
                        <ul>
                        <li>Room: ${room_number}</li>
                        <li>Check-in: ${check_in}</li>
                        <li>Check-out: ${check_out}</li>
                        <li>Total: KES ${total_amount}</li>
                        </ul>
                        <p>Please complete payment to confirm your stay.</p>
                        `
                    });

                    res.status(201).json({ message: 'Booking created successfully', bookingId: bookingResults.insertId, total_amount: finalTotal });
                }
            );
        });
    });
}

exports.rescheduleBooking = (req, res) => {
    const user_id = req.user.id;
    const booking_id = req.params.booking_id;
    const { check_in, check_out } = req.body;

    if (!check_in || !check_out) {
        return res.status(400).json({ error: 'check_in and check_out are required' });
    }

    const start = new Date(check_in);
    const end = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start) || isNaN(end)) return res.status(400).json({ error: 'Invalid date format' });
    if (start < today) return res.status(400).json({ error: 'Check-in date cannot be in the past' });
    if (end <= start) return res.status(400).json({ error: 'Check-out date must be after check-in date' });

    db.query('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [booking_id, user_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'Booking not found' });

        const booking = results[0];
        if (booking.booking_status !== 'pending') {
            return res.status(400).json({ error: 'Only unpaid bookings can be rescheduled — cancel and rebook instead' });
        }

        // find OTHER bookings on the same room (excluding this one) that overlap the new dates
        const conflictSql = 'SELECT * FROM bookings WHERE room_number = ? AND id != ? AND booking_status IN ("pending", "confirmed") AND (check_in < ? AND check_out > ?)';
        db.query(conflictSql, [booking.room_number, booking_id, check_out, check_in], (err, conflicts) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (conflicts.length > 0) {
                return res.status(400).json({ error: 'Room is already booked for the selected dates' });
            }

            db.query('SELECT price FROM rooms WHERE room_number = ?', [booking.room_number], async (err, roomResults) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                if (roomResults.length === 0) return res.status(404).json({ error: 'Room not found' });

                const room = roomResults[0];
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

                let total_amount;
                try {
                    const pricing = await calculateDynamicPrice(room.price, start);
                    total_amount = pricing.adjustedPrice * days;
                } catch (pricingErr) {
                    console.error('Error calculating dynamic price:', pricingErr);
                    total_amount = room.price * days;
                }

                db.query('UPDATE bookings SET check_in = ?, check_out = ?, total_amount = ? WHERE id = ?', [start, end, total_amount, booking_id], (err) => {
                    if (err) return res.status(500).json({ error: 'Database error' });
                    res.json({ message: 'Booking rescheduled', total_amount });
                });
            });
        });
    });
};

exports.reserveRoom = (req, res) => {
    const user_id = req.user.id;  
    const { room_number, check_in, check_out } = req.body;

    if (!room_number || !check_in || !check_out) {
        return res.status(400).json({ error: 'room_number, check_in, and check_out are required' });
    }

    const start = new Date(check_in);
    const end = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ error: 'Invalid date format' });
    }
    if (start < today) {
        return res.status(400).json({ error: 'Check-in date cannot be in the past' });
    }
    if (end <= start) {
        return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }

    db.query("SELECT * FROM rooms WHERE room_number = ?", [room_number], (err, rooms) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (rooms.length === 0) return res.status(404).json({ error: 'Room not found' });
        if (rooms[0].status !== 'available') {
            return res.status(400).json({ error: `Room is currently ${rooms[0].status}` });
        }

        const conflictSql = 'SELECT * FROM bookings WHERE room_number = ? AND booking_status IN ("pending", "confirmed") AND (check_in < ? AND check_out > ?)';
        db.query(conflictSql, [room_number, check_out, check_in], async (err, conflicts) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (conflicts.length > 0) {
                return res.status(400).json({ error: 'Room is already booked for the selected dates' });
            }

            const room = rooms[0];
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

            let total_amount;
            try {
                const pricing = await calculateDynamicPrice(room.price, start);
                total_amount = pricing.adjustedPrice * days;
            } catch (pricingErr) {
                console.error('Error calculating dynamic price:', pricingErr);
                total_amount = room.price * days;
            }

            const sql = 'INSERT INTO bookings (user_id, room_number, check_in, check_out, total_amount) VALUES (?, ?, ?, ?, ?)';
            db.query(sql, [user_id, room_number, start, end, total_amount], async (err, result) => {
                if (err) {
                    console.error('Error creating reservation:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                // Room is held immediately — this is what makes it a "reservation" rather than a plain booking
                db.query("UPDATE rooms SET status = 'reserved' WHERE room_number = ?", [room_number], (err) => {
                    if (err) console.error('Error updating room status:', err);
                });

                let servicesTotal = 0;
                    try {
                        servicesTotal = await attachServicesToBooking(result.insertId, services);
                    } catch (serviceErr) {
                        console.error('Error attaching services:', serviceErr);
                        // don't fail the reservation over this — the room reservation itself is what matters most
                    }

                    const subtotalBeforeDiscount = total_amount + servicesTotal;

                    let discount = 0;
                    try {
                        const promoResult = await validateAndApplyPromoCode(promo_code, subtotalBeforeDiscount);
                        discount = promoResult.discount;
                    } catch (promoErr) {
                        if (promoErr.isPromoError) {
                            return res.status(400).json({ error: promoErr.message });   // bad code — reject the whole booking rather than silently ignoring it
                        }
                        console.error('Error applying promo code:', promoErr);
                    }

                    const finalTotal = subtotalBeforeDiscount - discount;
                    db.query('UPDATE bookings SET total_amount = ?, promo_code_used = ? WHERE id = ?', [finalTotal, promo_code || null, bookingResults.insertId], (err) => {
                        if (err) console.error('Error updating total with promo code:', err);
                    });    

                    sendEmail({
                        to: req.user.email,
                        subject: 'Booking Confirmation',
                        html: `
                        <p>Hi,</p>
                        <p>Your reservation has been created:</p>
                        <ul>
                        <li>Room: ${room_number}</li>
                        <li>Check-in: ${check_in}</li>
                        <li>Check-out: ${check_out}</li>
                        <li>Total: KES ${total_amount}</li>
                        </ul>
                        <p>Please complete payment to confirm your reservation.</p>
                        `
                    });

                    res.status(201).json({ message: 'Reservation created successfully', bookingId: result.insertId, total_amount: finalTotal });
                }
            );
        });
    });
}

exports.completeBooking = (req, res) => {
    const bookingId = req.params.booking_id;

    db.query('SELECT room_number FROM bookings WHERE id = ?', [bookingId], (err, booking) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (booking.length === 0) return res.status(404).json({ error: 'Booking not found' });

        const roomNumber = booking[0].room_number;

        db.query("UPDATE bookings SET booking_status='completed' WHERE id=?", [bookingId], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            db.query("UPDATE rooms SET status = 'available' WHERE room_number = ?", [roomNumber], (err) => {
                if (err) console.error('Error releasing room:', err);
            });

            res.json({ message: "Booking completed." });
        });
    });
};

exports.getBookings = (req, res) => {
    const user_id = req.user.id;

    const sql = 'SELECT bookings.*, rooms.room_type, rooms.status FROM bookings JOIN rooms ON bookings.room_number = rooms.room_number WHERE bookings.user_id = ?';
    db.query(sql, [user_id], (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
};

exports.getBooking = (req, res) => {
    const user_id = req.user.id;
    const booking_id = req.params.booking_id;

    const sql = 'SELECT * FROM bookings WHERE id = ? AND user_id = ?';
    db.query(sql, [booking_id, user_id],
        (err, results) => {
        if (err) {
            console.error('Error fetching booking:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json(results[0]);
    });
};

exports.getAllBookings = (req, res) => {
    const { status, guest, check_in, check_out } = req.query;

    let sql = `
        SELECT bookings.*, rooms.room_type, rooms.status AS room_status,
            COALESCE(users.fullname, walk_in_guests.fullname) AS fullname,
            COALESCE(users.email, walk_in_guests.email) AS email,
            walk_in_guests.phone AS walk_in_phone,
            CASE WHEN bookings.walk_in_guest_id IS NOT NULL THEN 1 ELSE 0 END AS is_walk_in
        FROM bookings
        JOIN rooms ON bookings.room_number = rooms.room_number
        LEFT JOIN users ON bookings.user_id = users.id
        LEFT JOIN walk_in_guests ON bookings.walk_in_guest_id = walk_in_guests.id
        WHERE 1=1
    `;
    const params = [];

    if (status) { sql += ' AND bookings.booking_status = ?'; params.push(status); }
    if (guest) {
        sql += ' AND (COALESCE(users.fullname, walk_in_guests.fullname) LIKE ? OR COALESCE(users.email, walk_in_guests.email) LIKE ?)';
        params.push(`%${guest}%`, `%${guest}%`);
    }
    if (check_in) { sql += ' AND bookings.check_in >= ?'; params.push(check_in); }
    if (check_out) { sql += ' AND bookings.check_out <= ?'; params.push(check_out); }

    sql += ' ORDER BY bookings.check_in DESC';

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching all bookings:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
};

exports.cancelBooking = (req, res) => {
    const user_id = req.user.id;
    const booking_id = req.params.booking_id;

    const bookingSql = 'SELECT * FROM bookings WHERE id = ? AND user_id = ?';
    db.query(bookingSql, [booking_id, user_id], (err, bookingResults) => {
        if (err) {
            console.error('Error fetching booking:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (bookingResults.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingResults[0];

        db.query("UPDATE rooms SET status = 'available' WHERE room_number = ?", [booking.room_number], (err) => {
            if (err) {
                console.error('Error updating room status:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            db.query("UPDATE bookings SET booking_status = ? WHERE id = ? AND user_id = ?", ['cancelled', booking_id, user_id], (err) => {
                if (err) {
                    console.error('Error updating booking status:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

            sendEmail({
                    to: req.user.email,
                    subject: 'Booking Confirmation',
                    html: `
                    <p>Hi,</p>
                    <p>Your booking has been cancelled:</p>
                    <ul>
                    <li>Room: ${booking.room_number}</li>
                    <li>Check-in: ${booking.check_in}</li>
                    <li>Check-out: ${booking.check_out}</li>
                    <li>Total: KES ${booking.total_amount}</li>
                    </ul>
                    `
                });

                res.status(201).json({ message: 'Booking cancelled successfully' });
            });
        });
    });
};