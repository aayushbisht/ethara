const bcrypt = require("bcryptjs");
const { getDB } = require("../config/db");
const { signToken } = require("../utils/jwt");

// Register a new user
async function register(req, res) {
  try {
    const { name, email, username, password, role } = req.body;
    const db = getDB();

    // Check for existing username or email
    const existing = await db.collection("users").findOne({
      $or: [{ username }, { email: email.toLowerCase() }],
    });
    if (existing) {
      const field = existing.username === username ? "Username" : "Email";
      return res.status(409).json({ message: `${field} already taken` });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
      name,
      email: email.toLowerCase(),
      username,
      password: hashed,
      role: role === "admin" ? "admin" : "member",
      createdAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);

    const token = signToken({ userId: result.insertedId.toString() });

    res.status(201).json({
      token,
      user: {
        _id: result.insertedId,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// Login existing user
async function login(req, res) {
  try {
    const { username, password } = req.body;
    const db = getDB();

    const user = await db.collection("users").findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ userId: user._id.toString() });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// Get current logged-in user
async function getMe(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, getMe };
