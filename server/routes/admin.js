const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// Helper: require admin
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "No user" });
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Admin required" });
  next();
}

// List users (admin)
router.get("/users", auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-passwordHash");
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Promote user to admin
router.post("/users/:id/promote", auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.role = "admin";
    await user.save();
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
