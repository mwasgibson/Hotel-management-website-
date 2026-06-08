const express = require('express');
const router = express.Router();

const { getRooms, getRoom, addRooms, updateRoom, deleteRoom} = require('../controllers/roomControllers');

router.get('/', getRooms);
router.get('//:id', getRoom);
router.post('/', addRooms);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

module.exports = router;