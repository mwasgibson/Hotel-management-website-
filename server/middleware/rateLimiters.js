const rateLimit = require('express-rate-limit');

// General API limiter — generous, just stops abuse/scraping
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 300,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

// Strict limiter for login/register — this is what actually stops brute-force password guessing
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { apiLimiter, authLimiter };