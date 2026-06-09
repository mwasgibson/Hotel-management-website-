const express = require('express');

const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

router.get('/profile', authMiddleware, profile);

const {
    register,
    login,
    profile
} = require('../controllers/authControllers');

router.post('/register', register);
router.post('/login', login);

module.exports = router;