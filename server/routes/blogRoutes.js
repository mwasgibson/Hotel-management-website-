const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const allowedRoles = require("../middleware/allowedRoles");

const {
  getPublishedPosts,
  getPostBySlug,
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} = require("../controllers/blogControllers");

// Public
router.get("/", getPublishedPosts);
router.get("/slug/:slug", getPostBySlug);

// Admin
router.get("/admin", authMiddleware, allowedRoles(["admin"]), getAllPosts);

router.get("/admin/:id", authMiddleware, allowedRoles(["admin"]), getPost);

router.post("/", authMiddleware, allowedRoles(["admin"]), createPost);

router.put("/:id", authMiddleware, allowedRoles(["admin"]), updatePost);

router.delete("/:id", authMiddleware, allowedRoles(["admin"]), deletePost);

module.exports = router;
