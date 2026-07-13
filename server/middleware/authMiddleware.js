const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    ); req.cookies.token || req.headers.authorization?.split(" ")[1];
    const authHeader = req.headers.authorization;

    if (!authHeader && !token) {
        return res.status(401).json({
            message: "No token provided"
        });
    }

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid token"
        });

    }
};

module.exports = authMiddleware;