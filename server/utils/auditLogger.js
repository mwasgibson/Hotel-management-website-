const db = require('../config/db');

const logAudit = ({ req, action, entityType = null, entityId = null, description }) => {
    return new Promise((resolve, reject) => {
        const ipAddress =
            req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
            req?.socket?.remoteAddress ||
            null;

        db.query(
            `INSERT INTO audit_logs
            (user_id, action, entity_type, entity_id, description, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                req?.user?.id || null,
                action,
                entityType,
                entityId,
                description,
                ipAddress
            ],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

module.exports = logAudit;
