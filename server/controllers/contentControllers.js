const db = require("../config/db");

const VALID_TYPES = ["text", "number", "boolean", "json"];

function detectType(value, requestedType) {
  if (requestedType === "json") return "json";
  if (requestedType === "number") return "number";
  if (requestedType === "boolean") return "boolean";

  if (value !== null && typeof value === "object") {
    return "json";
  }

  return "text";
}

function parseValue(value, type) {
  if (type === "number") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }

  if (type === "boolean") {
    return value === true || value === "true" || value === 1 || value === "1";
  }

  if (type === "json") {
    if (typeof value === "string") {
      return JSON.parse(value);
    }

    return value;
  }

  return value == null ? "" : String(value);
}

function serializeValue(value, type) {
  if (type === "json") {
    return JSON.stringify(value ?? null);
  }

  if (type === "boolean") {
    return value ? "true" : "false";
  }

  if (type === "number") {
    return String(value ?? "");
  }

  return value == null ? "" : String(value);
}

exports.getContent = (req, res) => {
  db.query(
    "SELECT id, page, section, content_key, content_value, content_type, created_at, updated_at FROM content ORDER BY page, section, content_key",
    (err, rows) => {
      if (err) {
        console.error("Error fetching content:", err);
        return res.status(500).json({ error: "Database error" });
      }

      const content = {};

      rows.forEach((row) => {
        if (!content[row.page]) {
          content[row.page] = {};
        }

        if (!content[row.page][row.section]) {
          content[row.page][row.section] = {};
        }

        try {
          content[row.page][row.section][row.content_key] = parseValue(
            row.content_value,
            row.content_type,
          );
        } catch (error) {
          console.error(
            `Error parsing content ${row.page}.${row.section}.${row.content_key}:`,
            error,
          );

          content[row.page][row.section][row.content_key] = row.content_value;
        }
      });

      res.json({
        content,
        records: rows,
      });
    },
  );
};

exports.getPageContent = (req, res) => {
  const { page } = req.params;

  db.query(
    "SELECT id, page, section, content_key, content_value, content_type, created_at, updated_at FROM content WHERE page = ? ORDER BY section, content_key",
    [page],
    (err, rows) => {
      if (err) {
        console.error("Error fetching page content:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json(
        rows.map((row) => ({
          ...row,
          value: (() => {
            try {
              return parseValue(row.content_value, row.content_type);
            } catch {
              return row.content_value;
            }
          })(),
        })),
      );
    },
  );
};

exports.upsertContent = (req, res) => {
  const { page, section, key, value, type: requestedType } = req.body;

  if (!page || !section || !key) {
    return res.status(400).json({
      error: "page, section, and key are required",
    });
  }

  if (requestedType !== undefined && !VALID_TYPES.includes(requestedType)) {
    return res.status(400).json({
      error: "type must be text, number, boolean, or json",
    });
  }

  const type = detectType(value, requestedType);

  let serialized;

  try {
    serialized = serializeValue(value, type);

    if (type === "json") {
      JSON.parse(serialized);
    }
  } catch (error) {
    console.error("Error serializing content:", error);

    return res.status(400).json({
      error: "Invalid value for the selected content type",
    });
  }

  const sql = `
        INSERT INTO content (
            page,
            section,
            content_key,
            content_value,
            content_type
        )
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            content_value = VALUES(content_value),
            content_type = VALUES(content_type),
            updated_at = CURRENT_TIMESTAMP
    `;

  db.query(sql, [page, section, key, serialized, type], (err, result) => {
    if (err) {
      console.error("Error saving content:", err);
      return res.status(500).json({
        error: "Database error",
      });
    }

    res.json({
      message: "Content saved",
      id: result.insertId || null,
      page,
      section,
      key,
      type,
    });
  });
};

exports.deleteContent = (req, res) => {
  db.query(
    "DELETE FROM content WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) {
        console.error("Error deleting content:", err);
        return res.status(500).json({
          error: "Database error",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: "Content not found",
        });
      }

      res.json({
        message: "Content deleted",
      });
    },
  );
};
