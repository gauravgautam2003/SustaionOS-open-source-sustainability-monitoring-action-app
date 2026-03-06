require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

/* ---------------- MIDDLEWARE ---------------- */

app.use(cors());
app.use(express.json());

/* ---------------- DATABASE CONNECTION ---------------- */

mongoose.connect(process.env.MONGO_URI, {
 
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => {
 console.error("❌ DB Connection Error:", err.message);
 process.exit(1);
});

/* ---------------- ROUTES ---------------- */

app.get("/", (req, res) => {
 res.send("🚀 SustainOS API Running");
});

app.use("/api/data", require("./routes/dataRoute"));

/* ---------------- 404 HANDLER ---------------- */

app.use((req, res) => {
 res.status(404).json({
  success: false,
  message: "Route not found"
 });
});

/* ---------------- GLOBAL ERROR HANDLER ---------------- */

app.use((err, req, res, next) => {
 console.error("🔥 Server Error:", err.stack);
 res.status(500).json({
  success: false,
  message: "Internal Server Error"
 });
});

/* ---------------- SERVER START ---------------- */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
 console.log(`🚀 Server running on port ${PORT}`)
);