const express = require("express");
const { body } = require("express-validator");
const {
  createTask,
  getTasksByProject,
  updateTaskStatus,
  updateTask,
  deleteTask,
  getDashboardStats,
} = require("../controllers/taskController");
const { authMiddleware } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { validate } = require("../utils/validate");

const router = express.Router();

router.use(authMiddleware);

// Dashboard stats
router.get("/dashboard", getDashboardStats);

// Create task for a project (admin only)
router.post(
  "/project/:id",
  requireRole("admin"),
  [
    body("title").trim().isLength({ min: 2 }).withMessage("Title must be at least 2 characters"),
    body("priority").optional().isIn(["low", "medium", "high"]).withMessage("Invalid priority"),
    body("status").optional().isIn(["todo", "in-progress", "done"]).withMessage("Invalid status"),
  ],
  validate,
  createTask
);

// Get tasks for a project
router.get("/project/:id", getTasksByProject);

// Update task status
router.patch(
  "/:taskId/status",
  [body("status").isIn(["todo", "in-progress", "done"]).withMessage("Invalid status")],
  validate,
  updateTaskStatus
);

// Edit full task (admin only)
router.patch("/:taskId", requireRole("admin"), updateTask);

// Delete task (admin only)
router.delete("/:taskId", requireRole("admin"), deleteTask);

module.exports = router;
