const db = require('../config/db');

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

// Update these to match your hotel's actual busy periods.
// MM-DD format, checked against check_in's month/day — repeats every year automatically.
const PEAK_SEASONS = [
    { name: 'End of year holidays', startMonthDay: '12-15', endMonthDay: '01-05', multiplier: 1.3 },
    { name: 'Easter season', startMonthDay: '03-25', endMonthDay: '04-05', multiplier: 1.15 }
];

const MIN_MULTIPLIER = 0.85;
const MAX_MULTIPLIER = 1.5;

function isInSeasonWindow(checkInDate, season) {
    const monthDay = String(checkInDate.getMonth() + 1).padStart(2, '0') + '-' + String(checkInDate.getDate()).padStart(2, '0');
    if (season.startMonthDay <= season.endMonthDay) {
        return monthDay >= season.startMonthDay && monthDay <= season.endMonthDay;
    }
    return monthDay >= season.startMonthDay || monthDay <= season.endMonthDay; // window wraps across New Year
}

function getSeasonMultiplier(checkInDate) {
    for (const season of PEAK_SEASONS) {
        if (isInSeasonWindow(checkInDate, season)) {
            return { multiplier: season.multiplier, reason: season.name };
        }
    }
    return { multiplier: 1, reason: null };
}

function getLeadTimeMultiplier(checkInDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilCheckIn = Math.ceil((checkInDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilCheckIn <= 2) return { multiplier: 1.2, reason: 'Last-minute booking' };
    if (daysUntilCheckIn >= 60) return { multiplier: 0.9, reason: 'Early-bird discount' };
    return { multiplier: 1, reason: null };
}

async function getOccupancyMultiplier() {
    const rows = await query('SELECT status, COUNT(*) AS count FROM rooms GROUP BY status');
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    if (total === 0) return { multiplier: 1, reason: null, occupancyRate: 0 };

    const occupied = rows
        .filter(r => r.status === 'occupied' || r.status === 'reserved')
        .reduce((sum, r) => sum + r.count, 0);

    const occupancyRate = occupied / total;

    if (occupancyRate >= 0.85) return { multiplier: 1.25, reason: 'High demand', occupancyRate };
    if (occupancyRate <= 0.3) return { multiplier: 0.9, reason: 'Low demand', occupancyRate };
    return { multiplier: 1, reason: null, occupancyRate };
}

async function calculateDynamicPrice(basePrice, checkInDate) {
    const checkIn = new Date(checkInDate);

    const season = getSeasonMultiplier(checkIn);
    const leadTime = getLeadTimeMultiplier(checkIn);
    const occupancy = await getOccupancyMultiplier();

    let combinedMultiplier = season.multiplier * leadTime.multiplier * occupancy.multiplier;
    combinedMultiplier = Math.min(Math.max(combinedMultiplier, MIN_MULTIPLIER), MAX_MULTIPLIER);

    const adjustedPrice = Math.round(basePrice * combinedMultiplier);
    const appliedReasons = [season.reason, leadTime.reason, occupancy.reason].filter(Boolean);

    return {
        basePrice,
        adjustedPrice,
        multiplier: Number(combinedMultiplier.toFixed(2)),
        occupancyRate: Number((occupancy.occupancyRate * 100).toFixed(0)),
        appliedReasons
    };
}

module.exports = { calculateDynamicPrice };