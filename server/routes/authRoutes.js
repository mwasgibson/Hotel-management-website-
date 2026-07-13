const express = require('express');

const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../controllers/authControllers');

router.post('/register', adminMiddleware,register);
router.post('/login', adminMiddleware, login);
router.get('/profile', authMiddleware, adminMiddleware, profile);

module.exports = router;