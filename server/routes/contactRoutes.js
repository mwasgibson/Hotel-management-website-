const express = require('express');
const router = express.Router();
const { submitContact } = require('../controllers/contactControllers');

router.post('/', submitContact);

module.exports = router;