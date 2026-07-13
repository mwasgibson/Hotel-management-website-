const adminMiddleware = (req, res, next) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'receptionist') {
        return res.status(403).json({ message: "Admin or receptionist access required" });
    }
    next();
};

module.exports = adminMiddleware;