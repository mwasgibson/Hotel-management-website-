const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { register, login, profile, logout } = require('../controllers/authControllers');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, profile);
router.post('/logout', logout);

module.exports = router;