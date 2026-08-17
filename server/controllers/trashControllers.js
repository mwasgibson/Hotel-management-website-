const db = require("../config/db");

const RESTORABLE_ENTITIES = {
  blog_post: {
    table: "blog_posts",
    idColumn: "id",
  },
  setting: {
    table: "settings",
    idColumn: "id",
  },
};

// Get deleted items
exports.getTrash = (req, res) => {
  db.query(
    `SELECT
            t.*,
            u.fullname AS deleted_by_name
         FROM trash t
         LEFT JOIN users u ON t.deleted_by = u.id
         WHERE t.status = 'deleted'
         ORDER BY t.deleted_at DESC`,
    (err, results) => {
      if (err) {
        console.error("Error fetching trash:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json(results);
    },
  );
};

// Get one trash item
exports.getTrashItem = (req, res) => {
  db.query(
    `SELECT
            t.*,
            u.fullname AS deleted_by_name
         FROM trash t
         LEFT JOIN users u ON t.deleted_by = u.id
         WHERE t.id = ?`,
    [req.params.id],
    (err, results) => {
      if (err) {
        console.error("Error fetching trash item:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({
          error: "Trash item not found",
        });
      }

      res.json(results[0]);
    },
  );
};

// Restore an item from trash
exports.restoreTrashItem = (req, res) => {
  const trashId = req.params.id;

  db.query(
    "SELECT * FROM trash WHERE id = ? AND status = ?",
    [trashId, "deleted"],
    (err, results) => {
      if (err) {
        console.error("Error fetching trash item for restore:", err);
        return res.status(500).json({
          error: "Database error",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          error: "Trash item not found or already restored",
        });
      }

      const trashItem = results[0];
      const entity = RESTORABLE_ENTITIES[trashItem.entity_type];

      if (!entity) {
        return res.status(400).json({
          error: `Restoring '${trashItem.entity_type}' is not supported yet`,
        });
      }

      let entityData;

      try {
        entityData =
          typeof trashItem.entity_data === "string"
            ? JSON.parse(trashItem.entity_data)
            : trashItem.entity_data;
      } catch (parseError) {
        console.error("Error parsing trash entity data:", parseError);

        return res.status(500).json({
          error: "Invalid stored entity data",
        });
      }

      if (!entityData || !entityData[entity.idColumn]) {
        return res.status(400).json({
          error: "Stored entity data is invalid",
        });
      }

      restoreEntity(trashItem, entity, entityData, req.user?.id || null, res);
    },
  );
};

function restoreEntity(trashItem, entity, data, restoredBy, res) {
  const columns = Object.keys(data);

  if (columns.length === 0) {
    return res.status(400).json({
      error: "Nothing to restore",
    });
  }

  const placeholders = columns.map(() => "?").join(", ");
  const columnNames = columns.map((column) => `\`${column}\``).join(", ");
  const values = columns.map((column) => data[column]);

  const sql = `
        INSERT INTO \`${entity.table}\`
        (${columnNames})
        VALUES (${placeholders})
    `;

  db.query(sql, values, (err) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          error: "The original record already exists",
        });
      }

      console.error("Error restoring entity:", err);

      return res.status(500).json({
        error: "Could not restore item",
      });
    }

    db.query(
      `UPDATE trash
             SET
                status = 'restored',
                restored_at = CURRENT_TIMESTAMP,
                restored_by = ?
             WHERE id = ?`,
      [restoredBy, trashItem.id],
      (updateErr) => {
        if (updateErr) {
          console.error("Error updating restored trash item:", updateErr);

          return res.status(500).json({
            error: "Item restored but trash record could not be updated",
          });
        }

        res.json({
          message: "Item restored successfully",
          entity_type: trashItem.entity_type,
          entity_id: data[entity.idColumn],
        });
      },
    );
  });
}

// Permanently delete a trash item
exports.permanentlyDelete = (req, res) => {
  const trashId = req.params.id;

  db.query("SELECT * FROM trash WHERE id = ?", [trashId], (err, results) => {
    if (err) {
      console.error("Error fetching trash item:", err);
      return res.status(500).json({
        error: "Database error",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        error: "Trash item not found",
      });
    }

    db.query(
      "DELETE FROM trash WHERE id = ?",
      [trashId],
      (deleteErr, result) => {
        if (deleteErr) {
          console.error("Error permanently deleting trash item:", deleteErr);

          return res.status(500).json({
            error: "Database error",
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: "Trash item not found",
          });
        }

        res.json({
          message: "Item permanently deleted",
        });
      },
    );
  });
};
