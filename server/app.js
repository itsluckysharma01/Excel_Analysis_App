const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/auth");
const uploadsRoutes = require("./routes/uploads");
const adminRoutes = require("./routes/admin");

const app = express();
app.use(cors());
app.use(express.json());

const MONGO =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/excel_analytics";
mongoose
  .connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => res.send("Excel Analytics Backend is running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
