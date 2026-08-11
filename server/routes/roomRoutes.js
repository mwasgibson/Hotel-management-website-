const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const allowedRoles = require('../middleware/allowedRoles');

const { getRooms, getRoom, getRoomQuote, addRooms, updateRoom, deleteRoom, restoreRoom, checkIn, checkOut, finishCleaning, startMaintenance, finishMaintenance } = require('../controllers/roomControllers');

router.get('/', getRooms);
router.get('/:room_number', getRoom);
router.get('/:room_number/quote', getRoomQuote);
router.post('/', authMiddleware, adminMiddleware, allowedRoles(['admin']), addRooms);
router.put('/:room_number', authMiddleware, adminMiddleware, allowedRoles(['admin']), updateRoom);
router.delete('/:room_number', authMiddleware, adminMiddleware, allowedRoles(['admin']), deleteRoom);
router.patch('/:room_number/restore', authMiddleware, adminMiddleware, allowedRoles(['admin']), restoreRoom);
router.patch('/:room_number/check-in', authMiddleware, allowedRoles(['receptionist']), checkIn);
router.patch('/:room_number/check-out', authMiddleware, allowedRoles(['receptionist']), checkOut);
router.patch('/:room_number/cleaning', authMiddleware, allowedRoles(['receptionist']), finishCleaning);
router.patch('/:room_number/start-maintenance', authMiddleware, allowedRoles(['admin']), startMaintenance);
router.patch('/:room_number/finish-maintenance', authMiddleware, allowedRoles(['admin']), finishMaintenance);

module.exports = router;