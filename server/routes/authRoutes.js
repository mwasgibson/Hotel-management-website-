const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { register, login, profile, logout } = require('../controllers/authControllers');
const { authLimiter } = require('../middleware/rateLimiters');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/profile', authMiddleware, profile);
router.post('/logout', logout);

module.exports = router;