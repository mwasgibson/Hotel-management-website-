const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createBooking, rescheduleBooking, getBookings, getBooking, cancelBooking, completeBooking, reserveRoom } = require('../controllers/bookingControllers');

router.post('/', authMiddleware, createBooking);
router.put('/:booking_id/reschedule', authMiddleware, rescheduleBooking);
router.post('/reserve', authMiddleware, reserveRoom);
router.get('/', authMiddleware, getBookings);
router.get('/:booking_id', authMiddleware, getBooking);
router.put('/:booking_id/cancel', authMiddleware, cancelBooking);
router.put('/:booking_id/complete', authMiddleware, completeBooking);

module.exports = router;