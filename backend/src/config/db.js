const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGO_URI);

let db;

// Connect and cache the db instance
async function connectDB() {
  if (db) return db;
  await client.connect();
  db = client.db();
  console.log("MongoDB connected");
  return db;
}

function getDB() {
  if (!db) throw new Error("DB not initialized. Call connectDB first.");
  return db;
}

module.exports = { connectDB, getDB };
