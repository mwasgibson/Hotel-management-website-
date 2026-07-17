const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createBooking, rescheduleBooking, getBookings, getBooking, cancelBooking, completeBooking, reserveRoom } = require('../controllers/bookingControllers');

router.post('/', authMiddleware, createBooking);
router.put('/:room_number/reschedule', authMiddleware, rescheduleBooking);
router.post('/reserve', authMiddleware, reserveRoom);
router.get('/', authMiddleware, getBookings);
router.get('/:room_number', authMiddleware, getBooking);
router.put('/:room_number/cancel', authMiddleware, cancelBooking);
router.put('/:room_number/complete', authMiddleware, completeBooking);

module.exports = router;