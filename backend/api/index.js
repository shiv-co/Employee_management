const app = require("../src/app");
const connectDB = require("../src/config/db");

let connectionPromise;

async function ensureDatabaseConnection() {
  if (!connectionPromise) {
    connectionPromise = connectDB();
  }
  await connectionPromise;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  await ensureDatabaseConnection();
  return app(req, res);
};