const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const allowedRoles = require('../middleware/allowedRoles');
const { getServices, addService, updateService, deleteService, getBookingServices, addServiceToBooking} = require('../controllers/servicesControllers');

router.get('/', getServices);   // public — anyone browsing needs to see prices before booking
router.get('/booking/:booking_id', authMiddleware, getBookingServices);
router.post( "/add-to-booking", authMiddleware, addServiceToBooking);
router.post('/', authMiddleware, allowedRoles(['admin']), addService);
router.put('/:id', authMiddleware, allowedRoles(['admin']), updateService);
router.delete('/:id', authMiddleware, allowedRoles(['admin']), deleteService);

router.post('/add-to-booking', authMiddleware, allowedRoles(['receptionist']), addServiceToBooking);

module.exports = router;