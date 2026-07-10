const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    payBookings,
    getPayments
} = require('../controllers/paymentControllers');

router.post('/', authMiddleware, payBookings);
router.get('/', authMiddleware, getPayments);

module.exports = router;