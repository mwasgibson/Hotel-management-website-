const express = require('express');

const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const { createBooking, getBookings, getBooking, cancelBooking } = require('../controllers/bookingControllers');

router.post('/', authMiddleware, createBooking);
router.get('/', authMiddleware, getBookings);
router.get('/:id', authMiddleware, getBooking);
router.put('/:id', authMiddleware, cancelBooking);

module.exports = router;