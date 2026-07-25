const db = require('../config/db');
const { calculateDynamicPrice } = require('../utils/dynamicPricing');

exports.createWalkInBooking = async (req, res) => {
    const { fullname, phone, email, room_number, check_in, check_out, payment_method, payment_received } = req.body;
    const { services } = req.body;

    if (!fullname || !phone || !room_number || !check_in || !check_out || !payment_method) {
        return res.status(400).json({ error: 'fullname, phone, room_number, check_in, check_out, and payment_method are required' });
    }
    if (!['cash', 'card', 'mpesa'].includes(payment_method)) {
        return res.status(400).json({ error: 'Walk-in payment_method must be cash, card or mpesa' });
    }

    const start = new Date(check_in);
    const end = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start) || isNaN(end)) return res.status(400).json({ error: 'Invalid date format' });
    if (start < today) return res.status(400).json({ error: 'Check-in date cannot be in the past' });
    if (end <= start) return res.status(400).json({ error: 'Check-out date must be after check-in date' });

    db.query('SELECT * FROM rooms WHERE room_number = ?', [room_number], (err, roomResults) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (roomResults.length === 0) return res.status(404).json({ error: 'Room not found' });
        if (roomResults[0].status !== 'available') {
            return res.status(400).json({ error: `Room is currently ${roomResults[0].status}` });
        }

        const conflictSql = 'SELECT * FROM bookings WHERE room_number = ? AND booking_status IN ("pending", "confirmed") AND (check_in < ? AND check_out > ?)';
        db.query(conflictSql, [room_number, check_out, check_in], async (err, conflicts) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (conflicts.length > 0) return res.status(400).json({ error: 'Room is already booked for the selected dates' });

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

            db.query('INSERT INTO walk_in_guests (fullname, phone, email) VALUES (?, ?, ?)', [fullname, phone, email || null], (err, guestResult) => {
                if (err) {
                    console.error('Error creating walk-in guest:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                const walkInGuestId = guestResult.insertId;
                const bookingStatus = payment_received ? 'confirmed' : 'pending';

                const bookingSql = 'INSERT INTO bookings (walk_in_guest_id, room_number, check_in, check_out, total_amount, booking_status) VALUES (?, ?, ?, ?, ?, ?)';
                db.query(bookingSql, [walkInGuestId, room_number, start, end, total_amount, bookingStatus], async (err, bookingResult) => {
                    if (err) {
                        console.error('Error creating walk-in booking:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }

                    const bookingId = bookingResult.insertId;

                    db.query("UPDATE rooms SET status = 'reserved' WHERE room_number = ?", [room_number], (err) => {
                        if (err) console.error('Error updating room status:', err);
                    });

                    db.query('INSERT INTO payments (booking_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?)',
                        [bookingId, total_amount, payment_method, payment_received ? 'paid' : 'pending'], (err) => {
                            if (err) console.error('Error recording walk-in payment:', err);
                        });

                    let servicesTotal = 0;
                    try {
                        servicesTotal = await attachServicesToBooking(bookingId, services);
                    } catch (serviceErr) {
                        console.error('Error attaching services:', serviceErr);
                    }

                    const finalTotal = total_amount + servicesTotal;
                    if (servicesTotal > 0) {
                        db.query('UPDATE bookings SET total_amount = ? WHERE id = ?', [finalTotal, bookingId], (err) => {
                        if (err) console.error('Error updating total with services:', err);
                        });
                    }    

                    res.status(201).json({ message: 'Walk-in reservation created', bookingId, total_amount: finalTotal, booking_status: bookingStatus, guest: { fullname, phone } });
                });
            });
        });
    });
};