const express = require("express");
const router = express.Router();
const{
    createOrder,
    captureOrder
} = require("../controllers/paypalControllers");

router.post('/paypal/create-order', createOrder);
router.post('/paypal/capture_order', captureOrder);

module.exports = router;