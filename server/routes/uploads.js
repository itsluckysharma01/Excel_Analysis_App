const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Upload = require("../models/Upload");

// Create/upload metadata (no file content stored)
router.post("/", auth, async (req, res) => {
  try {
    const { fileName, uploadDate, rowCount, columns } = req.body;
    const upload = new Upload({
      user: req.user._id,
      fileName,
      uploadDate,
      rowCount,
      columns,
    });
    await upload.save();
    res.json({ upload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add analysis to an upload
router.post("/:id/analysis", auth, async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);
    if (!upload) return res.status(404).json({ message: "Upload not found" });
    if (
      String(upload.user) !== String(req.user._id) &&
      req.user.role !== "admin"
    )
      return res.status(403).json({ message: "Forbidden" });
    upload.analyses.push({ user: req.user._id, ...req.body });
    await upload.save();
    res.json({ upload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get uploads for current user (or all for admin)
router.get("/", auth, async (req, res) => {
  try {
    let uploads;
    if (req.user.role === "admin")
      uploads = await Upload.find().populate("user", "name email");
    else uploads = await Upload.find({ user: req.user._id });
    res.json({ uploads });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
