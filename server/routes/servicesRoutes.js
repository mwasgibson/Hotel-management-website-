const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const allowedRoles = require('../middleware/allowedRoles');
const { getServices, addService, updateService, deleteService, getBookingServices, addServiceToBooking} = require('../controllers/servicesControllers');

router.get('/', getServices);   // public — anyone browsing needs to see prices before booking
router.post('/', authMiddleware, allowedRoles(['admin']), addService);
router.post('/add-to-booking', authMiddleware, addServiceToBooking);
router.get('/booking/:booking_id', authMiddleware, getBookingServices);
router.put('/:id', authMiddleware, allowedRoles(['admin']), updateService);
router.delete('/:id', authMiddleware, allowedRoles(['admin']), deleteService);

module.exports = router;