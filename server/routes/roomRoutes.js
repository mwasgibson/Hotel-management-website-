const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const { getRooms, getRoom, addRooms, updateRoom, deleteRoom} = require('../controllers/roomControllers');

router.get('/', authMiddleware, getRooms);
router.get('/:id', authMiddleware, getRoom);
router.post('/', authMiddleware, addRooms);
router.put('/:id', authMiddleware, updateRoom);
router.delete('/:id', authMiddleware, deleteRoom);

module.exports = router;