const express = require('express');

const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {register, login, profile} = require('../controllers/authControllers');

router.post('/register',adminMiddleware, register);
router.post('/login',adminMiddleware, login);
router.get('/profile', authMiddleware, profile);
router.post('/logout', logout);

module.exports = router;