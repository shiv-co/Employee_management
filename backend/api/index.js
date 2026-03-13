const app = require('../src/app');
const connectDB = require('../src/config/db');

let connectionPromise;

const ensureDatabaseConnection = async () => {
  if (!connectionPromise) {
    connectionPromise = connectDB().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  await connectionPromise;
};

module.exports = async (req, res) => {
  await ensureDatabaseConnection();
  return app(req, res);
};
