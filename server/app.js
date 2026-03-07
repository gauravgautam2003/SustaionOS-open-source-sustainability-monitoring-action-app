const express=require("express");
const app=express();

app.use(express.json());

app.use("/api/data",require("./routes/data.routes"));
app.use("/api/alerts",require("./routes/alert.routes"));
app.use("/api/analytics",require("./routes/analytics.routes"));

app.use(require("./middleware/error.middleware"));

module.exports=app;