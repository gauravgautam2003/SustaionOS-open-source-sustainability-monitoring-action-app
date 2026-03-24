const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true // allow cookies / credentialed requests and Authorization header
}));

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    server: "up",
    dbReady: Boolean(global.dbReady),
    mongoState: mongoose.connection.readyState,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res, next) => {
  if (req.path === "/api/health") return next();

  if (req.path.startsWith("/api/") && !global.dbReady) {
    return res.status(503).json({
      success: false,
      msg: "Database unavailable",
      dbReady: false,
    });
  }

  next();
});

app.use("/api/data", require("./routes/data.routes"));
app.use("/api/alerts", require("./routes/alert.routes"));
app.use("/api/predict", require("./routes/prediction.routes"));
app.use("/api/cost", require("./routes/cost.routes"));
app.use("/api/carbon", require("./routes/carbon.routes"));
app.use("/api/score", require("./routes/score.routes"));
app.use("/api/report", require("./routes/report.routes"));
app.use("/api/ai", require("./routes/ai.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/settings", require("./routes/settings.routes"));
app.use("/api/user", require("./routes/user.routes"));
app.use("/api/analytics", require("./routes/analytics.routes"));

app.use(require("./middleware/error.middleware"));

module.exports = app;
