const express = require('express');
const router = express.Router();
const {stkPush, callback} = require('../controllers/mpesaControllers');

router.post('/stkpush', stkPush);
router.post('/callback', callback);

module.exports = router;