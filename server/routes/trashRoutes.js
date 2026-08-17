const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const allowedRoles = require("../middleware/allowedRoles");

const {
  getTrash,
  getTrashItem,
  restoreTrashItem,
  permanentlyDelete,
} = require("../controllers/trashControllers");

router.get("/", authMiddleware, allowedRoles(["admin"]), getTrash);

router.get("/:id", authMiddleware, allowedRoles(["admin"]), getTrashItem);

router.patch(
  "/:id/restore",
  authMiddleware,
  allowedRoles(["admin"]),
  restoreTrashItem,
);

router.delete(
  "/:id",
  authMiddleware,
  allowedRoles(["admin"]),
  permanentlyDelete,
);

module.exports = router;
