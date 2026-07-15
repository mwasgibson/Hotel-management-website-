const express = require('express');

const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const { createBooking, getBookings, getBooking, cancelBooking, completeBooking, reserveRoom, cancelReservation } = require('../controllers/bookingControllers');

router.post('/', authMiddleware, createBooking);
router.get('/', authMiddleware, getBookings);
router.get('/:id', authMiddleware, getBooking);
router.put('/:id', authMiddleware, cancelBooking);
router.put('/:id', authMiddleware, completeBooking);
router.post('/id', authMiddleware, reserveRoom);
router.delete('/:id', authMiddleware, cancelReservation);

module.exports = router;