const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const allowedRoles = require("../middleware/allowedRoles");

const {
  getAuditLogs,
  getAuditLog,
  createAuditLog,
  deleteAuditLog,
} = require("../controllers/auditControllers");

// Audit logs are admin-only.
router.get("/", authMiddleware, allowedRoles(["admin"]), getAuditLogs);

router.get("/:id", authMiddleware, allowedRoles(["admin"]), getAuditLog);

router.post("/", authMiddleware, allowedRoles(["admin"]), createAuditLog);

router.delete("/:id", authMiddleware, allowedRoles(["admin"]), deleteAuditLog);

module.exports = router;
