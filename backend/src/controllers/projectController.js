const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

// Get all projects where current user is a member or owner
async function getProjects(req, res) {
  try {
    const db = getDB();
    const userId = req.user._id.toString();

    const projects = await db
      .collection("projects")
      .find({ "members.userId": userId })
      .toArray();

    // Get task counts per project
    const projectIds = projects.map((p) => p._id.toString());
    const tasks = await db
      .collection("tasks")
      .find({ projectId: { $in: projectIds } })
      .toArray();

    const taskCountMap = {};
    tasks.forEach((t) => {
      taskCountMap[t.projectId] = (taskCountMap[t.projectId] || 0) + 1;
    });

    const result = projects.map((p) => ({
      ...p,
      taskCount: taskCountMap[p._id.toString()] || 0,
      memberCount: p.members.length,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// Create a new project (admin only)
async function createProject(req, res) {
  try {
    const { name, description } = req.body;
    const db = getDB();
    const userId = req.user._id.toString();

    const project = {
      name,
      description: description || "",
      createdBy: userId,
      // creator is auto-added as first member
      members: [{ userId, role: "admin" }],
      createdAt: new Date(),
    };

    const result = await db.collection("projects").insertOne(project);
    res.status(201).json({ ...project, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// Get a single project with full member details
async function getProjectById(req, res) {
  try {
    const { id } = req.params;
    const db = getDB();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    if (!project) return res.status(404).json({ message: "Project not found" });

    // Check user is a member
    const isMember = project.members.some(
      (m) => m.userId === req.user._id.toString()
    );
    if (!isMember) return res.status(403).json({ message: "Access denied" });

    // Fetch member user details
    const memberIds = project.members.map((m) => new ObjectId(m.userId));
    const users = await db
      .collection("users")
      .find({ _id: { $in: memberIds } }, { projection: { password: 0 } })
      .toArray();

    const membersWithDetails = project.members.map((m) => {
      const user = users.find((u) => u._id.toString() === m.userId);
      return { ...m, username: user?.username, role: user?.role };
    });

    res.json({ ...project, members: membersWithDetails });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// Add a member to a project by username (admin only)
async function addMember(req, res) {
  try {
    const { id } = req.params;
    const { username } = req.body;
    const db = getDB();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    if (!project) return res.status(404).json({ message: "Project not found" });

    const targetUser = await db.collection("users").findOne({ username });
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const alreadyMember = project.members.some(
      (m) => m.userId === targetUser._id.toString()
    );
    if (alreadyMember) {
      return res.status(409).json({ message: "User is already a member" });
    }

    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      { $push: { members: { userId: targetUser._id.toString(), role: "member" } } }
    );

    res.json({ message: "Member added", userId: targetUser._id, username });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// Remove a member from a project (admin only)
async function removeMember(req, res) {
  try {
    const { id, userId } = req.params;
    const db = getDB();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    if (!project) return res.status(404).json({ message: "Project not found" });

    // Prevent removing the project creator
    if (project.createdBy === userId) {
      return res.status(400).json({ message: "Cannot remove the project creator" });
    }

    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      { $pull: { members: { userId } } }
    );

    res.json({ message: "Member removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// Delete a project and its tasks (admin only)
async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const db = getDB();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    if (!project) return res.status(404).json({ message: "Project not found" });

    // Only the creator can delete the project
    if (project.createdBy !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the project creator can delete it" });
    }

    await db.collection("projects").deleteOne({ _id: new ObjectId(id) });
    // Remove all tasks belonging to this project
    await db.collection("tasks").deleteMany({ projectId: id });

    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

module.exports = {
  getProjects,
  createProject,
  getProjectById,
  addMember,
  removeMember,
  deleteProject,
};
