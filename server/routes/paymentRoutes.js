const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    payBookings,
    getPayments
} = require('../controllers/paymentControllers');

router.post('/payments', authMiddleware, payBookings);
router.get('/payments', authMiddleware, getPayments);

module.exports = router;