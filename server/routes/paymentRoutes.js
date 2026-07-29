const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const allowedRoles = require('../middleware/allowedRoles');
const { payBookings, getPayments, confirmManualPayment, getPaymentStatus, getAllPendingManualPayments } = require('../controllers/paymentControllers');

router.post('/', authMiddleware, payBookings);
router.get('/', authMiddleware, getPayments);
router.get('/pending-manual', authMiddleware, allowedRoles(['admin', 'receptionist']), getAllPendingManualPayments);
router.get('/status/:booking_id', authMiddleware, getPaymentStatus);
router.patch('/:id/confirm-manual', authMiddleware, allowedRoles(['admin', 'receptionist']), confirmManualPayment);

module.exports = router;