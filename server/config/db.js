const mongoose = require("mongoose");
const { MONGO_URI } = require("./env");

function connectWithTimeout(promise, timeoutMs) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`MongoDB connection timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
}

module.exports = async function connectDB() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is missing from environment variables");
  }

  mongoose.set("strictQuery", true);

  try {
    await connectWithTimeout(
      mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      }),
      12000
    );

    console.log("MongoDB Connected");
  } catch (err) {
    console.error("DB Error:", err.message);
    throw err;
  }
};
