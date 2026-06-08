const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

const token = authHeader && authHeader.split(' ')[1];

try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();

} catch (err) {
    res.status(400).json({ error: 'Invalid token.' });
};
