const db = require('../config/db');

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

// service_ids: array of { service_id, quantity } — quantity defaults to 1 if omitted
async function attachServicesToBooking(bookingId, serviceSelections) {
    if (!serviceSelections || serviceSelections.length === 0) {
        return 0;
    }

    const ids = serviceSelections.map(s => s.service_id);
    const placeholders = ids.map(() => '?').join(',');
    const services = await query(`SELECT * FROM services WHERE id IN (${placeholders}) AND active = 1`, ids);

    if (services.length === 0) return 0;

    const serviceMap = {};
    services.forEach(s => serviceMap[s.id] = s);

    let servicesTotal = 0;

    for (const selection of serviceSelections) {
        const service = serviceMap[selection.service_id];
        if (!service) continue;   // ignore unknown/inactive service ids rather than failing the whole booking

        const quantity = Math.max(1, parseInt(selection.quantity) || 1);
        const lineTotal = service.price * quantity;
        servicesTotal += lineTotal;

        await query(
            'INSERT INTO booking_services (booking_id, service_id, quantity, price_at_booking) VALUES (?, ?, ?, ?)',
            [bookingId, service.id, quantity, service.price]
        );
    }

    return servicesTotal;
}

module.exports = { attachServicesToBooking };