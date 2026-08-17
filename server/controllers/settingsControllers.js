const db = require("../config/db");

const SETTING_TYPES = ["text", "number", "boolean", "json"];

// Get all settings
exports.getSettings = (req, res) => {
  db.query(
    "SELECT * FROM settings ORDER BY setting_key ASC",
    (err, results) => {
      if (err) {
        console.error("Error fetching settings:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json(results);
    },
  );
};

// Get one setting by key
exports.getSetting = (req, res) => {
  const { key } = req.params;

  db.query(
    "SELECT * FROM settings WHERE setting_key = ?",
    [key],
    (err, results) => {
      if (err) {
        console.error("Error fetching setting:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({
          error: "Setting not found",
        });
      }

      res.json(results[0]);
    },
  );
};

// Create a setting
exports.createSetting = (req, res) => {
  const { setting_key, setting_value, setting_type, description } = req.body;

  if (!setting_key || !setting_key.trim()) {
    return res.status(400).json({
      error: "setting_key is required",
    });
  }

  const type = setting_type || "text";

  if (!SETTING_TYPES.includes(type)) {
    return res.status(400).json({
      error: `setting_type must be one of: ${SETTING_TYPES.join(", ")}`,
    });
  }

  if (
    type === "json" &&
    setting_value !== null &&
    setting_value !== undefined
  ) {
    try {
      if (typeof setting_value === "string") {
        JSON.parse(setting_value);
      }
    } catch {
      return res.status(400).json({
        error: "setting_value must contain valid JSON",
      });
    }
  }

  const sql = `
        INSERT INTO settings
        (
            setting_key,
            setting_value,
            setting_type,
            description,
            updated_by
        )
        VALUES (?, ?, ?, ?, ?)
    `;

  db.query(
    sql,
    [
      setting_key.trim(),
      setting_value !== undefined ? String(setting_value) : null,
      type,
      description || null,
      req.user?.id || null,
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            error: "A setting with that key already exists",
          });
        }

        console.error("Error creating setting:", err);
        return res.status(500).json({
          error: "Database error",
        });
      }

      db.query(
        "SELECT * FROM settings WHERE id = ?",
        [result.insertId],
        (err2, rows) => {
          if (err2 || rows.length === 0) {
            return res.status(201).json({
              message: "Setting created",
              id: result.insertId,
            });
          }

          res.status(201).json(rows[0]);
        },
      );
    },
  );
};

// Update a setting
exports.updateSetting = (req, res) => {
  const { key } = req.params;

  const { setting_value, setting_type, description } = req.body;

  if (!SETTING_TYPES.includes(setting_type)) {
    return res.status(400).json({
      error: `setting_type must be one of: ${SETTING_TYPES.join(", ")}`,
    });
  }

  if (
    setting_type === "json" &&
    setting_value !== null &&
    setting_value !== undefined
  ) {
    try {
      if (typeof setting_value === "string") {
        JSON.parse(setting_value);
      }
    } catch {
      return res.status(400).json({
        error: "setting_value must contain valid JSON",
      });
    }
  }

  const sql = `
        UPDATE settings
        SET
            setting_value = ?,
            setting_type = ?,
            description = ?,
            updated_by = ?
        WHERE setting_key = ?
    `;

  db.query(
    sql,
    [
      setting_value !== undefined ? String(setting_value) : null,
      setting_type,
      description || null,
      req.user?.id || null,
      key,
    ],
    (err, result) => {
      if (err) {
        console.error("Error updating setting:", err);
        return res.status(500).json({
          error: "Database error",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: "Setting not found",
        });
      }

      db.query(
        "SELECT * FROM settings WHERE setting_key = ?",
        [key],
        (err2, rows) => {
          if (err2 || rows.length === 0) {
            return res.json({
              message: "Setting updated",
            });
          }

          res.json(rows[0]);
        },
      );
    },
  );
};

// Delete a setting
exports.deleteSetting = (req, res) => {
  const { key } = req.params;

  db.query(
    "SELECT * FROM settings WHERE setting_key = ?",
    [key],
    (err, results) => {
      if (err) {
        console.error("Error fetching setting for deletion:", err);
        return res.status(500).json({
          error: "Database error",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          error: "Setting not found",
        });
      }

      const setting = results[0];

      db.query(
        `INSERT INTO trash
                (
                    entity_type,
                    entity_id,
                    entity_data,
                    deleted_by
                )
                VALUES (?, ?, ?, ?)`,
        ["setting", setting.id, JSON.stringify(setting), req.user?.id || null],
        (trashErr) => {
          if (trashErr) {
            console.error("Error moving setting to trash:", trashErr);
            return res.status(500).json({
              error: "Could not move setting to trash",
            });
          }

          db.query(
            "DELETE FROM settings WHERE setting_key = ?",
            [key],
            (deleteErr, result) => {
              if (deleteErr) {
                console.error("Error deleting setting:", deleteErr);
                return res.status(500).json({
                  error: "Database error",
                });
              }

              if (result.affectedRows === 0) {
                return res.status(404).json({
                  error: "Setting not found",
                });
              }

              res.json({
                message: "Setting moved to trash",
              });
            },
          );
        },
      );
    },
  );
};
