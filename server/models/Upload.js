const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  xAxis: String,
  yAxis: String,
  chartType: String,
  dataPoints: Number,
  timestamp: { type: Date, default: Date.now },
});

const uploadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  fileName: String,
  uploadDate: Date,
  rowCount: Number,
  columns: [String],
  analyses: [analysisSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Upload", uploadSchema);
