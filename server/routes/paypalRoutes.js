const express = require("express");
const router = express.Router();
const{
    createOrder,
    captureOrder
} = require("../controllers/paypalControllers");

router.post('/create-order', createOrder);
router.post('/capture_order', captureOrder);

module.exports = router;