const express = require("express");
const { body, param } = require("express-validator");
const {
  getProjects,
  createProject,
  getProjectById,
  addMember,
  removeMember,
  deleteProject,
} = require("../controllers/projectController");
const { authMiddleware } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { validate } = require("../utils/validate");

const router = express.Router();

// All project routes require authentication
router.use(authMiddleware);

router.get("/", getProjects);

router.post(
  "/",
  requireRole("admin"),
  [
    body("name").trim().isLength({ min: 2 }).withMessage("Project name must be at least 2 characters"),
    body("description").optional().trim(),
  ],
  validate,
  createProject
);

router.get("/:id", getProjectById);

router.post(
  "/:id/members",
  requireRole("admin"),
  [body("username").trim().notEmpty().withMessage("Username is required")],
  validate,
  addMember
);

router.delete("/:id/members/:userId", requireRole("admin"), removeMember);

router.delete("/:id", requireRole("admin"), deleteProject);

module.exports = router;
