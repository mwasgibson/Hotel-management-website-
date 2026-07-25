const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createBooking, rescheduleBooking, getBookings, getBooking, cancelBooking, completeBooking, reserveRoom } = require('../controllers/bookingControllers');
const {getAllPendingManualPayments, confirmManualPayment} = require('../controllers/paymentControllers')
const { createWalkInBooking } = require('../controllers/walkInControllers');
const allowedRoles = require('../middleware/allowedRoles');

router.post('/', authMiddleware, createBooking);
router.put('/:booking_id/reschedule', authMiddleware, rescheduleBooking);
router.post('/reserve', authMiddleware, reserveRoom);
router.get('/', authMiddleware, getBookings);
router.get('/:booking_id', authMiddleware, getBooking);
router.put('/:booking_id/cancel', authMiddleware, cancelBooking);
router.put('/:booking_id/complete', authMiddleware, allowedRoles(['receptionist']), completeBooking);
router.get('/pending-manual', authMiddleware, allowedRoles(['admin', 'receptionist']), getAllPendingManualPayments);
router.patch('/:id/confirm-manual', authMiddleware, allowedRoles(['admin', 'receptionist']), confirmManualPayment);

module.exports = router;