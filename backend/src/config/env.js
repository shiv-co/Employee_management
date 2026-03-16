const path = require('path');
const dotenv = require('dotenv');

const envCandidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env')
];

envCandidates.forEach((envPath) => {
  dotenv.config({ path: envPath, override: false });
});

const mongodbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

const requiredVars = [
  ['MONGODB_URI or MONGO_URI', mongodbUri],
  ['JWT_ACCESS_SECRET or JWT_SECRET', jwtAccessSecret],
  ['JWT_REFRESH_SECRET', jwtRefreshSecret]
];

requiredVars.forEach(([name, value]) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
});

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongodbUri,
  jwtAccessSecret,
  jwtRefreshSecret,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
};
