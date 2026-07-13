const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const { getRooms, getRoom, addRooms, updateRoom, deleteRoom} = require('../controllers/roomControllers');

router.get('/', getRooms);
router.get('/:id', getRoom);
router.post('/', authMiddleware, adminMiddleware, addRooms);
router.put('/:id', authMiddleware, adminMiddleware, updateRoom);
router.delete('/:id', authMiddleware, adminMiddleware, deleteRoom);

module.exports = router;