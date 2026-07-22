const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createOrder, captureOrder } = require("../controllers/paypalControllers");

router.post('/create-order', authMiddleware, createOrder);
router.post('/capture-order', authMiddleware, captureOrder);

module.exports = router;