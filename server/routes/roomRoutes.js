const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const allowedRoles = require('../middleware/allowedRoles');

const { getRooms, getRoom, addRooms, updateRoom, deleteRoom, checkIn, checkOut, finishCleaning, startMaintenance, finishMaintenance } = require('../controllers/roomControllers');

router.get('/', getRooms);
router.get('/:id', getRoom);
router.post('/', authMiddleware, adminMiddleware, addRooms);
router.put('/:id', authMiddleware, adminMiddleware, updateRoom);
router.delete('/:id', authMiddleware, adminMiddleware, deleteRoom);
router.patch('/:id/check-in', authMiddleware, allowedRoles(['receptionist']), checkIn);
router.patch('/:id/check-out', authMiddleware, allowedRoles(['receptionist']), checkOut);
router.patch('/:id/cleaning', authMiddleware, allowedRoles(['receptionist']), finishCleaning);
router.patch('/:id/start-maintenance', authMiddleware, allowedRoles(['admin']), startMaintenance);
router.patch('/:id/finish-maintenance', authMiddleware, allowedRoles(['admin']), finishMaintenance);

module.exports = router;