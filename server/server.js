require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const app = require("./app");
const connectDB = require("./config/db");
const { PORT } = require("./config/env");

const http = require("http");
const { Server } = require("socket.io");

async function startServer() {
  global.dbReady = false;

  try {
    await connectDB();
    global.dbReady = true;
  } catch (err) {
    console.error("Database unavailable, starting in degraded mode.");
  }

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: "*" },
  });

  global.io = io;

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
  });

  server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
