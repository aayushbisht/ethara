const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

// Helper: verify user is a member of the project
async function assertProjectMember(db, projectId, userId) {
  const project = await db
    .collection("projects")
    .findOne({ _id: new ObjectId(projectId) });
  if (!project) return null;
  const isMember = project.members.some((m) => m.userId === userId);
  return isMember ? project : null;
}

// Create a task (admin only)
async function createTask(req, res) {
  try {
    const { id: projectId } = req.params;
    const { title, description, assignedTo, priority, dueDate } = req.body;
    const db = getDB();

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await assertProjectMember(db, projectId, req.user._id.toString());
    if (!project) return res.status(404).json({ message: "Project not found or access denied" });

    // assignedTo must be a member of the project
    if (assignedTo) {
      const isAssigneeMember = project.members.some((m) => m.userId === assignedTo);
      if (!isAssigneeMember) {
        return res.status(400).json({ message: "Assigned user is not a project member" });
      }
    }

    const task = {
      title,
      description: description || "",
      projectId,
      assignedTo: assignedTo || null,
      status: "todo",
      priority: ["low", "medium", "high"].includes(priority) ? priority : "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.user._id.toString(),
      createdAt: new Date(),
    };

    const result = await db.collection("tasks").insertOne(task);
    res.status(201).json({ ...task, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// Get all tasks for a project
async function getTasksByProject(req, res) {
  try {
    const { id: projectId } = req.params;
    const db = getDB();

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await assertProjectMember(db, projectId, req.user._id.toString());
    if (!project) return res.status(404).json({ message: "Project not found or access denied" });

    const tasks = await db
      .collection("tasks")
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();

    // Attach assignee usernames
    const userIds = [...new Set(tasks.map((t) => t.assignedTo).filter(Boolean))];
    let userMap = {};
    if (userIds.length) {
      const users = await db
        .collection("users")
        .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } }, { projection: { password: 0 } })
        .toArray();
      users.forEach((u) => { userMap[u._id.toString()] = u.username; });
    }

    const result = tasks.map((t) => ({
      ...t,
      assignedToUsername: t.assignedTo ? userMap[t.assignedTo] || null : null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// Update task status — member can update only their own; admin can update any
async function updateTaskStatus(req, res) {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const db = getDB();

    const validStatuses = ["todo", "in-progress", "done"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    if (!ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await db.collection("tasks").findOne({ _id: new ObjectId(taskId) });
    if (!task) return res.status(404).json({ message: "Task not found" });

    const userId = req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    const isAssignee = task.assignedTo === userId;

    if (!isAdmin && !isAssignee) {
      return res.status(403).json({ message: "You can only update status of tasks assigned to you" });
    }

    await db.collection("tasks").updateOne(
      { _id: new ObjectId(taskId) },
      { $set: { status } }
    );

    res.json({ message: "Status updated", status });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// Edit task details (admin only)
async function updateTask(req, res) {
  try {
    const { taskId } = req.params;
    const { title, description, assignedTo, priority, dueDate, status } = req.body;
    const db = getDB();

    if (!ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await db.collection("tasks").findOne({ _id: new ObjectId(taskId) });
    if (!task) return res.status(404).json({ message: "Task not found" });

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) updates.status = status;
    updates.updatedAt = new Date();

    await db.collection("tasks").updateOne(
      { _id: new ObjectId(taskId) },
      { $set: updates }
    );

    const updated = await db.collection("tasks").findOne({ _id: new ObjectId(taskId) });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// Delete a task (admin only)
async function deleteTask(req, res) {
  try {
    const { taskId } = req.params;
    const db = getDB();

    if (!ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await db.collection("tasks").findOne({ _id: new ObjectId(taskId) });
    if (!task) return res.status(404).json({ message: "Task not found" });

    await db.collection("tasks").deleteOne({ _id: new ObjectId(taskId) });
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// Dashboard stats for current user
async function getDashboardStats(req, res) {
  try {
    const db = getDB();
    const userId = req.user._id.toString();
    const now = new Date();

    // Projects user belongs to
    const projects = await db
      .collection("projects")
      .find({ "members.userId": userId })
      .toArray();

    const projectIds = projects.map((p) => p._id.toString());

    const tasks = await db
      .collection("tasks")
      .find({ projectId: { $in: projectIds } })
      .toArray();

    const myTasks = tasks.filter((t) => t.assignedTo === userId);

    const stats = {
      totalProjects: projects.length,
      totalTasks: tasks.length,
      myTasks: myTasks.length,
      byStatus: {
        todo: tasks.filter((t) => t.status === "todo").length,
        inProgress: tasks.filter((t) => t.status === "in-progress").length,
        done: tasks.filter((t) => t.status === "done").length,
      },
      overdue: tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done"
      ).length,
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

module.exports = {
  createTask,
  getTasksByProject,
  updateTaskStatus,
  updateTask,
  deleteTask,
  getDashboardStats,
};
