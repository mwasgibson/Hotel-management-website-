const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const allowedRoles = require('../middleware/allowedRoles');

const { getStats, getAllUsers } = require('../controllers/adminControllers');
const { getAllBookings } = require('../controllers/bookingControllers');

router.get('/stats', authMiddleware, allowedRoles(['admin', 'receptionist']), getStats);
router.get('/bookings', authMiddleware, allowedRoles(['admin', 'receptionist']), getAllBookings);
router.get('/users', authMiddleware, allowedRoles(['admin', 'receptionist']), getAllUsers);   // guest list stays admin & receptionist-only

module.exports = router;