const logAudit = require('../utils/auditLogger');

const ACTIONS = {
    create: 'CREATE',
    reserve: 'RESERVE',
    reschedule: 'RESCHEDULE',
    cancel: 'CANCEL',
    complete: 'COMPLETE'
};

const bookingAudit = (actionKey) => (req, res, next) => {
    let responseBody = null;
    const originalJson = res.json.bind(res);

    res.json = (body) => {
        responseBody = body;
        return originalJson(body);
    };

    res.on('finish', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return;

        const bookingId =
            req.params?.booking_id ||
            responseBody?.bookingId ||
            null;

        const roomNumber = req.body?.room_number || null;
        const action = ACTIONS[actionKey] || actionKey.toUpperCase();

        const description = bookingId
            ? `${action} booking #${bookingId}${roomNumber ? ` for room ${roomNumber}` : ''}`
            : `${action} booking${roomNumber ? ` for room ${roomNumber}` : ''}`;

        logAudit({
            req,
            action,
            entityType: 'booking',
            entityId: bookingId,
            description
        }).catch(err => {
            console.error('Booking audit log error:', err);
        });
    });

    next();
};

module.exports = bookingAudit;
