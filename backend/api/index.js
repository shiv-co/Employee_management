const app = require("../src/app");
const connectDB = require("../src/config/db");

let connectionPromise;

async function ensureDatabaseConnection() {
  try {
    if (!connectionPromise) {
      connectionPromise = connectDB();
    }

    await connectionPromise;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

module.exports = async (req, res) => {
  try {
    // CORS headers
    res.setHeader(
      "Access-Control-Allow-Origin",
      "https://employee-management-9azq.vercel.app"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    // Ensure DB connection before processing request
    await ensureDatabaseConnection();

    // Pass request to Express app
    return app(req, res);
  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};