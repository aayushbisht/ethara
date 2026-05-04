const express = require("express");
const { getDB } = require("../config/db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

// Search users by username (for adding members / assigning tasks)
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ message: "Query must be at least 2 characters" });
    }

    const db = getDB();
    const users = await db
      .collection("users")
      .find(
        { username: { $regex: q, $options: "i" } },
        { projection: { password: 0 } }
      )
      .limit(10)
      .toArray();

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
