const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const allowedRoles = require("../middleware/allowedRoles");

const {
  getSettings,
  getSetting,
  createSetting,
  updateSetting,
  deleteSetting,
} = require("../controllers/settingsControllers");

// Settings are admin-only
router.get("/", authMiddleware, allowedRoles(["admin"]), getSettings);

router.get("/:key", authMiddleware, allowedRoles(["admin"]), getSetting);

router.post("/", authMiddleware, allowedRoles(["admin"]), createSetting);

router.put("/:key", authMiddleware, allowedRoles(["admin"]), updateSetting);

router.delete("/:key", authMiddleware, allowedRoles(["admin"]), deleteSetting);

module.exports = router;
