const db = require('../config/db');

const moveToTrash = ({ entityType, entityId, entityData, deletedBy = null }) => {
    return new Promise((resolve, reject) => {
        db.query(
            `INSERT INTO trash
            (entity_type, entity_id, entity_data, deleted_by)
            VALUES (?, ?, ?, ?)`,
            [entityType, entityId, JSON.stringify(entityData), deletedBy],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

module.exports = moveToTrash;
