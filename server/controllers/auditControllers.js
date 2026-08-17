const db = require("../config/db");

// Get audit logs
exports.getAuditLogs = (req, res) => {
  const { action, entity_type, user_id, limit = 100, offset = 0 } = req.query;

  let sql = `
        SELECT
            a.*,
            u.fullname AS user_name,
            u.email AS user_email
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE 1 = 1
    `;

  const params = [];

  if (action) {
    sql += " AND a.action = ?";
    params.push(action);
  }

  if (entity_type) {
    sql += " AND a.entity_type = ?";
    params.push(entity_type);
  }

  if (user_id) {
    sql += " AND a.user_id = ?";
    params.push(user_id);
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

  sql += " ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
  params.push(parsedLimit, parsedOffset);

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching audit logs:", err);
      return res.status(500).json({
        error: "Database error",
      });
    }

    res.json(results);
  });
};

// Get one audit log
exports.getAuditLog = (req, res) => {
  db.query(
    `SELECT
            a.*,
            u.fullname AS user_name,
            u.email AS user_email
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.id = ?`,
    [req.params.id],
    (err, results) => {
      if (err) {
        console.error("Error fetching audit log:", err);
        return res.status(500).json({
          error: "Database error",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          error: "Audit log not found",
        });
      }

      res.json(results[0]);
    },
  );
};

// Create an audit log
exports.createAuditLog = (req, res) => {
  const { action, entity_type, entity_id, description } = req.body;

  if (!action || !action.trim()) {
    return res.status(400).json({
      error: "action is required",
    });
  }

  if (!description || !description.trim()) {
    return res.status(400).json({
      error: "description is required",
    });
  }

  const ipAddress =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    null;

  db.query(
    `INSERT INTO audit_logs
        (
            user_id,
            action,
            entity_type,
            entity_id,
            description,
            ip_address
        )
        VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.user?.id || null,
      action.trim(),
      entity_type || null,
      entity_id || null,
      description.trim(),
      ipAddress,
    ],
    (err, result) => {
      if (err) {
        console.error("Error creating audit log:", err);
        return res.status(500).json({
          error: "Database error",
        });
      }

      res.status(201).json({
        message: "Audit log created",
        id: result.insertId,
      });
    },
  );
};

// Delete an audit log
// Restricted because audit history should not casually disappear.
exports.deleteAuditLog = (req, res) => {
  db.query(
    "DELETE FROM audit_logs WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) {
        console.error("Error deleting audit log:", err);
        return res.status(500).json({
          error: "Database error",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: "Audit log not found",
        });
      }

      res.json({
        message: "Audit log deleted",
      });
    },
  );
};
