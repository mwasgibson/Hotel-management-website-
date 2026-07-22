const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const allowedRoles = require('../middleware/allowedRoles');
const { payBookings, getPayments, confirmCashPayment, getPaymentStatus, getAllPendingCashPayments } = require('../controllers/paymentControllers');

router.post('/', authMiddleware, payBookings);
router.get('/', authMiddleware, getPayments);
router.get('/status/:booking_id', authMiddleware, getPaymentStatus);
router.get('/pending-cash', authMiddleware, allowedRoles(['admin', 'receptionist']), getAllPendingCashPayments);
router.patch('/:id/confirm-cash', authMiddleware, allowedRoles(['admin', 'receptionist']), confirmCashPayment);

module.exports = router;