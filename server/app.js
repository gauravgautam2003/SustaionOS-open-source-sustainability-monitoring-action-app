const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
 origin: "http://localhost:5173"
}));

app.use(express.json());

app.use("/api/data", require("./routes/data.routes"));
app.use("/api/alerts", require("./routes/alert.routes"));
app.use("/api/analytics", require("./routes/analytics.routes"));
app.use("/api/predict", require("./routes/prediction.routes"));
app.use("/api/cost", require("./routes/cost.routes"));
app.use("/api/carbon", require("./routes/carbon.routes"));
app.use("/api/score", require("./routes/score.routes"));
app.use("/api/report", require("./routes/report.routes"));
app.use("/api/ai", require("./routes/ai.routes"));
app.use("/api/auth", require("./routes/auth.routes"));

app.use(require("./middleware/error.middleware"));

module.exports = app;