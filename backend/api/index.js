const app = require("../src/app");
const connectDB = require("../src/config/db");

let dbConnected = false;

module.exports = async (req, res) => {
  try {
    // CORS
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

    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    // Ensure DB connection
    if (!dbConnected) {
      await connectDB();
      dbConnected = true;
    }

    return app(req, res);
  } catch (error) {
    console.error("Serverless error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};