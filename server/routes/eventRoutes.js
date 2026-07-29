const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const allowedRoles = require('../middleware/allowedRoles');

const {
    getEventSpaces, getEventSpace, getEventSpaceAvailability,
    addEventSpace, updateEventSpace, deleteEventSpace
} = require('../controllers/eventSpaceControllers');

const {
    requestEventBooking, getMyEventBookings, getAllEventBookings,
    sendQuote, confirmEventBooking, cancelEventBooking, confirmEventPayment
} = require('../controllers/eventBookingControllers');

// Spaces
router.get('/spaces', getEventSpaces);
router.post('/spaces', authMiddleware, allowedRoles(['admin']), addEventSpace);
router.get('/spaces/:id', getEventSpace);
router.put('/spaces/:id', authMiddleware, allowedRoles(['admin']), updateEventSpace);
router.delete('/spaces/:id', authMiddleware, allowedRoles(['admin']), deleteEventSpace);
router.get('/spaces/:id/availability', getEventSpaceAvailability);

// Bookings
router.post('/bookings', authMiddleware, requestEventBooking);;
router.get('/bookings', authMiddleware, allowedRoles(['admin', 'receptionist']), getAllEventBookings);
router.get('/bookings/mine', authMiddleware, getMyEventBookings)
router.patch('/bookings/:id/quote', authMiddleware, allowedRoles(['admin', 'receptionist']), sendQuote);
router.patch('/bookings/:id/confirm', authMiddleware, confirmEventBooking);
router.patch('/bookings/:id/cancel', authMiddleware, cancelEventBooking);
router.patch('/bookings/:id/confirm-payment', authMiddleware, allowedRoles(['admin', 'receptionist']), confirmEventPayment);

module.exports = router;